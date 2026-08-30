/**
 * Parse and apply a Unified Brief fact-check judge payload.
 * Client-safe: no LLM calls. The judge lives in `lenses/unified-brief-fact-check.ts`.
 */

import { extractFirstBalancedJsonObject } from "@/lib/extract-json-object";
import type {
  DecisionBrief,
  FactCheckStatus,
  UnifiedBriefFactCheck,
  UnifiedBriefFactCorrection,
} from "@/types/decision";

export const FACT_CHECK_STATUSES: readonly FactCheckStatus[] = [
  "corrected",
  "confirmed",
  "unverified",
  "out_of_scope",
] as const;

export type FactCheckJudgePayload = {
  summary: string;
  corrections: UnifiedBriefFactCorrection[];
  corrected_brief?: DecisionBrief;
};

export function parseJsonObjectFromModelText(text: string): unknown | null {
  if (!text?.trim()) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) s = fence[1].trim();
  const tryParse = (raw: string): unknown | null => {
    try {
      const obj = JSON.parse(raw) as unknown;
      if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
    } catch {
      /* continue */
    }
    return null;
  };
  const direct = tryParse(s);
  if (direct) return direct;
  const balanced = extractFirstBalancedJsonObject(s.includes("{") ? s : text);
  return balanced ? tryParse(balanced) : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseSources(raw: unknown): { title: string; url: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: { title: string; url: string }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const url = asString(o.url || o.uri).trim();
    if (!url) continue;
    out.push({ title: asString(o.title).trim() || url, url });
  }
  return out.length ? out : undefined;
}

function parseStatus(raw: unknown): FactCheckStatus | null {
  const s = asString(raw).trim().toLowerCase();
  return (FACT_CHECK_STATUSES as readonly string[]).includes(s) ? (s as FactCheckStatus) : null;
}

export function parseFactCorrection(raw: unknown): UnifiedBriefFactCorrection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const claim_as_written = asString(o.claim_as_written || o.claim).trim();
  const status = parseStatus(o.status);
  const rationale = asString(o.rationale || o.reason).trim();
  if (!claim_as_written || !status || !rationale) return null;
  const correctedRaw = o.corrected_to ?? o.correction;
  const corrected_to =
    typeof correctedRaw === "string" && correctedRaw.trim() ? correctedRaw.trim() : null;
  const sources = parseSources(o.sources);
  return {
    claim_as_written,
    status,
    ...(corrected_to ? { corrected_to } : {}),
    rationale,
    ...(sources ? { sources } : {}),
  };
}

function parseCustomSections(
  raw: unknown
): { heading: string; content: string }[] | undefined {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const out: { heading: string; content: string }[] = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const heading = asString(o.heading).trim();
    const content = asString(o.content || o.body).trim();
    if (!heading || !content) continue;
    out.push({ heading, content });
  }
  return out.length ? out : undefined;
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
}

export function parseCorrectedBrief(
  raw: unknown,
  fallbackGeneratedAt: string
): DecisionBrief | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const title = asString(o.title).trim();
  const summary = asString(o.summary).trim();
  const recommendation = asString(o.recommendation).trim();
  if (!title || !summary || !recommendation) return undefined;
  const custom_sections = parseCustomSections(o.custom_sections);
  return {
    title,
    generated_at: asString(o.generated_at).trim() || fallbackGeneratedAt,
    summary,
    recommendation,
    key_considerations: parseStringArray(o.key_considerations),
    next_steps: parseStringArray(o.next_steps),
    ...(custom_sections ? { custom_sections } : {}),
  };
}

export function parseFactCheckJudgePayload(
  raw: unknown,
  fallbackGeneratedAt: string
): FactCheckJudgePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const summary = asString(o.summary).trim();
  if (!summary) return null;
  const corrections: UnifiedBriefFactCorrection[] = [];
  if (Array.isArray(o.corrections)) {
    for (const row of o.corrections) {
      const parsed = parseFactCorrection(row);
      if (parsed) corrections.push(parsed);
    }
  }
  const corrected_brief = parseCorrectedBrief(o.corrected_brief, fallbackGeneratedAt);
  return { summary, corrections, ...(corrected_brief ? { corrected_brief } : {}) };
}

