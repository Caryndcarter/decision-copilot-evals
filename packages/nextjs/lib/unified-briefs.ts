import { runProviderLabel } from "@/lib/run-display-name";
import type {
  DecisionBrief,
  DecisionRunResult,
  LLMProviderName,
  UnifiedBriefAuthorshipMode,
  UnifiedBriefAuthorshipVersions,
  UnifiedBriefContributions,
} from "@/types/decision";

/** Models that can synthesize the Unified Brief (distinct from think-tank member runs). */
export const UNIFIED_BRIEF_SYNTHESIZERS = ["anthropic", "openai", "gemini", "xai"] as const;

export type UnifiedBriefSynthesizer = (typeof UNIFIED_BRIEF_SYNTHESIZERS)[number];

export type { UnifiedBriefAuthorshipMode };

export function isUnifiedBriefSynthesizer(value: string): value is UnifiedBriefSynthesizer {
  return (UNIFIED_BRIEF_SYNTHESIZERS as readonly string[]).includes(value);
}

export function authorshipModeFromFlags(
  blind: boolean,
  reassigned = false
): UnifiedBriefAuthorshipMode {
  if (reassigned) return "reassigned";
  if (blind) return "blind";
  return "open";
}

/** @deprecated Prefer authorshipModeFromFlags */
export function authorshipModeFromBlind(blind: boolean): UnifiedBriefAuthorshipMode {
  return authorshipModeFromFlags(blind, false);
}

export function unifiedBriefSynthesizerLabel(author: UnifiedBriefSynthesizer): string {
  if (author === "openai") return "ChatGPT";
  return runProviderLabel(author);
}

export function unifiedBriefSynthesizerCoachLabel(author: UnifiedBriefSynthesizer): string {
  if (author === "anthropic") return "Anthropic Claude";
  if (author === "openai") return "ChatGPT (OpenAI)";
  if (author === "gemini") return "Google Gemini";
  return "xAI";
}

function looksLikeDecisionBrief(value: unknown): value is DecisionBrief {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.title === "string" && typeof o.summary === "string";
}

function looksLikeContributions(value: unknown): value is UnifiedBriefContributions {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return Array.isArray(o.contributions) || typeof o.overall === "string";
}

/** Normalize a stored brief slot (legacy flat brief or `{ open, blind, reassigned }`) to version map. */
export function normalizeBriefAuthorshipSlot(
  slot: unknown
): UnifiedBriefAuthorshipVersions<DecisionBrief> {
  if (!slot || typeof slot !== "object") return {};
  if (looksLikeDecisionBrief(slot)) return { open: slot };
  const o = slot as Record<string, unknown>;
  const out: UnifiedBriefAuthorshipVersions<DecisionBrief> = {};
  if (looksLikeDecisionBrief(o.open)) out.open = o.open;
  if (looksLikeDecisionBrief(o.blind)) out.blind = o.blind;
  if (looksLikeDecisionBrief(o.reassigned)) out.reassigned = o.reassigned;
  return out;
}

/** Normalize a stored contributions slot (legacy flat or versioned) to version map. */
export function normalizeContributionsAuthorshipSlot(
  slot: unknown
): UnifiedBriefAuthorshipVersions<UnifiedBriefContributions> {
  if (!slot || typeof slot !== "object") return {};
  if (looksLikeContributions(slot)) return { open: slot };
  const o = slot as Record<string, unknown>;
  const out: UnifiedBriefAuthorshipVersions<UnifiedBriefContributions> = {};
  if (looksLikeContributions(o.open)) out.open = o.open;
  if (looksLikeContributions(o.blind)) out.blind = o.blind;
  if (looksLikeContributions(o.reassigned)) out.reassigned = o.reassigned;
  return out;
}

function slotHasAnyBrief(slot: unknown): boolean {
  const versions = normalizeBriefAuthorshipSlot(slot);
  return !!(versions.open || versions.blind || versions.reassigned);
}

/** Whether this run document stores at least one Unified Brief (legacy or per-author map). */
export function runHasAnyUnifiedBrief(run: DecisionRunResult): boolean {
  if (run.decision_brief_best_of_worlds) return true;
  const map = run.unified_briefs_by_author;
  if (!map) return false;
  return Object.values(map).some(slotHasAnyBrief);
}

/**
 * All Unified Briefs for one authorship mode, merging legacy Anthropic field as `open` when needed.
 */
