/**
 * Reversibility Lens
 *
 * Analyzes a decision for what's reversible vs. irreversible and what's safe to try first.
 * SERVER-ONLY: Do not import from client/UI code.
 */

import "server-only";
import { getClient } from "@/llm";
import type { LLMMessage, LLMProvider } from "@/llm/types";
import type {
  DecisionIntake,
  Posture,
  ReversibilityLensOutput,
  BlindSpot,
  Tradeoff,
  LensQuestion,
  Clarification,
} from "@/types/decision";

const REVERSIBILITY_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How confident are you in this analysis given the information provided",
    },
    irreversible_steps: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description:
        "Steps or commitments that would be hard or impossible to undo once taken (3-7 items)",
    },
    safe_to_try_first: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description:
        "Low-commitment steps or experiments the decision-maker could try first with minimal downside (3-7 items)",
    },
    assumptions_detected: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description: "Assumptions the decision-maker appears to be making about reversibility",
    },
    blind_spots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string", description: "Plain text; no markdown" },
          description: { type: "string", description: "Plain text; no markdown" },
        },
        required: ["area", "description"],
        additionalProperties: false,
      },
      description: "Areas the decision-maker may not be considering regarding reversibility",
    },
    tradeoffs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          option: { type: "string", description: "Plain text; no markdown" },
          upside: { type: "string", description: "Plain text; no markdown" },
          downside: { type: "string", description: "Plain text; no markdown" },
        },
        required: ["option", "upside", "downside"],
        additionalProperties: false,
      },
      description: "Key tradeoffs related to reversibility",
    },
    remaining_uncertainty: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description: "Information that would improve this analysis if known",
    },
    questions_to_answer_next: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          lens: { type: "string", const: "reversibility" },
          question_text: { type: "string" },
          answer_type: { type: "string", enum: ["enum", "boolean", "numeric", "percentage", "short_text"] },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Options when answer_type is enum; use empty array [] otherwise (Anthropic compatibility)",
          },
          required: { type: "boolean" },
        },
        required: ["question_id", "lens", "question_text", "answer_type", "options", "required"],
        additionalProperties: false,
      },
      description: "Follow-up questions that would help clarify reversibility (1-3 questions; include at least one when the situation is brief or key details are missing)",
    },
  },
  required: [
    "confidence",
    "irreversible_steps",
    "safe_to_try_first",
    "assumptions_detected",
    "blind_spots",
    "tradeoffs",
    "remaining_uncertainty",
    "questions_to_answer_next",
  ],
  additionalProperties: false,
} as const;

function getPostureInstruction(posture: Posture, leaningDirection?: string): string {
  switch (posture) {
    case "explore":
      return "The user is exploring this decision openly. Identify what's reversible vs irreversible and what they could try first with low commitment.";
    case "pressure_test":
      return `The user is leaning toward: "${leaningDirection}". Stress-test this by naming what would be hard to undo if they go this way, and what they could try before committing.`;
    case "surface_risks":
      return "The user wants to understand risks. Focus on irreversible steps and what could lock them in; suggest safe experiments first.";
    case "generate_alternatives":
      return "The user wants to explore alternatives. For each irreversible step, consider whether there's a reversible path or a smaller step to try first.";
  }
}

const LENS_JSON_PLAIN_TEXT_RULE =
  "Output formatting: Every string value in your JSON response must be plain text only. Do not use markdown in those strings—no **bold**, no *italics*, no # headings, no backticks, no markdown list markers. The user message uses ** only for its section labels (Situation, Constraints, etc.); do not copy that pattern into your JSON—write normal sentences for emphasis instead.";

function formatClarificationsForPrompt(clarifications: Clarification[]): string {
  if (!clarifications.length) return "";
  const lines = clarifications.flatMap((c) =>
    c.answers.map((a) => {
      let text: string;
      if (a.answer === "unknown") text = "unknown (user didn't know)";
      else if (a.answer_type === "percentage" && typeof a.answer === "number") text = `${a.answer}%`;
      else text = String(a.answer);
      return `- ${a.question_id} (${a.lens}): ${text}`;
    })
  );
  return `\n\n## Follow-up answers from the user\n${lines.join("\n")}\n\nUse these answers to refine your reversibility analysis. Do not ask the same questions again.`;
}

