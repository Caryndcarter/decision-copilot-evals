import "server-only";
import { anthropic } from "@/llm/anthropic";
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

/** Prefer Claude Fable 5 for richer demo answers; override with CLARIFICATION_DEMO_MODEL. */
export const CLARIFICATION_DEMO_PRIMARY_MODEL =
  process.env.CLARIFICATION_DEMO_MODEL?.trim() ||
  process.env.ANTHROPIC_MODEL?.trim() ||
  "claude-fable-5";

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
          additionalProperties: false,
        },
      },
    },
    required: ["answers"],
    additionalProperties: false,
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
1. Be consistent with the decision intake (situation, constraints, knowns, unknowns, and leaning direction when present).
2. Sound like a knowledgeable stakeholder inside the organization — specific, grounded, useful for analysis (not generic placeholders). Use concrete figures, timelines, role titles, and tradeoffs from the intake when available.
3. For PE / roll-up / workforce / government-software cases: surface tensions (LP fiduciary pressure vs municipal service risk vs employee harm), incomplete legal review, and incentives of advisors who benefit if the project proceeds.
4. Match each question's answer shape:
   - short_text: 2–5 sentences with concrete details (timelines, $ bands, policies, named stakeholder groups). Prefer substance over slogans.
   - enum: exactly one provided option string.
   - numeric / percentage: a plausible number only (no units in the string unless part of prose for short_text).
   - boolean: only "yes", "no", or "unknown" — but most questions use short_text; write prose when ui_answer_type is short_text.
5. Vary tone and detail across questions — do not repeat the same sentence.
6. When the intake distinguishes FACTS vs ASSUMPTIONS, answer in a way that respects that distinction (do not launder assumptions as proven facts).
7. When a leaning / preferred plan is stated, answer as that leadership team would — including their blind spots — so the analysis has real material to push against.

Return every answer_key exactly once.`;

type DemoIntake = Pick<
  DecisionIntake,
  "situation" | "constraints" | "knowns_assumptions" | "unknowns" | "posture"
> & { leaning_direction?: string };

function buildUserPrompt(
  intake: DemoIntake,
  questions: DemoSampleQuestion[],
  scenarioHint?: string
): string {
  const inventory = questions
    .map(
      (q) =>
        `- answer_key: \`${q.answer_key}\` | lens: ${q.lens} | ui_answer_type: ${q.ui_answer_type}${
          q.options?.length ? ` | options: ${q.options.join(", ")}` : ""
        } | question: ${q.question_text}`
    )
    .join("\n");

  return `Decision context:

**Posture:** ${intake.posture}
**Situation:** ${intake.situation}
**Constraints:** ${intake.constraints}
${intake.leaning_direction ? `**Direction to challenge / current leaning:** ${intake.leaning_direction}` : ""}
${intake.knowns_assumptions ? `**Knowns / assumptions:** ${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `**Unknowns:** ${intake.unknowns}` : ""}
${scenarioHint ? `**Demo scenario label:** ${scenarioHint}` : ""}

Write demo answers for these ${questions.length} questions:

${inventory}`;
}

function finalizeAnswers(
  questions: DemoSampleQuestion[],
  parsedAnswers: { answer_key?: string; answer?: string }[] | undefined
): ClarificationAnswersMap {
  const byKey = new Map(questions.map((q) => [q.answer_key, q]));
  const answers: ClarificationAnswersMap = {};

  for (const row of parsedAnswers ?? []) {
    const key = row.answer_key?.trim();
    if (!key || !byKey.has(key) || row.answer == null) continue;
    const q = byKey.get(key)!;
    answers[key] = coerceDemoAnswer(String(row.answer), q.ui_answer_type, q.options);
  }

  for (const q of questions) {
    if (answers[q.answer_key] !== undefined) continue;
    answers[q.answer_key] = buildDemoSampleForQuestion(q);
  }
  return answers;
}

/**
 * Generate demo clarification answers. Prefers Claude Fable 5 for denser, case-grounded samples;
 * falls back to Gemini, then static placeholders.
 */
export async function generateClarificationDemoSamplesWithGemini(
  intake: DemoIntake,
  questions: DemoSampleQuestion[],
  scenarioHint?: string
): Promise<ClarificationDemoSamplesResult> {
  if (questions.length === 0) {
    return {
      answers: {},
      demo_model: CLARIFICATION_DEMO_PRIMARY_MODEL,
      demo_method: "model",
    };
  }

  const fallbackStatic = (): ClarificationDemoSamplesResult => ({
    answers: buildDemoClarificationSamples(demoSampleQuestionsToLensQuestions(questions)),
    demo_model: CLARIFICATION_DEMO_PRIMARY_MODEL,
    demo_method: "fallback",
  });

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: buildUserPrompt(intake, questions, scenarioHint) },
  ];
  const schema = buildSchema() as unknown as Record<string, unknown>;

  try {
    const response = await anthropic.run(messages, {
      model: CLARIFICATION_DEMO_PRIMARY_MODEL,
      schema,
      temperature: 0.45,
      maxTokens: 12_288,
    });
    const parsed = (response.parsed ?? {}) as {
      answers?: { answer_key?: string; answer?: string }[];
    };
    return {
      answers: finalizeAnswers(questions, parsed.answers),
      demo_model: response.meta?.model ?? CLARIFICATION_DEMO_PRIMARY_MODEL,
      demo_method: "model",
    };
  } catch (err) {
    console.warn(
      "[clarification-demo-samples] Primary model failed; trying Gemini",
      err
    );
  }

  try {
    const response = await gemini.run(messages, {
      model: GEMINI_CLARIFICATION_DEMO_MODEL,
      schema,
      temperature: 0.55,
      maxTokens: 8192,
    });
    const parsed = (response.parsed ?? {}) as {
      answers?: { answer_key?: string; answer?: string }[];
    };
    return {
      answers: finalizeAnswers(questions, parsed.answers),
      demo_model: response.meta?.model ?? GEMINI_CLARIFICATION_DEMO_MODEL,
      demo_method: "model",
    };
  } catch (err) {
    console.warn("[clarification-demo-samples] Gemini failed; using static fallback", err);
    return fallbackStatic();
  }
}
