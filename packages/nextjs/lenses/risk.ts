/**
 * Risk Lens
 *
 * Analyzes a decision for potential risks, blind spots, and tradeoffs.
 * SERVER-ONLY: Do not import from client/UI code.
 */

import "server-only";
import { getClient } from "@/llm";
import type { LLMMessage, LLMProvider } from "@/llm/types";
import type {
  DecisionIntake,
  Posture,
  RiskLensOutput,
  BlindSpot,
  Tradeoff,
  LensQuestion,
  Clarification,
} from "@/types/decision";
import { postureRequiresLeaning } from "@/types/decision";

// JSON Schema for structured output
const RISK_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How confident are you in this analysis given the information provided",
    },
    top_risks: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown (no ** or *)" },
      description: "The most significant risks associated with this decision (3-7 items)",
    },
    assumptions_detected: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description: "Assumptions the decision-maker appears to be making",
    },
    blind_spots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string", description: "Plain text label; no markdown" },
          description: { type: "string", description: "Plain text; no markdown" },
        },
        required: ["area", "description"],
        additionalProperties: false,
      },
      description: "Areas the decision-maker may not be considering",
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
      description: "Key tradeoffs to consider",
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
          lens: { type: "string", const: "risk" },
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
      description: "Follow-up questions that would help clarify risks (1-3 questions; include at least one when the situation is brief or key details are missing)",
    },
  },
  required: [
    "confidence",
    "top_risks",
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
      return "The user is exploring this decision openly. Provide balanced analysis of risks across all options.";
    case "pressure_test":
      return `The user is leaning toward: "${leaningDirection}". Actively challenge this direction - look for risks they may be downplaying or ignoring because of their bias toward this choice.`;
    case "show_opposition":
      return `The user is leaning toward: "${leaningDirection}". Do not act as a critical friend who still helps them succeed at that lean. Steelman the strongest opposing case: argue as a serious opponent would — why that leaning is wrong or too risky, what alternative they should pursue instead, and the best evidence and arguments against their direction. Do not hedge back into defending their lean; the user wants to hear what opposition would say so they can be ready for it.`;
    case "surface_risks":
      return "The user specifically wants to understand risks. Be thorough and don't soften the risks. Surface even uncomfortable possibilities.";
    case "generate_alternatives":
      return "The user wants to explore alternatives. For each risk you identify, consider whether it points to an alternative approach that might avoid that risk.";
  }
}

/** Models (especially Anthropic) often echo **markdown** into JSON strings; our UI shows those fields as plain text. */
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
  return `\n\n## Follow-up answers from the user\n${lines.join("\n")}\n\nUse these answers to refine your risk analysis. Do not ask the same questions again.`;
}

export function buildRiskPrompt(
  intake: DecisionIntake,
  clarifications: Clarification[] = []
): LLMMessage[] {
  const postureInstruction = getPostureInstruction(
    intake.posture,
    postureRequiresLeaning(intake.posture) ? intake.leaning_direction : undefined
  );

  const systemPrompt = `You are a risk analyst helping someone think through an important decision. Your job is to surface risks, assumptions, and blind spots they may not have considered.

${postureInstruction}

Be specific and actionable. Avoid generic advice. Ground your analysis in the specific situation described.

Include 1-3 follow-up questions in questions_to_answer_next that would make your risk analysis more specific (e.g. timeline, key stakeholders, budget, or constraints). Always provide at least one question so the user can clarify before the final brief—do not skip straight to conclusions without asking.

${LENS_JSON_PLAIN_TEXT_RULE}`;

  let userContent = `## Decision Context

**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}

${intake.knowns_assumptions ? `**What I know / am assuming:** ${intake.knowns_assumptions}` : ""}

${intake.unknowns ? `**What I don't know:** ${intake.unknowns}` : ""}

Analyze the risks of this decision.`;
  userContent += formatClarificationsForPrompt(clarifications);

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

interface RawRiskOutput {
  confidence: "high" | "medium" | "low";
  top_risks: string[];
  assumptions_detected: string[];
  blind_spots: Array<{ area: string; description: string }>;
  tradeoffs: Array<{ option: string; upside: string; downside: string }>;
  remaining_uncertainty: string[];
  questions_to_answer_next: Array<{
    question_id: string;
    lens: "risk";
    question_text: string;
    answer_type: "enum" | "boolean" | "numeric" | "percentage" | "short_text";
    options: string[] | null;
    required: boolean;
  }>;
}

export function parseRiskOutput(parsed: unknown): RiskLensOutput {
  const raw = parsed as RawRiskOutput;

  // Map to our types with defaults for safety
  const output: RiskLensOutput = {
    lens: "risk",
    confidence: raw.confidence ?? "medium",
    top_risks: raw.top_risks ?? [],
    assumptions_detected: raw.assumptions_detected ?? [],
    blind_spots: (raw.blind_spots ?? []).map(
      (b): BlindSpot => ({
        area: b.area,
        description: b.description,
      })
    ),
    tradeoffs: (raw.tradeoffs ?? []).map(
      (t): Tradeoff => ({
        option: t.option,
        upside: t.upside,
        downside: t.downside,
      })
    ),
    remaining_uncertainty: raw.remaining_uncertainty ?? [],
    questions_to_answer_next: (raw.questions_to_answer_next ?? []).map(
      (q): LensQuestion => ({
        question_id: q.question_id,
        lens: "risk",
        question_text: q.question_text,
        answer_type: q.answer_type,
        options: q.options ?? undefined,
        required: q.required,
      })
    ),
  };

  return output;
}

export async function runRiskLens(
  intake: DecisionIntake,
  clarifications: Clarification[] = [],
  provider: LLMProvider = "openai"
): Promise<RiskLensOutput> {
  const messages = buildRiskPrompt(intake, clarifications);
  const requestOpts = {
    schema: RISK_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.7,
    maxTokens: provider === "openai" ? 16_384 : provider === "xai" ? 8192 : 4096,
  };

  const client = getClient(provider);
  let response = await client.run(messages, requestOpts);

  if (!response.parsed) {
    console.warn("[Risk] First attempt did not return parseable JSON; retrying once.", {
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
          "Keep top_risks, assumptions_detected, and remaining_uncertainty to 3–5 items each and questions_to_answer_next to 1–2 so the object fully closes.",
      },
    ];
    response = await client.run(retryMessages, {
      ...requestOpts,
      temperature: 0.2,
      maxTokens: Math.max(requestOpts.maxTokens, 16_384),
    });
  }

  if (!response.parsed) {
    console.error("[Risk] Lens failed to produce parseable JSON after retry.", {
      provider,
      finishReason: response.meta?.finishReason,
      contentLen: response.content.length,
      contentPreview: response.content.slice(0, 500),
    });
    throw new Error(
      `Risk lens did not return valid structured output (provider: ${provider}, finishReason: ${response.meta?.finishReason ?? "unknown"})`
    );
  }

  return parseRiskOutput(response.parsed);
}
