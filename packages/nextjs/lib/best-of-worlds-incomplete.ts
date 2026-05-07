import type { DecisionRunResult } from "@/types/decision";
import { runPostureLabel, runProviderLabel } from "@/lib/run-display-name";
import { runHasMergeableFinalAnalysis } from "@/lib/unified-brief-eligibility";

export type IncompleteRunInfo = { run_id: string; label: string; status: string };

type RunWithTimestamps = DecisionRunResult & { updatedAt?: string | Date; createdAt?: string | Date };

function runSortTimeMs(r: DecisionRunResult): number {
  const ext = r as RunWithTimestamps;
  const parse = (x: string | Date | undefined): number => {
    if (!x) return 0;
    if (typeof x === "string") return Date.parse(x) || 0;
    return x.getTime();
  };
  return Math.max(parse(ext.updatedAt), parse(ext.createdAt), 0);
}

/**
 * Prefer the run that best represents “current” work for this provider/posture/leaning.
 * Uses a real `decision_brief` (non-stub) as a strong signal even when `status` is stale — e.g. legacy rows,
 * admin views, or rare persistence skew — so abandoned `awaiting_clarification` intakes do not beat finished runs.
 */
function normStatus(r: DecisionRunResult): string {
  return String(r.status ?? "").trim().toLowerCase();
}

function readinessScore(r: DecisionRunResult): number {
  if (runHasMergeableFinalAnalysis(r)) {
    const status = normStatus(r);
    if (status === "complete") return 100;
    if (status === "pending_brief") return 80;
    return 76;
  }
  const status = normStatus(r);
  if (status === "processing_clarification") return 55;
  if (status === "awaiting_clarification") return 20;
  return 10;
}

/** Normalize posture/provider so Mongo casing drift does not split duplicate groups. */
function normPostureKey(r: DecisionRunResult): string {
  return String(r.intake?.posture ?? "explore").trim().toLowerCase();
}

function normProviderKey(r: DecisionRunResult): string {
  return String(r.llm_provider ?? "openai").trim().toLowerCase();
}

/** One key per distinct analysis line (same as posture switcher / merge semantics). */
function unifiedBriefRunDedupeKey(r: DecisionRunResult): string {
  const p = normProviderKey(r);
  const posture = normPostureKey(r);
  const lean = (r.intake?.leaning_direction ?? "").trim();
  return `${p}\0${posture}\0${lean}`;
}

/**
 * Collapse duplicate decision lines (e.g. multiple “all providers” intakes or abandoned runs) to one canonical run
 * per provider + posture + leaning. Picks the most advanced readiness (status + published brief), then newest
 * `updatedAt`/`createdAt`, then `run_id`.
 */
export function canonicalRunsForUnifiedBriefDecision(runs: DecisionRunResult[]): DecisionRunResult[] {
  const byKey = new Map<string, DecisionRunResult[]>();
  for (const r of runs) {
    const key = unifiedBriefRunDedupeKey(r);
    const arr = byKey.get(key) ?? [];
    arr.push(r);
    byKey.set(key, arr);
  }
  const out: DecisionRunResult[] = [];
  for (const group of byKey.values()) {
    out.push(
      group.reduce((best, cur) => {
        const sb = readinessScore(best);
        const sc = readinessScore(cur);
        if (sc !== sb) return sc > sb ? cur : best;
        const tb = runSortTimeMs(best);
        const tc = runSortTimeMs(cur);
        if (tc !== tb) return tc > tb ? cur : best;
        return cur.run_id > best.run_id ? cur : best;
      })
    );
  }
  return out;
}

/**
 * Runs that are not merge-final for warnings — evaluated on canonical runs only (every posture × provider lane).
 * Omits lines that are merge-ready (`runHasMergeableFinalAnalysis`), including odd DB rows with stale `status`.
 */
export function listIncompleteRunsForBestOfWorlds(runs: DecisionRunResult[]): IncompleteRunInfo[] {
  const rows = canonicalRunsForUnifiedBriefDecision(runs);
  return rows
    .filter((r) => !runHasMergeableFinalAnalysis(r))
    .map((r) => ({
      run_id: r.run_id,
      label: `${runProviderLabel(r.llm_provider)} · ${runPostureLabel(r.intake?.posture ?? "explore")}`,
      status: r.status,
    }));
}
