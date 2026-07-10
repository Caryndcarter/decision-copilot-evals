import type {
  DecisionBrief,
  DecisionRunResult,
  LLMProviderName,
  UnifiedBriefContributions,
} from "@/types/decision";

/** Models that can synthesize the Unified Brief (distinct from think-tank member runs). */
export const UNIFIED_BRIEF_SYNTHESIZERS = ["anthropic", "gemini"] as const;

export type UnifiedBriefSynthesizer = (typeof UNIFIED_BRIEF_SYNTHESIZERS)[number];

export function isUnifiedBriefSynthesizer(value: string): value is UnifiedBriefSynthesizer {
  return (UNIFIED_BRIEF_SYNTHESIZERS as readonly string[]).includes(value);
}

export function unifiedBriefSynthesizerLabel(author: UnifiedBriefSynthesizer): string {
  if (author === "gemini") return "Google Gemini";
  return "Anthropic";
}

export function unifiedBriefSynthesizerCoachLabel(author: UnifiedBriefSynthesizer): string {
  if (author === "gemini") return "Google Gemini";
  return "Anthropic Claude";
}

/** Whether this run document stores at least one Unified Brief (legacy or per-author map). */
export function runHasAnyUnifiedBrief(run: DecisionRunResult): boolean {
  if (run.decision_brief_best_of_worlds) return true;
  const map = run.unified_briefs_by_author;
  return !!map && Object.values(map).some(Boolean);
}

/** All Unified Briefs on a run, merging legacy `decision_brief_best_of_worlds` as Anthropic when needed. */
export function getUnifiedBriefsByAuthor(
  run: DecisionRunResult
): Partial<Record<UnifiedBriefSynthesizer, DecisionBrief>> {
  const map: Partial<Record<UnifiedBriefSynthesizer, DecisionBrief>> = {
    ...(run.unified_briefs_by_author ?? {}),
  };
  if (run.decision_brief_best_of_worlds && !map.anthropic) {
    map.anthropic = run.decision_brief_best_of_worlds;
  }
  return map;
}

export function getUnifiedBriefForAuthor(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer
): DecisionBrief | undefined {
  return getUnifiedBriefsByAuthor(run)[author];
}

export function listAvailableUnifiedBriefAuthors(run: DecisionRunResult): UnifiedBriefSynthesizer[] {
  const map = getUnifiedBriefsByAuthor(run);
  return UNIFIED_BRIEF_SYNTHESIZERS.filter((a) => map[a]);
}

export function getUnifiedBriefContributionsByAuthor(
  run: DecisionRunResult
): Partial<Record<UnifiedBriefSynthesizer, UnifiedBriefContributions>> {
  const map: Partial<Record<UnifiedBriefSynthesizer, UnifiedBriefContributions>> = {
    ...(run.unified_brief_contributions_by_author ?? {}),
  };
  if (run.decision_brief_best_of_worlds_contributions && !map.anthropic) {
    map.anthropic = run.decision_brief_best_of_worlds_contributions;
  }
  return map;
}

export function getUnifiedBriefContributionsForAuthor(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer
): UnifiedBriefContributions | undefined {
  return getUnifiedBriefContributionsByAuthor(run)[author];
}

export function mergeUnifiedBriefIntoRun(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer,
  brief: DecisionBrief
): DecisionRunResult {
  const unified_briefs_by_author: Partial<Record<LLMProviderName, DecisionBrief>> = {
    ...getUnifiedBriefsByAuthor(run),
    [author]: brief,
  };
  const next: DecisionRunResult = { ...run, unified_briefs_by_author };
  if (author === "anthropic") {
    next.decision_brief_best_of_worlds = brief;
  }
  return next;
}

export function mergeUnifiedBriefContributionsIntoRun(
  run: DecisionRunResult,
  author: UnifiedBriefSynthesizer,
  contributions: UnifiedBriefContributions
): DecisionRunResult {
  const unified_brief_contributions_by_author: Partial<
    Record<LLMProviderName, UnifiedBriefContributions>
  > = {
    ...getUnifiedBriefContributionsByAuthor(run),
    [author]: contributions,
  };
  const next: DecisionRunResult = { ...run, unified_brief_contributions_by_author };
  if (author === "anthropic") {
    next.decision_brief_best_of_worlds_contributions = contributions;
  }
  return next;
}