export function buildReversibilityPrompt(
  intake: DecisionIntake,
  clarifications: Clarification[] = []
): LLMMessage[] {
  const postureInstruction = getPostureInstruction(
    intake.posture,
    intake.posture === "pressure_test" ? intake.leaning_direction : undefined
  );

  const systemPrompt = `You are an advisor helping someone think through the reversibility of an important decision. Your job is to identify:
1. What would be hard or impossible to undo once done (irreversible steps).
2. What they could try first with minimal commitment (safe to try first).

${postureInstruction}

Be specific and actionable. Ground your analysis in the specific situation described. Emphasize "what's reversible vs. irreversible" and "what's safe to try first."

Include 1-3 follow-up questions in questions_to_answer_next that would clarify reversibility (e.g. timeline, commitment level, or constraints). Always provide at least one question so the user can clarify before the final brief—do not skip straight to conclusions without asking.

${LENS_JSON_PLAIN_TEXT_RULE}`;

  let userContent = `## Decision Context

**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}

${intake.knowns_assumptions ? `**What I know / am assuming:** ${intake.knowns_assumptions}` : ""}

${intake.unknowns ? `**What I don't know:** ${intake.unknowns}` : ""}

Analyze what's reversible vs. irreversible in this decision, and what's safe to try first.`;
  userContent += formatClarificationsForPrompt(clarifications);

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

interface RawReversibilityOutput {
  confidence: "high" | "medium" | "low";
  irreversible_steps: string[];
  safe_to_try_first: string[];
  assumptions_detected: string[];
  blind_spots: Array<{ area: string; description: string }>;
  tradeoffs: Array<{ option: string; upside: string; downside: string }>;
  remaining_uncertainty: string[];
  questions_to_answer_next: Array<{
    question_id: string;
    lens: "reversibility";
    question_text: string;
    answer_type: "enum" | "boolean" | "numeric" | "percentage" | "short_text";
    options: string[] | null;
    required: boolean;
  }>;
}

export function parseReversibilityOutput(parsed: unknown): ReversibilityLensOutput {
  const raw = parsed as RawReversibilityOutput;

  const output: ReversibilityLensOutput = {
    lens: "reversibility",
    confidence: raw.confidence ?? "medium",
    irreversible_steps: raw.irreversible_steps ?? [],
    safe_to_try_first: raw.safe_to_try_first ?? [],
    assumptions_detected: raw.assumptions_detected ?? [],
    blind_spots: (raw.blind_spots ?? []).map(
      (b): BlindSpot => ({ area: b.area, description: b.description })
    ),
    tradeoffs: (raw.tradeoffs ?? []).map(
      (t): Tradeoff => ({ option: t.option, upside: t.upside, downside: t.downside })
    ),
    remaining_uncertainty: raw.remaining_uncertainty ?? [],
    questions_to_answer_next: (raw.questions_to_answer_next ?? []).map(
      (q): LensQuestion => ({
        question_id: q.question_id,
        lens: "reversibility",
        question_text: q.question_text,
        answer_type: q.answer_type,
        options: q.options ?? undefined,
        required: q.required,
      })
    ),
  };

  return output;
}

export async function runReversibilityLens(
  intake: DecisionIntake,
  clarifications: Clarification[] = [],
  provider: LLMProvider = "openai"
): Promise<ReversibilityLensOutput> {
  const messages = buildReversibilityPrompt(intake, clarifications);
  // Dense intakes (e.g. Meridian) can truncate Grok mid-JSON at 2048.
  const requestOpts = {
    schema: REVERSIBILITY_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.7,
    maxTokens: provider === "xai" || provider === "openai" ? 8192 : 4096,
  };

  const client = getClient(provider);
  let response = await client.run(messages, requestOpts);

  if (!response.parsed) {
    console.warn("[Reversibility] First attempt did not return parseable JSON; retrying once.", {
      provider,
      finishReason: response.meta?.finishReason,
      contentLen: response.content.length,
      contentPreview: response.content.slice(0, 300),
    });
    const retryMessages: LLMMessage[] = [
      ...messages,
      {
        role: "user",
        content:
          "Your previous reply was not valid JSON for the required schema. " +
          "Reply NOW with one JSON object that matches the schema exactly. " +
          "No prose, no markdown, no code fences — only the JSON object. " +
          "Keep irreversible_steps and safe_to_try_first to 3–5 items each and questions_to_answer_next to 1–2 so the object fully closes.",
      },
    ];
    response = await client.run(retryMessages, {
      ...requestOpts,
      temperature: 0.2,
      maxTokens: Math.max(requestOpts.maxTokens, 8192),
    });
  }

  if (!response.parsed) {
    console.error("[Reversibility] Lens failed to produce parseable JSON after retry.", {
      provider,
      finishReason: response.meta?.finishReason,
      contentLen: response.content.length,
      contentPreview: response.content.slice(0, 500),
    });
    throw new Error(
      `Reversibility lens did not return valid structured output (provider: ${provider}, finishReason: ${response.meta?.finishReason ?? "unknown"})`
    );
  }

  return parseReversibilityOutput(response.parsed);
}
