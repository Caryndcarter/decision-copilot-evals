import type { DecisionRunResult } from "@/types/decision";

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
 * Which run document stores `decision_brief_best_of_worlds` and unified-brief chat (`unified_brief_chat_by_provider` / legacy `unified_brief_chat_messages`) for a decision.
 * Prefer a row that already holds a unified brief; otherwise the newest run (aligned with My Decisions cards).
 */
export function pickPersistRunForUnifiedBrief(runs: DecisionRunResult[]): DecisionRunResult | null {
  if (!runs.length) return null;
  const withUnified = runs.filter((r) => r.decision_brief_best_of_worlds);
  if (withUnified.length) {
    return withUnified.reduce((best, cur) => (runTimeMs(cur) > runTimeMs(best) ? cur : best));
  }
  return runs.reduce((best, cur) => (runTimeMs(cur) > runTimeMs(best) ? cur : best));
}