export function normalizeComparableText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when the recommendation's lean is still the same (wording may change). */
export function recommendationLeanPreserved(original: string, next: string): boolean {
  const a = normalizeComparableText(original);
  const b = normalizeComparableText(next);
  if (a === b) return true;
  if (!a || !b) return false;
  const tokens = (s: string) => new Set(s.split(" ").filter((w) => w.length > 3));
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0) return a === b;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / ta.size >= 0.7;
}

function replaceInText(text: string, from: string, to: string): string {
  if (!from || from === to) return text;
  if (!text.includes(from)) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return text.replace(re, to);
  }
  return text.split(from).join(to);
}

function mapBriefText(brief: DecisionBrief, fn: (text: string) => string): DecisionBrief {
  return {
    ...brief,
    title: fn(brief.title),
    summary: fn(brief.summary),
    recommendation: fn(brief.recommendation),
    key_considerations: brief.key_considerations.map(fn),
    next_steps: brief.next_steps.map(fn),
    ...(brief.custom_sections?.length
      ? {
          custom_sections: brief.custom_sections.map((s) => ({
            heading: fn(s.heading),
            content: fn(s.content),
          })),
        }
      : {}),
  };
}

export function factualCorrections(corrections: UnifiedBriefFactCorrection[]): UnifiedBriefFactCorrection[] {
  return corrections.filter(
    (c) => c.status === "corrected" && typeof c.corrected_to === "string" && c.corrected_to.trim()
  );
}

/** Apply only `corrected` replacements to the draft. Does not re-synthesize. */
export function applyFactCorrectionsToBrief(
  draft: DecisionBrief,
  corrections: UnifiedBriefFactCorrection[]
): DecisionBrief {
  let next = { ...draft };
  for (const c of factualCorrections(corrections)) {
    const to = c.corrected_to!.trim();
    next = mapBriefText(next, (text) => replaceInText(text, c.claim_as_written, to));
  }
  if (!recommendationLeanPreserved(draft.recommendation, next.recommendation)) {
    next.recommendation = draft.recommendation;
  }
  next.generated_at = draft.generated_at;
  next.authorship_provider_remap = draft.authorship_provider_remap;
  return next;
}

export function briefSubstanceEqual(a: DecisionBrief, b: DecisionBrief): boolean {
  const pack = (x: DecisionBrief) =>
    JSON.stringify({
      title: normalizeComparableText(x.title),
      summary: normalizeComparableText(x.summary),
      recommendation: normalizeComparableText(x.recommendation),
      key_considerations: x.key_considerations.map(normalizeComparableText),
      next_steps: x.next_steps.map(normalizeComparableText),
      custom_sections: (x.custom_sections ?? []).map((s) => ({
        heading: normalizeComparableText(s.heading),
        content: normalizeComparableText(s.content),
      })),
    });
  return pack(a) === pack(b);
}

/**
 * Prefer the judge's `corrected_brief` when it obeys the constrained-rewrite rules;
 * otherwise apply a thin string-replacement rewrite from the draft.
 */
export function resolveFactCheckedBrief(
  draft: DecisionBrief,
  payload: FactCheckJudgePayload
): DecisionBrief {
  const edits = factualCorrections(payload.corrections);
  if (edits.length === 0) {
    return {
      ...draft,
      authorship_provider_remap: draft.authorship_provider_remap,
    };
  }

  const candidate = payload.corrected_brief;
  if (
    candidate &&
    recommendationLeanPreserved(draft.recommendation, candidate.recommendation) &&
    candidate.summary.trim() &&
    candidate.key_considerations.length > 0 &&
    candidate.next_steps.length > 0
  ) {
    return {
      ...candidate,
      generated_at: draft.generated_at,
      authorship_provider_remap: draft.authorship_provider_remap,
    };
  }

  return applyFactCorrectionsToBrief(draft, payload.corrections);
}

export function emptyCorrectionsSummary(): string {
  return "No factual corrections.";
}

export function failedFactCheckRecord(
  draft: DecisionBrief,
  judge_provider: UnifiedBriefFactCheck["judge_provider"],
  error: string,
  judge_model?: string
): UnifiedBriefFactCheck {
  return {
    generated_at: new Date().toISOString(),
    judge_provider,
    ...(judge_model ? { judge_model } : {}),
    summary: `Fact-check did not finish: ${error}`,
    corrections: [],
    draft_brief: draft,
    error,
  };
}
