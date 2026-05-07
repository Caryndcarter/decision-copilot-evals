/**
 * One-shot decision topic title from intake + first lens pass. SERVER-ONLY.
 * Names *what* is being decided — not a recommendation line from the brief.
 */

import "server-only";
import { getClient } from "@/llm";
import type { LLMMessage, LLMProvider } from "@/llm/types";
import type { DecisionIntake, LensOutput } from "@/types/decision";
import { formatLensOutputs } from "@/lenses/brief";

const DECISION_TITLE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description:
        "6–14 words. Names the decision topic only (like a document or nav label). No imperatives, no 'Recommendation:', no 'You should'.",
    },
  },
  required: ["title"],
  additionalProperties: false,
} as const;

const MAX_TITLE_LEN = 140;

function sanitizeTopicTitle(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ");
  t = t.replace(/^(Recommendation|Rec\.?)\s*:\s*/i, "");
  t = t.replace(/^You should\s+/i, "");
  t = t.replace(/^Proceed with\s+/i, "");
  t = t.replace(/^Start with\s+/i, "");
  t = t.replace(/^Begin by\s+/i, "");
  return t.trim().slice(0, MAX_TITLE_LEN);
}

export async function runDecisionTitle(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  provider: LLMProvider = "openai"
): Promise<string> {
  const lensBlock = formatLensOutputs(lensOutputs);
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You write short titles for decision records.

Rules:
- Name the **topic** of the decision (what is being weighed or explored).
- 6–14 words, title case or sentence case, plain language.
- Do NOT give advice, do NOT start with "Recommendation:", "You should", "Proceed with", or similar.
- Do NOT copy a full sentence from a hypothetical recommendation — this is a label, not a verdict.`,
    },
    {
      role: "user",
      content: `## Decision context

**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}

**Posture:** ${intake.posture}${intake.leaning_direction ? ` · Leaning toward: ${intake.leaning_direction}` : ""}
${intake.knowns_assumptions ? `\n**Knowns/assumptions:** ${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `\n**Unknowns:** ${intake.unknowns}` : ""}

## First-pass lens analyses (for context only)

${lensBlock}

Return a single title string for this decision.`,
    },
  ];

  const response = await getClient(provider).run(messages, {
    schema: DECISION_TITLE_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.25,
    maxTokens: 120,
  });

  const parsed = response.parsed as { title?: string } | undefined;
  const title = typeof parsed?.title === "string" ? sanitizeTopicTitle(parsed.title) : "";
  if (!title) {
    throw new Error("Decision title generation returned an empty title");
  }
  return title;
}

const FREEFORM_DIGEST_MAX = 4000;

function compactFreeformDigest(output: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(output);
    if (s.length <= FREEFORM_DIGEST_MAX) return s;
    return `${s.slice(0, FREEFORM_DIGEST_MAX)}…`;
  } catch {
    return "";
  }
}

/**
 * Short dashboard title for a free-form analysis run (stored as `decision_title`).
 * Separate tiny structured call so the main freeform JSON stays unconstrained.
 */
export async function runFreeformCardTitle(
  intake: DecisionIntake,
  freeformOutput: Record<string, unknown>,
  provider: LLMProvider
): Promise<string> {
  const digest = compactFreeformDigest(freeformOutput);
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You write short list titles for saved decision analyses (card / nav label).

Rules:
- Name the **decision topic** — what problem or choice is being explored (like an epic name or doc title).
- 6–14 words, title case or sentence case, plain language.
- Do NOT give advice. Do NOT use imperatives ("Proceed", "Start", "Consider", "You should").
- Do NOT paste or adapt wording from recommendations or next steps in the JSON — only infer the **subject** of the decision.`,
    },
    {
      role: "user",
      content: `## Intake (what is being decided)

**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}

**Posture:** ${intake.posture}${intake.leaning_direction ? ` · Leaning toward: ${intake.leaning_direction}` : ""}
${intake.knowns_assumptions ? `\n**Knowns/assumptions:** ${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `\n**Unknowns:** ${intake.unknowns}` : ""}

## Free-form analysis (JSON excerpt for topic context only)

${digest || "(empty)"}

Return one title string for the My Decisions list.`,
    },
  ];

  const response = await getClient(provider).run(messages, {
    schema: DECISION_TITLE_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.25,
    maxTokens: 120,
  });

  const parsed = response.parsed as { title?: string } | undefined;
  const title = typeof parsed?.title === "string" ? sanitizeTopicTitle(parsed.title) : "";
  if (!title) {
    throw new Error("Freeform card title generation returned an empty title");
  }
  return title;
}
