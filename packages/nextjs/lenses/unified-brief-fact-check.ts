/**
 * Unified Brief fact-check — blinded web-search judge, then a constrained rewrite.
 * SERVER-ONLY. Synthesis stays in `lenses/brief.ts`; this pass does not re-synthesize.
 */

import "server-only";
import { getClient } from "@/llm";
import type { LLMMessage, LLMProvider } from "@/llm/types";
import { formatBriefForAudit, formatIntakeForAudit } from "@/lib/unified-brief-audit/format";
import { stripProviderBrandsFromText } from "@/lib/unified-brief-blind";
import {
  failedFactCheckRecord,
  parseFactCheckJudgePayload,
  parseJsonObjectFromModelText,
  resolveFactCheckedBrief,
} from "@/lib/unified-brief-fact-check";
import type {
  DecisionBrief,
  DecisionIntake,
  LLMProviderName,
  UnifiedBriefFactCheck,
} from "@/types/decision";

const DEFAULT_JUDGE: LLMProvider = "gemini";
const OPENAI_FALLBACK_MODEL = "gpt-4o-mini";

function envKeyFor(provider: LLMProvider): string {
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "anthropic") return "ANTHROPIC_API_KEY";
  if (provider === "gemini") return "GEMINI_API_KEY";
  return "XAI_API_KEY";
}

function providerConfigured(provider: LLMProvider): boolean {
  return Boolean(process.env[envKeyFor(provider)]?.trim());
}

/**
 * Prefer Gemini Flash + Google Search. Fall back to OpenAI + Responses web_search.
 * Keep the judge distinct from the synthesizer when both keys exist.
 */
export function resolveFactCheckJudgeProvider(synthesizer?: LLMProviderName): LLMProvider {
  const raw = (process.env.UNIFIED_BRIEF_FACT_CHECK_PROVIDER ?? DEFAULT_JUDGE).trim().toLowerCase();
  const preferred: LLMProvider = raw === "openai" ? "openai" : "gemini";
  const fallback: LLMProvider = preferred === "gemini" ? "openai" : "gemini";
  const preferredOk = providerConfigured(preferred);
  const fallbackOk = providerConfigured(fallback);

  if (synthesizer && preferred === synthesizer && fallbackOk) return fallback;
  if (preferredOk) return preferred;
  if (fallbackOk) return fallback;
  throw new Error(
    `Fact-check judge is not configured. Set ${envKeyFor(preferred)} or ${envKeyFor(fallback)}.`
  );
}

export function factCheckJudgeModel(provider: LLMProvider): string | undefined {
  if (provider === "openai") {
    return process.env.UNIFIED_BRIEF_FACT_CHECK_MODEL?.trim() || OPENAI_FALLBACK_MODEL;
  }
  return process.env.UNIFIED_BRIEF_FACT_CHECK_MODEL?.trim() || undefined;
}

const FACT_CHECK_SYSTEM_PROMPT = `You are a blinded fact-check judge for a decision brief.

## Mission
Check publicly verifiable factual claims in the DRAFT brief using web search. Correct only facts (names, dates, figures, public events, widely known institutional details). Return a structured JSON report and a constrained rewrite of the SAME draft.

## Hard rules
- Do NOT re-synthesize the brief from source analyses. Edit the draft you were given.
- Do NOT change the recommendation or the author's lean unless a factual error sits inside that sentence and the lean itself stays the same.
- Do NOT treat private intake numbers, internal forecasts, or unpublished company figures as public truth. Mark those out_of_scope.
- Do NOT invent sources. If you cannot verify, status is unverified.
- Do NOT mention who wrote the brief, and do not guess a model or vendor.
- If there are no factual corrections, corrections MUST be [] and summary MUST say that there are no factual corrections. corrected_brief MUST match the draft substance.

## Status values
- corrected: the written claim is wrong; set corrected_to to the accurate wording.
- confirmed: you verified the claim as written.
- unverified: you could not confirm or deny it from public sources.
- out_of_scope: private, evaluative, or judgment language — not a public fact.

## Output
Return ONE JSON object only (no markdown outside the object). Shape:
{
  "summary": string,
  "corrections": [
    {
      "claim_as_written": string,
      "status": "corrected" | "confirmed" | "unverified" | "out_of_scope",
      "corrected_to": string | null,
      "rationale": string,
      "sources": [{ "title": string, "url": string }]
    }
  ],
  "corrected_brief": {
    "title": string,
    "summary": string,
    "recommendation": string,
    "key_considerations": string[],
    "next_steps": string[],
    "custom_sections": [{ "heading": string, "content": string }]
  }
}

corrected_brief is the draft with only factual edits applied. Keep section order and all non-factual wording. If corrections is empty, copy the draft fields unchanged.`;

function buildJudgeMessages(intake: DecisionIntake, blindedBrief: string): LLMMessage[] {
  return [
    { role: "system", content: FACT_CHECK_SYSTEM_PROMPT },
    {
      role: "user",
      content: `## Decision intake (filer context — private figures are not public truth)

${formatIntakeForAudit(intake)}

---

## Draft Unified Brief to fact-check (author unknown)

${blindedBrief}

---

Search the public web for verifiable claims. Return ONLY the JSON object.`,
    },
  ];
}