export function getUnifiedBriefsByAuthor(
  run: DecisionRunResult,
  mode: UnifiedBriefAuthorshipMode = "open"
): Partial<Record<UnifiedBriefSynthesizer, DecisionBrief>> {
  const out: Partial<Record<UnifiedBriefSynthesizer, DecisionBrief>> = {};
  for (const author of UNIFIED_BRIEF_SYNTHESIZERS) {
    const versions = normalizeBriefAuthorshipSlot(run.unified_briefs_by_author?.[author]);
    if (versions[mode]) out[author] = versions[mode];
  }
  if (mode === "open" && run.decision_brief_best_of_worlds && !out.anthropic) {
    out.anthropic = run.decision_brief_best_of_worlds;
  }
  return out;
}

export function getUnifiedBriefForAuthor(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode = "open"
): DecisionBrief | undefined {
  return getUnifiedBriefsByAuthor(run, mode)[author];
}

/** Authors that have a brief in the given mode (default: any mode). */
export function listAvailableUnifiedBriefAuthors(
  run: DecisionRunResult,
  mode?: UnifiedBriefAuthorshipMode
): UnifiedBriefSynthesizer[] {
  if (mode) {
    const map = getUnifiedBriefsByAuthor(run, mode);
    return UNIFIED_BRIEF_SYNTHESIZERS.filter((a) => map[a]);
  }
  return UNIFIED_BRIEF_SYNTHESIZERS.filter((author) => {
    if (getUnifiedBriefForAuthor(run, author, "open")) return true;
    if (getUnifiedBriefForAuthor(run, author, "blind")) return true;
    if (getUnifiedBriefForAuthor(run, author, "reassigned")) return true;
    return false;
  });
}

export function getUnifiedBriefContributionsByAuthor(
  run: DecisionRunResult,
  mode: UnifiedBriefAuthorshipMode = "open"
): Partial<Record<UnifiedBriefSynthesizer, UnifiedBriefContributions>> {
  const out: Partial<Record<UnifiedBriefSynthesizer, UnifiedBriefContributions>> = {};
  for (const author of UNIFIED_BRIEF_SYNTHESIZERS) {
    const versions = normalizeContributionsAuthorshipSlot(
      run.unified_brief_contributions_by_author?.[author]
    );
    if (versions[mode]) out[author] = versions[mode];
  }
  if (mode === "open" && run.decision_brief_best_of_worlds_contributions && !out.anthropic) {
    out.anthropic = run.decision_brief_best_of_worlds_contributions;
  }
  return out;
}

export function getUnifiedBriefContributionsForAuthor(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode = "open"
): UnifiedBriefContributions | undefined {
  return getUnifiedBriefContributionsByAuthor(run, mode)[author];
}

export function mergeUnifiedBriefIntoRun(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer,
  brief: DecisionBrief,
  mode: UnifiedBriefAuthorshipMode = "open"
): DecisionRunResult {
  const prevVersions = normalizeBriefAuthorshipSlot(run.unified_briefs_by_author?.[author]);
  const versions: UnifiedBriefAuthorshipVersions<DecisionBrief> = {
    ...prevVersions,
    [mode]: brief,
  };

  const unified_briefs_by_author: NonNullable<DecisionRunResult["unified_briefs_by_author"]> = {
    ...(run.unified_briefs_by_author ?? {}),
    [author]: versions,
  };
  const next: DecisionRunResult = { ...run, unified_briefs_by_author };
  if (author === "anthropic" && mode === "open") {
    next.decision_brief_best_of_worlds = brief;
  }
  return next;
}

export function mergeUnifiedBriefContributionsIntoRun(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer,
  contributions: UnifiedBriefContributions,
  mode: UnifiedBriefAuthorshipMode = "open"
): DecisionRunResult {
  const prevVersions = normalizeContributionsAuthorshipSlot(
    run.unified_brief_contributions_by_author?.[author]
  );
  const versions: UnifiedBriefAuthorshipVersions<UnifiedBriefContributions> = {
    ...prevVersions,
    [mode]: contributions,
  };

  const unified_brief_contributions_by_author: NonNullable<
    DecisionRunResult["unified_brief_contributions_by_author"]
  > = {
    ...(run.unified_brief_contributions_by_author ?? {}),
    [author]: versions,
  };
  const next: DecisionRunResult = { ...run, unified_brief_contributions_by_author };
  if (author === "anthropic" && mode === "open") {
    next.decision_brief_best_of_worlds_contributions = contributions;
  }
  return next;
}
