import { NextRequest, NextResponse } from "next/server";
import { getRun, getRunsByDecisionId, replaceRun } from "@/lib/db/runs";
import { canonicalRunsForUnifiedBriefDecision } from "@/lib/best-of-worlds-incomplete";
import { runHasAnalysisForUnifiedBrief } from "@/lib/unified-brief-eligibility";
import { buildBestOfWorldsSourceUserContent } from "@/lenses/brief";
import { getClient } from "@/llm";
import type { LLMMessage } from "@/llm/types";
import { runProviderLabel } from "@/lib/run-display-name";
import type { DecisionBrief, DecisionRunResult, LLMProviderName } from "@/types/decision";

export const maxDuration = 60;

/** Leave headroom for brief + instructions + chat history inside model context. */
const MAX_SOURCE_CHARS = 92_000;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function formatUnifiedBriefForPrompt(b: DecisionBrief): string {
  const lines: string[] = [];
  lines.push(`# ${b.title || "Unified Brief"}`);
  if (b.generated_at) lines.push(`Generated (ISO): ${b.generated_at}`);
  lines.push("\n## Summary\n" + truncate(b.summary ?? "", 6000));
  lines.push("\n## Recommendation\n" + truncate(b.recommendation ?? "", 2500));
  if (b.key_considerations?.length) {
    lines.push("\n## Key considerations\n" + b.key_considerations.map((k) => `- ${k}`).join("\n"));
  }
  if (b.next_steps?.length) {
    lines.push("\n## Next steps\n" + b.next_steps.map((n, i) => `${i + 1}. ${n}`).join("\n"));
  }
  if (b.custom_sections?.length) {
    lines.push("\n## Extra sections");
    for (const s of b.custom_sections) {
      if (!s.heading?.trim()) continue;
      lines.push(`\n### ${s.heading.trim()}`);
      lines.push(truncate(s.content ?? "", 4000));
    }
  }
  return lines.join("\n");
}

const UNIFIED_BRIEF_CHAT_PROVIDERS: LLMProviderName[] = ["anthropic", "openai", "gemini", "xai"];

function isUnifiedBriefChatProvider(s: string): s is LLMProviderName {
  return UNIFIED_BRIEF_CHAT_PROVIDERS.includes(s as LLMProviderName);
}

function priorMessagesForProvider(run: DecisionRunResult, provider: LLMProviderName) {
  const by = run.unified_brief_chat_by_provider?.[provider];
  if (by && by.length > 0) return by;
  if (provider === "anthropic" && run.unified_brief_chat_messages?.length) {
    return run.unified_brief_chat_messages;
  }
  return [];
}

async function buildUnifiedBriefChatSystemPrompt(
  storageRun: DecisionRunResult,
  brief: DecisionBrief,
  chatProvider: LLMProviderName
): Promise<string> {
  const allRuns = await getRunsByDecisionId(storageRun.decision_id);
  const canonical = canonicalRunsForUnifiedBriefDecision(allRuns);
  const eligible = canonical.filter(runHasAnalysisForUnifiedBrief);

  let source =
    eligible.length > 0
      ? buildBestOfWorldsSourceUserContent(storageRun, eligible)
      : "(No runs with analysis were found for this decision; raw merge inputs are unavailable.)";

  if (source.length > MAX_SOURCE_CHARS) {
    source =
      source.slice(0, MAX_SOURCE_CHARS - 220).replace(/\s+\S*$/, "") +
      "\n\n[…Source material truncated for chat context limits—earlier sections are preserved. Ask a narrower question (e.g. one provider run) if you need a specific quote.…]\n";
  }

  const briefBlock = formatUnifiedBriefForPrompt(brief);

  const sharedLayers = `You have two layers of context:

1. **Unified Brief** — the executive synthesis. This is the primary “what we recommend” view.
2. **Raw synthesis inputs** — the **same merged payload** used to generate that brief: intake/clarifications, each **Run: {Provider} · {Posture}** block (lenses, brief appendices, per-run research, integrated brief when present), merged research and variants, and any **cross-provider comparison** sections saved on runs. When the user asks what a specific provider contributed, **quote or paraphrase from the matching run block** (or comparison section) and name the provider · posture from the heading. If something only appears in raw inputs and not in the Unified Brief, say so explicitly.

Rules:
- Prefer the **raw run blocks** for provider-specific nuance; use the **Unified Brief** for the consolidated recommendation unless the question is about synthesis choices or omissions.
- If source material was truncated (note in the raw section), say so honestly.
- Do not browse the web or use tools. Markdown is fine.

## Unified Brief

${briefBlock}

---

## Raw inputs used to create the Unified Brief (same construction as synthesis)

${source}`;

  if (chatProvider === "anthropic") {
    return `You are Claude (Anthropic). The user is discussing their **Unified Brief** (first section below) that was produced by merging every eligible provider/posture run, research, and variants on this decision, then synthesized with Anthropic’s model as the Unified Brief author.

${sharedLayers}`;
  }

  const youAre =
    chatProvider === "openai"
      ? "You are ChatGPT (OpenAI)."
      : chatProvider === "xai"
        ? "You are Grok (xAI)."
        : "You are Gemini (Google).";

  return `${youAre} The user is discussing a **Unified Brief** shown below.

**Authorship (critical):** That Unified Brief text was **written / synthesized by Anthropic’s Claude**, not by you. This product merged every eligible provider/posture run, research, and variants, then had **Anthropic’s model** produce the structured Unified Brief. You are a **separate** assistant helping them discuss, critique, and clarify that artifact and the raw inputs. **Do not** claim you wrote the Unified Brief, chose its recommendations, or speak as if you were the synthesizer. If asked who authored the Unified Brief, say clearly that **Anthropic’s model** produced it and you are reviewing it.

${sharedLayers}`;
}

