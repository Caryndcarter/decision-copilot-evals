import type { DecisionBrief, DecisionRunResult } from "@/types/decision";
import {
  getUnifiedBriefFactCheckForAuthor,
  getUnifiedBriefForAuthor,
  mergeUnifiedBriefFactCheckIntoRun,
  mergeUnifiedBriefIntoRun,
  mergeUnifiedBriefContributionsIntoRun,
  normalizeBriefAuthorshipSlot,
  normalizeContributionsAuthorshipSlot,
  normalizeFactCheckAuthorshipSlot,
  runHasAnyUnifiedBrief,
  UNIFIED_BRIEF_SYNTHESIZERS,
  type UnifiedBriefAuthorshipMode,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";

function runTimeMs(r: DecisionRunResult): number {
  const ext = r as { createdAt?: string | Date; updatedAt?: string | Date };
  const parse = (x: string | Date | undefined): number => {
    if (!x) return 0;
    if (typeof x === "string") return Date.parse(x) || 0;
    return x.getTime();
  };
  return Math.max(parse(ext.createdAt), parse(ext.updatedAt), 0);
}

/**
 * Which run document stores unified briefs and unified-brief chat (`unified_brief_chat_by_provider` / legacy `unified_brief_chat_messages`) for a decision.
 * Prefer a row that already holds a unified brief; otherwise the newest run (aligned with My Decisions cards).
 */
export function pickPersistRunForUnifiedBrief(runs: DecisionRunResult[]): DecisionRunResult | null {
  if (!runs.length) return null;
  const withUnified = runs.filter(runHasAnyUnifiedBrief);
  if (withUnified.length) {
    return withUnified.reduce((best, cur) => (runTimeMs(cur) > runTimeMs(best) ? cur : best));
  }
  return runs.reduce((best, cur) => (runTimeMs(cur) > runTimeMs(best) ? cur : best));
}

const AUTHORSHIP_MODES: UnifiedBriefAuthorshipMode[] = ["open", "blind", "reassigned"];

/**
 * Copy any authorship-mode briefs/contributions that exist on sibling runs onto `target`
 * without overwriting slots already present on `target`. Heals split/lost-update drift.
 */
export function consolidateUnifiedAuthorshipOntoRun(
  target: DecisionRunResult,
  sources: DecisionRunResult[]
): DecisionRunResult {
  let next = target;
  for (const src of sources) {
    if (src.run_id === target.run_id) continue;
    for (const author of UNIFIED_BRIEF_SYNTHESIZERS) {
      const briefVersions = normalizeBriefAuthorshipSlot(src.unified_briefs_by_author?.[author]);
      for (const mode of AUTHORSHIP_MODES) {
        const incoming = briefVersions[mode];
        if (incoming && !getUnifiedBriefForAuthor(next, author, mode)) {
          next = mergeUnifiedBriefIntoRun(next, author, incoming, mode);
        }
      }
      const contribVersions = normalizeContributionsAuthorshipSlot(
        src.unified_brief_contributions_by_author?.[author]
      );
      for (const mode of AUTHORSHIP_MODES) {
        const incoming = contribVersions[mode];
        if (!incoming) continue;
        const existing = normalizeContributionsAuthorshipSlot(
          next.unified_brief_contributions_by_author?.[author]
        );
        if (!existing[mode]) {
          next = mergeUnifiedBriefContributionsIntoRun(next, author, incoming, mode);
        }
      }
      const factVersions = normalizeFactCheckAuthorshipSlot(
        src.unified_brief_fact_checks_by_author?.[author]
      );
      for (const mode of AUTHORSHIP_MODES) {
        const incoming = factVersions[mode];
        if (incoming && !getUnifiedBriefFactCheckForAuthor(next, author, mode)) {
          next = mergeUnifiedBriefFactCheckIntoRun(next, author, incoming, mode);
        }
      }
    }
  }
  return next;
}

/** Find a synthesizer+mode brief on the preferred persist run, then any sibling run. */
export function findUnifiedBriefAcrossRuns(
  runs: DecisionRunResult[],
  author: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode
): { brief: DecisionBrief; run: DecisionRunResult } | null {
  const preferred = pickPersistRunForUnifiedBrief(runs);
  const ordered = preferred
    ? [preferred, ...runs.filter((r) => r.run_id !== preferred.run_id)]
    : runs;
  for (const run of ordered) {
    const brief = getUnifiedBriefForAuthor(run, author, mode);
    if (brief) return { brief, run };
  }
  return null;
}
