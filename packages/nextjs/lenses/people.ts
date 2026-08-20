/**
 * People Lens
 *
 * Focuses on stakeholder impacts and execution risks for a decision.
 * SERVER-ONLY: Do not import from client/UI code.
 */

import "server-only";
import { getClient } from "@/llm";
import type { LLMMessage, LLMProvider } from "@/llm/types";
import type {
  DecisionIntake,
  Posture,
  PeopleLensOutput,
  BlindSpot,
  Tradeoff,
  LensQuestion,
  Clarification,
  StakeholderImpact,
} from "@/types/decision";
import { postureRequiresLeaning } from "@/types/decision";

const PEOPLE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How confident you are in this analysis given the information provided",
    },
    stakeholder_impacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stakeholder: { type: "string", description: "Who is affected; plain text, no markdown" },
          impact: { type: "string", description: "How they are affected; plain text, no markdown" },
          sentiment: {
            type: "string",
            enum: ["positive", "negative", "neutral"],
            description: "Whether the impact is positive, negative, or neutral",
          },
        },
        required: ["stakeholder", "impact", "sentiment"],
        additionalProperties: false,
      },
      description: "Key stakeholders and how the decision impacts them (3-7 items)",
    },
    execution_risks: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description:
        "Risks to successful execution: adoption, resistance, capability gaps, coordination (3-7 items)",
    },
    assumptions_detected: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description: "Assumptions the decision-maker appears to be making about people and execution",
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
      description: "Stakeholder or execution areas the decision-maker may not be considering",
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
      description: "Key tradeoffs involving people or execution",
    },
    remaining_uncertainty: {
      type: "array",
      items: { type: "string", description: "Plain sentence; no markdown" },
      description: "Information about stakeholders or execution that would improve this analysis",
    },
    questions_to_answer_next: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          lens: { type: "string", const: "people" },
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
      description: "Follow-up questions that would help clarify stakeholder or execution impacts (1-3 questions; include at least one when the situation is brief or key details are missing)",
    },
  },
  required: [
    "confidence",
    "stakeholder_impacts",
    "execution_risks",
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
      return "The user is exploring this decision openly. Surface who is affected and what execution risks matter across options.";
    case "pressure_test":
      return `The user is leaning toward: "${leaningDirection}". Stress-test this by identifying who might resist, who is left out, and what could derail execution.`;
    case "show_opposition":
      return `The user is leaning toward: "${leaningDirection}". Do not help them sell or soft-land that lean. Argue as a serious opponent would on the people and execution side: who would resist and why they're right to, whose interests the lean sacrifices, how opponents would frame stakeholder harm, and what alternative the opposition would prefer. Do not hedge back into defending the user's lean.`;
    case "surface_risks":
      return "The user wants to understand risks. Be thorough on stakeholder impacts and execution risks; don't soften the people side.";
    case "generate_alternatives":
      return "The user wants to explore alternatives. For each stakeholder or execution risk, consider whether a different approach could reduce impact or risk.";
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
  return `\n\n## Follow-up answers from the user\n${lines.join("\n")}\n\nUse these answers to refine your people and execution analysis. Do not ask the same questions again.`;
}

export function buildPeoplePrompt(
  intake: DecisionIntake,
  clarifications: Clarification[] = []
): LLMMessage[] {
  const postureInstruction = getPostureInstruction(
    intake.posture,
    postureRequiresLeaning(intake.posture) ? intake.leaning_direction : undefined
  );

  const systemPrompt = `You are an advisor helping someone think through the people and execution side of an important decision. Your job is to identify:
1. Stakeholder impacts — who is affected (teams, roles, partners) and how (positive, negative, neutral).
2. Execution risks — what could derail or complicate implementation: adoption, resistance, capability gaps, coordination, dependencies.

${postureInstruction}

Be specific and actionable. Ground your analysis in the specific situation described.

Include 1-3 follow-up questions in questions_to_answer_next that would clarify stakeholder or execution impacts (e.g. key people, timeline, or dependencies). Always provide at least one question so the user can clarify before the final brief—do not skip straight to conclusions without asking.

${LENS_JSON_PLAIN_TEXT_RULE}`;

  let userContent = `## Decision Context

**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}

${intake.knowns_assumptions ? `**What I know / am assuming:** ${intake.knowns_assumptions}` : ""}

${intake.unknowns ? `**What I don't know:** ${intake.unknowns}` : ""}

Analyze stakeholder impacts and execution risks for this decision.`;
  userContent += formatClarificationsForPrompt(clarifications);

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

interface RawPeopleOutput {
  confidence: "high" | "medium" | "low";
  stakeholder_impacts: Array<{ stakeholder: string; impact: string; sentiment: string }>;
  execution_risks: string[];
  assumptions_detected: string[];
  blind_spots: Array<{ area: string; description: string }>;
  tradeoffs: Array<{ option: string; upside: string; downside: string }>;
  remaining_uncertainty: string[];
  questions_to_answer_next: Array<{
    question_id: string;
    lens: "people";
    question_text: string;
    answer_type: "enum" | "boolean" | "numeric" | "percentage" | "short_text";
    options: string[] | null;
    required: boolean;
  }>;
}

export function parsePeopleOutput(parsed: unknown): PeopleLensOutput {
  const raw = parsed as RawPeopleOutput;

  const output: PeopleLensOutput = {
    lens: "people",
    confidence: raw.confidence ?? "medium",
    stakeholder_impacts: (raw.stakeholder_impacts ?? []).map(
      (s): StakeholderImpact => ({
        stakeholder: s.stakeholder,
        impact: s.impact,
        sentiment:
          s.sentiment === "positive" || s.sentiment === "negative" || s.sentiment === "neutral"
            ? s.sentiment
            : "neutral",
      })
    ),
    execution_risks: raw.execution_risks ?? [],
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
        lens: "people",
        question_text: q.question_text,
        answer_type: q.answer_type,
        options: q.options ?? undefined,
        required: q.required,
      })
    ),
  };

  return output;
}

export async function runPeopleLens(
  intake: DecisionIntake,
  clarifications: Clarification[] = [],
  provider: LLMProvider = "openai"
): Promise<PeopleLensOutput> {
  const messages = buildPeoplePrompt(intake, clarifications);
  // Dense stakeholder cases (e.g. PE / govtech roll-ups) need more headroom.
  // OpenAI GPT-5 reasoning + xAI Grok both truncate mid-JSON without it.
  const requestOpts = {
    schema: PEOPLE_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.7,
    maxTokens: provider === "openai" ? 16_384 : provider === "xai" ? 8192 : 4096,
  };

  const client = getClient(provider);
  let response = await client.run(messages, requestOpts);

  if (!response.parsed) {
    console.warn("[People] First attempt did not return parseable JSON; retrying once.", {
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
          "Keep stakeholder_impacts to 4–6 items and questions_to_answer_next to 1–2 so the object fully closes.",
      },
    ];
    response = await client.run(retryMessages, {
      ...requestOpts,
      temperature: 0.2,
      maxTokens: Math.max(requestOpts.maxTokens, 16_384),
    });
  }

  if (!response.parsed) {
    console.error("[People] People lens failed to produce parseable JSON after retry.", {
      provider,
      finishReason: response.meta?.finishReason,
      contentLen: response.content.length,
      contentPreview: response.content.slice(0, 500),
    });
    throw new Error(
      `People lens did not return valid structured output (provider: ${provider}, finishReason: ${response.meta?.finishReason ?? "unknown"})`
    );
  }

  return parsePeopleOutput(response.parsed);
}
