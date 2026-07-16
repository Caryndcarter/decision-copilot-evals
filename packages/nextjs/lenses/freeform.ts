/**
 * Freeform analysis — the model chooses its own JSON shape (no fixed schema).
 *
 * Presents the standard structure as a suggestion but explicitly invites
 * the model to reorganize, rename, add, or drop sections as it sees fit.
 *
 * SERVER-ONLY: Do not import from client/UI code.
 */

import "server-only";
import { getClient } from "@/llm";
import { extractFirstBalancedJsonObject } from "@/lib/extract-json-object";
import type { LLMProvider } from "@/llm/types";
import type { DecisionIntake } from "@/types/decision";

const SUGGESTED_SCHEMA = `{
  "risk_analysis": {
    "top_risks": ["string"],
    "assumptions": ["string"],
    "blind_spots": [{ "area": "string", "description": "string" }],
    "tradeoffs": [{ "option": "string", "upside": "string", "downside": "string" }]
  },
  "reversibility": {
    "irreversible_steps": ["string"],
    "safe_to_try_first": ["string"]
  },
  "stakeholder_impact": {
    "impacts": [{ "stakeholder": "string", "impact": "string", "sentiment": "positive|negative|neutral" }],
    "execution_risks": ["string"]
  },
  "summary": {
    "recommendation": "string",
    "key_considerations": ["string"],
    "next_steps": ["string"]
  }
}`;

export interface FreeformResult {
  output: Record<string, unknown>;
  model: string;
  generated_at: string;
  intake: DecisionIntake;
}

function asFreeformObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (Array.isArray(value) && value.length === 1) {
    const first = value[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
  }
  return null;
}

export function parseFreeformJsonFromLlm(content: string, parsed?: unknown): Record<string, unknown> {
  const fromParsed = asFreeformObject(parsed);
  if (fromParsed) return fromParsed;

  const text = content.replace(/^\uFEFF/, "").trim();
  const chunks: string[] = [];
  for (const m of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) {
    const inner = m[1]?.trim();
    if (inner) chunks.push(inner);
  }
  chunks.push(text);

  for (const chunk of chunks) {
    const balanced = extractFirstBalancedJsonObject(chunk);
    const attempts = balanced ? [balanced] : [];
    const first = chunk.indexOf("{");
    const last = chunk.lastIndexOf("}");
    if (first !== -1 && last > first) {
      attempts.push(chunk.slice(first, last + 1));
    }
    for (const jsonStr of attempts) {
      try {
        const output = asFreeformObject(JSON.parse(jsonStr) as unknown);
        if (output) return output;
      } catch {
        // try next
      }
    }
  }
  throw new Error("Model did not return valid JSON");
}

export async function runFreeformAnalysis(intake: DecisionIntake, provider: LLMProvider): Promise<FreeformResult> {
  const systemPrompt = `You are an expert decision analyst. Produce a structured analysis of the decision described below.

Here is a suggested starting structure — but you are NOT required to use it:
${SUGGESTED_SCHEMA}

Feel free to reorganize completely if a different structure better fits this specific decision. You might:
- Combine sections that naturally overlap
- Add new sections more relevant to this situation
- Remove sections that don't apply
- Use different field names that are more descriptive
- Nest information differently

Requirements:
1. Output ONLY the raw JSON object — no explanation, no prose, no markdown code fences before or after
2. Be specific and actionable — no generic advice
3. Ground every point in the exact situation described
4. Plain text only in all string values — no markdown (**bold**, *italics*, headings, etc.)`;

  const postureNote =
    intake.posture === "pressure_test" && intake.leaning_direction
      ? `\n**Leaning toward:** ${intake.leaning_direction}`
      : "";

  const userPrompt = `**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}
${intake.knowns_assumptions ? `\n**What I know / am assuming:** ${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `\n**What I don't know:** ${intake.unknowns}` : ""}${postureNote}

**Analysis posture:** ${intake.posture.replace(/_/g, " ")}

Analyze this decision. Respond with a single raw JSON object only — no text before or after it.`;

  const client = getClient(provider);
  const options =
    provider === "anthropic"
      ? { temperature: 0.7, maxTokens: 8192, preferJsonObject: true as const }
      : provider === "gemini"
        ? { temperature: 0.45, maxTokens: 8192, preferJsonObject: true as const }
        : provider === "xai"
          ? { temperature: 0.7, maxTokens: 8192, preferJsonObject: true as const }
          : // OpenAI: reasoning + JSON share max_completion_tokens — give ample headroom for visible JSON.
            { maxTokens: 16384, preferJsonObject: true as const };

  const response = await client.run(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    options
  );

  let output: Record<string, unknown>;
  try {
    output = parseFreeformJsonFromLlm(response.content, response.parsed);
  } catch {
    const len = response.content.length;
    const finish = response.meta?.finishReason ?? "unknown";
    throw new Error(
      `[${provider}] Model did not return valid JSON (${len} chars, finish_reason=${finish})`
    );
  }

  return {
    output,
    model:
      response.meta?.model ??
      (provider === "openai"
        ? process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol"
        : provider === "gemini"
          ? "gemini-2.5-flash"
          : provider === "xai"
            ? process.env.XAI_MODEL?.trim() || "grok-4.5"
            : "claude"),
    generated_at: new Date().toISOString(),
    intake,
  };
}
