import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runStream } from "@/llm";
import { createChatSseResponse } from "@/lib/chat-stream";
import type { LLMProvider } from "@/llm/types";
import { getRun } from "@/lib/db/runs";
import type { DecisionIntake, LLMProviderName } from "@/types/decision";
import { postureRequiresLeaning } from "@/types/decision";

export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FreeformChatRequest {
  run_id?: string;
  messages: ChatMessage[];
  newMessage: string;
  // Legacy fallback fields (used when run_id is absent)
  output?: Record<string, unknown>;
  intake?: DecisionIntake;
  /** Legacy: which provider to use when `run_id` is absent (e.g. session-only result). */
  llm_provider?: LLMProviderName;
}

function buildSystemPrompt(intake: DecisionIntake, output: Record<string, unknown>): string {
  const postureNote =
    postureRequiresLeaning(intake.posture) && intake.leaning_direction
      ? `\nLeaning toward: ${intake.leaning_direction}`
      : "";

  return `You are an expert decision analyst. The user has already received a structured analysis of their decision and wants to discuss it with you.

## Decision context
Situation: ${intake.situation}
Constraints: ${intake.constraints}${intake.knowns_assumptions ? `\nWhat they know/assume: ${intake.knowns_assumptions}` : ""}${intake.unknowns ? `\nWhat they don't know: ${intake.unknowns}` : ""}${postureNote}
Analysis posture: ${intake.posture.replace(/_/g, " ")}

## Your analysis
${JSON.stringify(output, null, 2)}

Answer questions about this analysis, help the user think through implications, challenge assumptions, or explore angles not covered above. Be direct and specific — reference the analysis content when relevant.`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as FreeformChatRequest;
    const { run_id, messages, newMessage, output: bodyOutput, intake: bodyIntake, llm_provider: bodyLlmProvider } =
      body;

    if (!newMessage?.trim()) {
      return NextResponse.json({ error: "newMessage is required" }, { status: 400 });
    }

    let output: Record<string, unknown>;
    let intake: DecisionIntake;

    let runForProvider: { llm_provider?: string } | null = null;

    if (run_id) {
      const run = await getRun(run_id);
      if (!run) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      runForProvider = run;
      if (!run.freeform_output) {
        return NextResponse.json({ error: "Run has no freeform output" }, { status: 400 });
      }
      output = run.freeform_output;
      intake = run.intake;
    } else {
      // Legacy: client sent full output + intake
      if (!bodyOutput || typeof bodyOutput !== "object") {
        return NextResponse.json({ error: "output is required" }, { status: 400 });
      }
      if (!bodyIntake?.situation) {
        return NextResponse.json({ error: "intake is required" }, { status: 400 });
      }
      output = bodyOutput;
      intake = bodyIntake;
    }

    const systemPrompt = buildSystemPrompt(intake, output);

    const history = (messages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const rawProvider = runForProvider?.llm_provider ?? bodyLlmProvider ?? "anthropic";
    const provider: LLMProvider = ["openai", "anthropic", "gemini", "xai"].includes(rawProvider)
      ? (rawProvider as LLMProvider)
      : "anthropic";

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: newMessage.trim() },
    ];

    return createChatSseResponse(async (emit) => {
      const response = await runStream(
        provider,
        chatMessages,
        { temperature: 0.7, maxTokens: 2048 },
        (text) => emit({ type: "delta", text })
      );
      const content = (response.content ?? "").trim() || "I did not get a response—try again in a moment.";
      emit({ type: "done", content });
    });
  } catch (error) {
    console.error("[freeform/chat]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