function providerConfigError(provider: LLMProviderName): { status: number; body: string } {
  const env =
    provider === "anthropic"
      ? "ANTHROPIC_API_KEY"
      : provider === "openai"
        ? "OPENAI_API_KEY"
        : provider === "xai"
          ? "XAI_API_KEY"
          : "GEMINI_API_KEY";
  const label = runProviderLabel(provider);
  return {
    status: 503,
    body: `${label} is not configured. Add ${env} to your .env to chat about the Unified Brief with this model.`,
  };
}

/**
 * POST /api/decision/run/unified-brief-chat
 * Body: { run_id, llm_provider?: LLMProviderName, messages?, newMessage }
 * Persists turns on unified_brief_chat_by_provider (and mirrors anthropic to unified_brief_chat_messages for legacy readers).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let activeChatProvider: LLMProviderName = "anthropic";
  try {
    const body = (await request.json()) as {
      run_id?: string;
      llm_provider?: string;
      messages?: { role: "user" | "assistant"; content: string }[];
      newMessage?: string;
    };

    const run_id = typeof body.run_id === "string" ? body.run_id.trim() : "";
    const rawProvider = typeof body.llm_provider === "string" ? body.llm_provider.trim().toLowerCase() : "";
    const llm_provider: LLMProviderName = isUnifiedBriefChatProvider(rawProvider) ? rawProvider : "anthropic";
    activeChatProvider = llm_provider;
    const newMessage = typeof body.newMessage === "string" ? body.newMessage.trim() : "";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!run_id) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }
    if (!newMessage) {
      return NextResponse.json({ error: "newMessage is required" }, { status: 400 });
    }
    if (newMessage.length > 12_000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const run = await getRun(run_id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const brief = run.decision_brief_best_of_worlds;
    if (!brief) {
      return NextResponse.json(
        { error: "Generate a Unified Brief on this page before starting chat." },
        { status: 400 }
      );
    }

    const systemContent = await buildUnifiedBriefChatSystemPrompt(run, brief, llm_provider);
    const priorFromDb = priorMessagesForProvider(run, llm_provider);
    const historyFromClient: LLMMessage[] = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const history =
      historyFromClient.length > 0
        ? historyFromClient
        : priorFromDb.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const chatMessages: LLMMessage[] = [
      { role: "system", content: systemContent },
      ...history,
      { role: "user", content: newMessage },
    ];

    const client = getClient(llm_provider);
    const response = await client.run(chatMessages, {
      temperature: 0.45,
      maxTokens: 3072,
    });

    const assistantContent = (response.content ?? "").trim() || "I did not get a response—try again in a moment.";

    const prior = priorFromDb;
    const updatedMessages = [...prior, { role: "user" as const, content: newMessage }, { role: "assistant" as const, content: assistantContent }];

    const mergedBase: NonNullable<DecisionRunResult["unified_brief_chat_by_provider"]> = {
      ...(run.unified_brief_chat_by_provider ?? {}),
    };
    if (!mergedBase.anthropic?.length && run.unified_brief_chat_messages?.length) {
      mergedBase.anthropic = run.unified_brief_chat_messages;
    }

    const nextByProvider: DecisionRunResult["unified_brief_chat_by_provider"] = {
      ...mergedBase,
      [llm_provider]: updatedMessages,
    };

    const updated: DecisionRunResult = {
      ...run,
      unified_brief_chat_by_provider: nextByProvider,
      ...(llm_provider === "anthropic" ? { unified_brief_chat_messages: updatedMessages } : {}),
    };
    await replaceRun(run_id, updated);

    return NextResponse.json({
      content: assistantContent,
      llm_provider,
      unified_brief_chat_by_provider: nextByProvider,
      unified_brief_chat_messages: nextByProvider.anthropic ?? run.unified_brief_chat_messages,
    });
  } catch (error) {
    console.error("[unified-brief-chat]", error);
    const errObj = error as { message?: string; provider?: string };
    const message =
      error instanceof Error ? error.message : typeof errObj.message === "string" ? errObj.message : "";
    if (message.includes("API_KEY") && message.includes("not set")) {
      const provider = errObj.provider;
      const p =
        provider === "openai" ||
        provider === "gemini" ||
        provider === "anthropic" ||
        provider === "xai"
          ? (provider as LLMProviderName)
          : activeChatProvider;
      const { status, body } = providerConfigError(p);
      return NextResponse.json({ error: body }, { status });
    }
    return NextResponse.json({ error: message || "Chat failed" }, { status: 500 });
  }
}