function blindedBriefText(draft: DecisionBrief): string {
  return stripProviderBrandsFromText(formatBriefForAudit(draft));
}

function isJudgeAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as { code?: unknown; message?: unknown };
  const code = typeof o.code === "string" ? o.code : "";
  const message = typeof o.message === "string" ? o.message : "";
  return (
    code === "MISSING_API_KEY" ||
    code === "HTTP_401" ||
    code === "HTTP_403" ||
    /incorrect api key|api key.*not set|unauthorized/i.test(message)
  );
}

function alternateJudge(provider: LLMProvider): LLMProvider {
  return provider === "gemini" ? "openai" : "gemini";
}

async function runJudgeCall(
  judge: LLMProvider,
  messages: LLMMessage[]
): Promise<{ parsed: unknown; model?: string }> {
  const model = factCheckJudgeModel(judge);
  const requestOpts = {
    enableWebSearch: true as const,
    temperature: 0,
    maxTokens: 16384,
    effort: "low" as const,
    ...(model ? { model } : {}),
  };
  const client = getClient(judge);
  let response = await client.run(messages, requestOpts);
  let parsed = parseJsonObjectFromModelText(response.content);
  if (!parsed) {
    console.warn("[unified-brief-fact-check] first reply not JSON", {
      judge,
      model: response.meta?.model || model,
      finishReason: response.meta?.finishReason,
      contentLen: response.content?.length ?? 0,
      preview: (response.content ?? "").slice(0, 400),
    });
    response = await client.run(
      [
        ...messages,
        {
          role: "user",
          content:
            "Your previous reply was not valid JSON. Return ONLY the JSON object with summary, corrections, and corrected_brief.",
        },
      ],
      requestOpts
    );
    parsed = parseJsonObjectFromModelText(response.content);
  }
  if (!parsed) {
    const preview = (response.content ?? "").slice(0, 240);
    throw new Error(
      `Fact-check judge returned no parseable JSON (${judge}, ${response.content?.length ?? 0} chars): ${preview}`
    );
  }
  return { parsed, model: response.meta?.model || model };
}

/**
 * Fact-check a synthesized Unified Brief draft.
 * Throws if the judge is unconfigured or returns nothing parseable.
 */
export async function runUnifiedBriefFactCheck(
  draft: DecisionBrief,
  intake: DecisionIntake,
  synthesizer?: LLMProviderName
): Promise<{ brief: DecisionBrief; factCheck: UnifiedBriefFactCheck }> {
  const briefText = blindedBriefText(draft);
  if (!briefText) {
    throw new Error("Unified Brief has no content to fact-check.");
  }

  const messages = buildJudgeMessages(intake, briefText);
  let judge = resolveFactCheckJudgeProvider(synthesizer);
  let parsed: unknown;
  let usedModel: string | undefined;
  try {
    const result = await runJudgeCall(judge, messages);
    parsed = result.parsed;
    usedModel = result.model;
  } catch (err) {
    const fallback = alternateJudge(judge);
    if (isJudgeAuthError(err) && providerConfigured(fallback)) {
      console.warn(
        `[unified-brief-fact-check] ${judge} failed auth; retrying with ${fallback}`
      );
      judge = fallback;
      const result = await runJudgeCall(judge, messages);
      parsed = result.parsed;
      usedModel = result.model;
    } else {
      throw err;
    }
  }

  const payload = parseFactCheckJudgePayload(parsed, draft.generated_at);
  if (!payload) {
    throw new Error("Fact-check judge JSON was missing summary or a valid object.");
  }

  const brief = resolveFactCheckedBrief(draft, payload);
  const factCheck: UnifiedBriefFactCheck = {
    generated_at: new Date().toISOString(),
    judge_provider: judge,
    ...(usedModel ? { judge_model: usedModel } : {}),
    summary: payload.summary,
    corrections: payload.corrections,
    draft_brief: draft,
  };

  return { brief, factCheck };
}

export function unifiedBriefFactCheckFailure(
  draft: DecisionBrief,
  error: unknown,
  synthesizer?: LLMProviderName
): UnifiedBriefFactCheck {
  let judge: LLMProvider = DEFAULT_JUDGE;
  try {
    judge = resolveFactCheckJudgeProvider(synthesizer);
  } catch {
    /* keep default for the error record */
  }
  const message = error instanceof Error ? error.message : "Fact-check failed";
  return failedFactCheckRecord(draft, judge, message, factCheckJudgeModel(judge));
}

/** Exposed for API / logs. */
export function unifiedBriefFactCheckJudgeProvider(synthesizer?: LLMProviderName): LLMProvider {
  return resolveFactCheckJudgeProvider(synthesizer);
}

export function unifiedBriefFactCheckJudgeEnvKey(provider: LLMProvider): string {
  return envKeyFor(provider);
}

/** Test helper: the exact brief text the judge would see. */
export function factCheckJudgeBriefInput(draft: DecisionBrief): string {
  return blindedBriefText(draft);
}
