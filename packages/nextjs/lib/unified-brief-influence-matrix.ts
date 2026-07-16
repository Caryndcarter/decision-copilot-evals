import type { ContributionInfluence, LLMProviderName, UnifiedBriefContributions } from "@/types/decision";
import {
  UNIFIED_BRIEF_SYNTHESIZERS,
  unifiedBriefSynthesizerLabel,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import { runProviderLabel } from "@/lib/run-display-name";

export const INFLUENCE_SCORE: Record<ContributionInfluence, number> = {
  high: 4,
  medium: 3,
  low: 2,
  minimal: 1,
};

export type InfluenceMatrixCell = {
  influence: ContributionInfluence;
  score: number;
};

export type InfluenceMatrix = {
  /** Brief synthesizers that have a contributions analysis (rows). */
  raters: UnifiedBriefSynthesizer[];
  /** Think-tank providers that appear as rated columns. */
  rated: LLMProviderName[];
  /** rater → rated → cell */
  cells: Partial<Record<UnifiedBriefSynthesizer, Partial<Record<LLMProviderName, InfluenceMatrixCell>>>>;
  /** Average score received by each rated provider across all raters that scored them. */
  averageReceived: { provider: LLMProviderName; label: string; average: number; ratingCount: number }[];
};

const PROVIDER_ORDER: LLMProviderName[] = ["anthropic", "openai", "gemini", "xai"];

function coerceInfluence(value: string | undefined): ContributionInfluence | null {
  if (value === "high" || value === "medium" || value === "low" || value === "minimal") return value;
  return null;
}

/**
 * Build a rater×rated influence matrix from per-synthesizer contribution analyses.
 * Rows = Unified Brief authors who ran contributions; columns = think-tank members they scored.
 */
export function buildInfluenceMatrix(
  contributionsByAuthor: Partial<Record<UnifiedBriefSynthesizer, UnifiedBriefContributions>>
): InfluenceMatrix | null {
  const raters = UNIFIED_BRIEF_SYNTHESIZERS.filter((a) => {
    const c = contributionsByAuthor[a];
    return !!c && c.contributions.length > 0;
  });
  if (raters.length === 0) return null;

  const ratedSet = new Set<LLMProviderName>();
  const cells: InfluenceMatrix["cells"] = {};

  for (const rater of raters) {
    const analysis = contributionsByAuthor[rater];
    if (!analysis) continue;
    cells[rater] = {};
    for (const entry of analysis.contributions) {
      const influence = coerceInfluence(entry.influence);
      if (!influence) continue;
      const provider = entry.provider;
      ratedSet.add(provider);
      cells[rater]![provider] = { influence, score: INFLUENCE_SCORE[influence] };
    }
  }

  const rated = PROVIDER_ORDER.filter((p) => ratedSet.has(p));
  // Include any unexpected providers at the end
  for (const p of ratedSet) {
    if (!rated.includes(p)) rated.push(p);
  }

  const averageReceived = rated.map((provider) => {
    let sum = 0;
    let ratingCount = 0;
    for (const rater of raters) {
      const cell = cells[rater]?.[provider];
      if (!cell) continue;
      sum += cell.score;
      ratingCount += 1;
    }
    const average = ratingCount > 0 ? Math.round((sum / ratingCount) * 100) / 100 : 0;
    return {
      provider,
      label: ratedLabel(provider),
      average,
      ratingCount,
    };
  });

  return { raters, rated, cells, averageReceived };
}

export function raterLabel(rater: UnifiedBriefSynthesizer): string {
  return unifiedBriefSynthesizerLabel(rater);
}

export function ratedLabel(provider: LLMProviderName): string {
  if (provider === "openai") return "ChatGPT";
  return runProviderLabel(provider);
}

export function influenceLabel(influence: ContributionInfluence): string {
  if (influence === "high") return "High";
  if (influence === "medium") return "Medium";
  if (influence === "low") return "Low";
  return "Minimal";
}
