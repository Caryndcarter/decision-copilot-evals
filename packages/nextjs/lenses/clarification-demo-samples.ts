import "server-only";
import { gemini } from "@/llm/gemini";
import {
  buildDemoClarificationSamples,
  buildDemoSampleForQuestion,
  demoSampleQuestionsToLensQuestions,
} from "@/lib/clarification-demo-fallback";
import type { ClarificationAnswersMap } from "@/lib/clarification-answers";
import type {
  ClarificationDemoSamplesResult,
  DemoSampleQuestion,
} from "@/lib/clarification-demo-samples-types";
import type { DecisionIntake } from "@/types/decision";

export const GEMINI_CLARIFICATION_DEMO_MODEL =
  process.env.GEMINI_CLARIFICATION_DEMO_MODEL?.trim() ||
  process.env.GEMINI_CLARIFICATION_DEDUP_MODEL?.trim() ||
  "gemini-3.5-flash";

function buildSchema() {
  return {
    type: "object",
    properties: {
      answers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            answer_key: { type: "string" },
            answer: { type: "string", description: "Answer text, number as string, or yes/no/unknown" },
          },
          required: ["answer_key", "answer"],
        },
      },
    },
    required: ["answers"],
  };
}

function coerceDemoAnswer(
  raw: string,
  uiType: DemoSampleQuestion["ui_answer_type"],
  options?: string[]
): string | number | boolean {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (uiType === "enum" && options?.length) {
    const match = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
    return match ?? options[0]!;
  }

  if (uiType === "percentage" || uiType === "numeric") {
    const n = Number(trimmed.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return uiType === "percentage" ? Math.min(100, Math.max(0, n)) : n;
  }

  if (uiType === "boolean") {
    const lower = trimmed.toLowerCase();
    if (lower === "yes" || lower === "true") return true;
    if (lower === "no" || lower === "false") return false;
    if (lower === "unknown") return "unknown";
  }

  return trimmed;
}

const SYSTEM_PROMPT = `You write realistic demo answers for a decision-support app's clarification form.

The user is testing the product with a plausible scenario. Your answers should:
1. Be consistent with the decision intake (situation, constraints, knowns, unknowns).
2. Sound like a knowledgeable stakeholder — specific, grounded, useful for analysis (not generic placeholders).
3. Match each question's answer shape:
   - short_text: 2–4 sentences with concrete details (team names optional, timelines, policies, tradeoffs).
   - enum: exactly one provided option string.
   - numeric / percentage: a plausible number only (no units in the string unless part of prose for short_text).
   - boolean: only "yes", "no", or "unknown" — but most questions use short_text; write prose when ui_answer_type is short_text.
4. Vary tone and detail across questions — do not repeat the same sentence.
5. For compliance, security, or feasibility questions, include realistic organizational context (e.g. legal review in progress, budget band, team capacity).

Return every answer_key exactly once.`;

export async function generateClarificationDemoSamplesWithGemini(
  intake: Pick<
    DecisionIntake,
    "situation" | "constraints" | "knowns_assumptions" | "unknowns" | "posture"
  >,
  questions: DemoSampleQuestion[],
  scenarioHint?: string
): Promise<ClarificationDemoSamplesResult> {
  if (questions.length === 0) {
    return { answers: {}, demo_model: GEMINI_CLARIFICATION_DEMO_MODEL, demo_method: "gemini" };
  }

  const fallbackStatic = (): ClarificationDemoSamplesResult => ({
    answers: buildDemoClarificationSamples(demoSampleQuestionsToLensQuestions(questions)),
    demo_model: GEMINI_CLARIFICATION_DEMO_MODEL,
    demo_method: "fallback",
  });

  const inventory = questions
    .map(
      (q) =>
        `- answer_key: \`${q.answer_key}\` | lens: ${q.lens} | ui_answer_type: ${q.ui_answer_type}${
          q.options?.length ? ` | options: ${q.options.join(", ")}` : ""
        } | question: ${q.question_text}`
    )
    .join("\n");

  const user = `Decision context:

**Posture:** ${intake.posture}
**Situation:** ${intake.situation}
**Constraints:** ${intake.constraints}
${intake.knowns_assumptions ? `**Knowns / assumptions:** ${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `**Unknowns:** ${intake.unknowns}` : ""}
${scenarioHint ? `**Demo scenario label:** ${scenarioHint}` : ""}

Write demo answers for these ${questions.length} questions:

${inventory}`;

  try {
    const response = await gemini.run(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
      {
        model: GEMINI_CLARIFICATION_DEMO_MODEL,
        schema: buildSchema(),
        temperature: 0.55,
        maxTokens: 8192,
      }
    );

    const parsed = (response.parsed ?? {}) as {
      answers?: { answer_key?: string; answer?: string }[];
    };

    const byKey = new Map(questions.map((q) => [q.answer_key, q]));
    const answers: ClarificationAnswersMap = {};

    for (const row of parsed.answers ?? []) {
      const key = row.answer_key?.trim();
      if (!key || !byKey.has(key) || row.answer == null) continue;
      const q = byKey.get(key)!;
      answers[key] = coerceDemoAnswer(String(row.answer), q.ui_answer_type, q.options);
    }

    for (const q of questions) {
      if (answers[q.answer_key] !== undefined) continue;
      answers[q.answer_key] = buildDemoSampleForQuestion(q);
    }

    return {
      answers,
      demo_model: GEMINI_CLARIFICATION_DEMO_MODEL,
      demo_method: "gemini",
    };
  } catch (err) {
    console.warn("[clarification-demo-samples] Gemini failed; using static fallback", err);
    return fallbackStatic();
  }
}
