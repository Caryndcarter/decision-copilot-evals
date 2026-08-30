/**
 * Aggregate multi-demo authorship harness batches for the summary UI.
 */

import { DEMO_HARNESS_CASES } from "@/lib/demo-harness-cases";
import {
  authorshipBatchKindLabel,
  isAuthorshipBudgetConditionsControlBatch,
  isAuthorshipBudgetConditionsConstrainedBatch,
  isAuthorshipInfluenceIncludeBatch,
  shortHarnessBatchId,
} from "@/lib/harness-meta";
import { runProviderLabel } from "@/lib/run-display-name";
import {
  buildInfluenceMatrix,
  INFLUENCE_SCORE,
  type InfluenceMatrix,
} from "@/lib/unified-brief-influence-matrix";
import {
  UNIFIED_BRIEF_AUDIT_DIMENSIONS,
  type UnifiedBriefAuditDimension,
} from "@/lib/unified-brief-audit/rubric";
import {
  getUnifiedBriefAuditForAuthor,
  getUnifiedBriefContributionsByAuthor,
  getUnifiedBriefsByAuthor,
  UNIFIED_BRIEF_AUTHORSHIP_MODE_DISPLAY_ORDER,
  UNIFIED_BRIEF_AUTHORSHIP_MODE_LABELS,
  UNIFIED_BRIEF_SYNTHESIZERS,
  unifiedBriefSynthesizerLabel,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import {
  consolidateUnifiedAuthorshipOntoRun,
  pickPersistRunForUnifiedBrief,
} from "@/lib/unified-brief-persist-run";
import type {
  ContributionInfluence,
  DecisionRunResult,
  DemoScenarioId,
  HarnessKind,
  LLMProviderName,
  UnifiedBriefAuthorshipMode,
} from "@/types/decision";

export const AUTHORSHIP_SUMMARY_MODES: UnifiedBriefAuthorshipMode[] = [
  ...UNIFIED_BRIEF_AUTHORSHIP_MODE_DISPLAY_ORDER,
];

const MODE_BADGE: Record<UnifiedBriefAuthorshipMode, string> = {
  ...UNIFIED_BRIEF_AUTHORSHIP_MODE_LABELS,
};

const PROVIDER_ORDER: LLMProviderName[] = ["anthropic", "openai", "gemini", "xai"];

export type AuthorshipModeCoverage = {
  briefs: number;
  contributions: number;
  audits: number;
};

export type AuthorshipMoralCell = {
  synthesizer: UnifiedBriefSynthesizer;
  mode: UnifiedBriefAuthorshipMode;
  values: Partial<Record<UnifiedBriefAuditDimension, string>>;
  quotes: Partial<Record<UnifiedBriefAuditDimension, string>>;
};

/** One branding credit move from contribution heatmaps (open↔blind / open↔reassigned). */
export type AuthorshipInfluenceShift = {
  badge: string;
  title: string;
  severity: number;
  demo_label: string;
  decision_id: string;
  from_mode: UnifiedBriefAuthorshipMode;
  to_mode: UnifiedBriefAuthorshipMode;
  rater: UnifiedBriefSynthesizer;
  rated: LLMProviderName;
  delta: number;
};

export type AuthorshipRollupCell = {
  mean: number;
  n: number;
  influence: ContributionInfluence;
};

/** Mean rater×rated influence across demos for one authorship mode. */
export type AuthorshipRollupMatrix = {
  mode: UnifiedBriefAuthorshipMode;
  raters: UnifiedBriefSynthesizer[];
  rated: LLMProviderName[];
  cells: Partial<
    Record<UnifiedBriefSynthesizer, Partial<Record<LLMProviderName, AuthorshipRollupCell>>>
  >;
  case_count: number;
};

export type AuthorshipDemoSummary = {
  demo_id: DemoScenarioId | string;
  demo_label: string;
  decision_id: string;
  harness_trial?: number;
  modes: Record<UnifiedBriefAuthorshipMode, AuthorshipModeCoverage>;
  influence_shift_count: number;
  top_shifts: AuthorshipInfluenceShift[];
  moral_cells: AuthorshipMoralCell[];
  audit_count: number;
};

export type AuthorshipBatchSummary = {
  batch_id: string;
  batch_short: string;
  harness_run_number?: number;
  harness_kind: HarnessKind;
  kind_label: string;
  started_at?: string;
  decision_count: number;
  demos: AuthorshipDemoSummary[];
  total_briefs: number;
  total_contributions: number;
  total_audits: number;
  expected_briefs: number;
  cross_case_shifts: AuthorshipInfluenceShift[];
  total_influence_shifts: number;
  /** Mean heatmaps across cases (Blind / Revealed / Reassigned). */
  rollup_matrices: AuthorshipRollupMatrix[];
  /** Present when this batch is the constrained-tokens or Sol control cut. */
  budget_condition?: "constrained" | "adequate";
};

/** Whether a run belongs in the authorship findings rollup (does not rewrite stored kind). */
export function runQualifiesForAuthorshipSummary(run: {
  harness_run?: boolean;
  harness_kind?: HarnessKind;
  harness_batch_id?: string;
  demo_scenario_id?: string;
}): boolean {
  if (!run.harness_run) return false;
  if (run.harness_kind === "multi-demo-authorship") return true;
  if (isAuthorshipInfluenceIncludeBatch(run.harness_batch_id)) return true;
  return (
    !run.harness_kind &&
    !!run.demo_scenario_id &&
    DEMO_HARNESS_CASES.some((c) => c.id === run.demo_scenario_id)
  );
}

function demoLabel(id: string): string {
  return DEMO_HARNESS_CASES.find((c) => c.id === id)?.label ?? id;
}

function scoreToInfluence(score: number): ContributionInfluence {
  if (score >= 3.5) return "high";
  if (score >= 2.5) return "medium";
  if (score >= 1.5) return "low";
  return "minimal";
}

function countModeCoverage(persistRun: DecisionRunResult | null): Record<
  UnifiedBriefAuthorshipMode,
  AuthorshipModeCoverage
> {
  const out = {
    open: { briefs: 0, contributions: 0, audits: 0 },
    blind: { briefs: 0, contributions: 0, audits: 0 },
    reassigned: { briefs: 0, contributions: 0, audits: 0 },
  } satisfies Record<UnifiedBriefAuthorshipMode, AuthorshipModeCoverage>;
  if (!persistRun) return out;
  for (const mode of AUTHORSHIP_SUMMARY_MODES) {
    const briefs = getUnifiedBriefsByAuthor(persistRun, mode);
    const contribs = getUnifiedBriefContributionsByAuthor(persistRun, mode);
    out[mode] = {
      briefs: UNIFIED_BRIEF_SYNTHESIZERS.filter((a) => briefs[a]).length,
      contributions: UNIFIED_BRIEF_SYNTHESIZERS.filter((a) => contribs[a]).length,
      audits: UNIFIED_BRIEF_SYNTHESIZERS.filter((a) =>
        getUnifiedBriefAuditForAuthor(persistRun, a, mode)
      ).length,
    };
  }
  return out;
}

function collectMoralCells(persistRun: DecisionRunResult | null): AuthorshipMoralCell[] {
  if (!persistRun) return [];
  const cells: AuthorshipMoralCell[] = [];
  for (const synthesizer of UNIFIED_BRIEF_SYNTHESIZERS) {
    for (const mode of AUTHORSHIP_SUMMARY_MODES) {
      const audit = getUnifiedBriefAuditForAuthor(persistRun, synthesizer, mode);
      if (!audit?.codes) continue;
      const values: Partial<Record<UnifiedBriefAuditDimension, string>> = {};
      const quotes: Partial<Record<UnifiedBriefAuditDimension, string>> = {};
      for (const dim of UNIFIED_BRIEF_AUDIT_DIMENSIONS) {
        const field = audit.codes[dim];
        if (field?.value) values[dim] = field.value;
        if (field?.quote?.trim()) quotes[dim] = field.quote.trim();
      }
      cells.push({ synthesizer, mode, values, quotes });
    }
  }
  return cells;
}

function matricesByMode(persistRun: DecisionRunResult | null): Record<
  UnifiedBriefAuthorshipMode,
  InfluenceMatrix | null
> {
  if (!persistRun) return { open: null, blind: null, reassigned: null };
  return {
    open: buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, "open")),
    blind: buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, "blind")),
    reassigned: buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, "reassigned")),
  };
}

function signedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function influenceShiftsForDemo(
  persistRun: DecisionRunResult | null,
  meta: { demo_label: string; decision_id: string }
): AuthorshipInfluenceShift[] {
  const matrices = matricesByMode(persistRun);
  const shifts: AuthorshipInfluenceShift[] = [];
  const pairs: Array<[UnifiedBriefAuthorshipMode, UnifiedBriefAuthorshipMode]> = [
    ["blind", "open"],
    ["blind", "reassigned"],
  ];
  for (const [fromMode, toMode] of pairs) {
    const from = matrices[fromMode];
    const to = matrices[toMode];
    if (!from || !to) continue;
    for (const rater of from.raters) {
      for (const rated of from.rated) {
        const a = from.cells[rater]?.[rated];
        const b = to.cells[rater as UnifiedBriefSynthesizer]?.[rated as LLMProviderName];
        if (!a || !b) continue;
        const delta = b.score - a.score;
        if (Math.abs(delta) < 1) continue;
        shifts.push({
          badge: `${MODE_BADGE[fromMode]} → ${MODE_BADGE[toMode]}`,
          title: `${runProviderLabel(rated)} ${signedDelta(delta)} when ${unifiedBriefSynthesizerLabel(rater)} rates (was ${a.influence}, now ${b.influence})`,
          severity: Math.abs(delta),
          demo_label: meta.demo_label,
          decision_id: meta.decision_id,
          from_mode: fromMode,
          to_mode: toMode,
          rater,
          rated,
          delta,
        });
      }
    }
  }
  shifts.sort((x, y) => y.severity - x.severity || x.title.localeCompare(y.title));
  return shifts;
}

type AccCell = { sum: number; n: number };
type ModeAcc = Map<string, AccCell>; // `${rater}|${rated}`

function accumulateMatrix(acc: ModeAcc, matrix: InfluenceMatrix | null) {
  if (!matrix) return;
  for (const rater of matrix.raters) {
    for (const rated of matrix.rated) {
      const cell = matrix.cells[rater]?.[rated];
      if (!cell) continue;
      const key = `${rater}|${rated}`;
      const cur = acc.get(key) ?? { sum: 0, n: 0 };
      cur.sum += cell.score;
      cur.n += 1;
      acc.set(key, cur);
    }
  }
}

function finalizeRollup(
  mode: UnifiedBriefAuthorshipMode,
  acc: ModeAcc,
  caseCount: number
): AuthorshipRollupMatrix | null {
  if (acc.size === 0 || caseCount === 0) return null;
  const raterSet = new Set<UnifiedBriefSynthesizer>();
  const ratedSet = new Set<LLMProviderName>();
  const cells: AuthorshipRollupMatrix["cells"] = {};

  for (const [key, { sum, n }] of acc) {
    const [rater, rated] = key.split("|") as [UnifiedBriefSynthesizer, LLMProviderName];
    raterSet.add(rater);
    ratedSet.add(rated);
    const mean = Math.round((sum / n) * 100) / 100;
    if (!cells[rater]) cells[rater] = {};
    cells[rater]![rated] = {
      mean,
      n,
      influence: scoreToInfluence(mean),
    };
  }

  const raters = UNIFIED_BRIEF_SYNTHESIZERS.filter((r) => raterSet.has(r));
  const rated = PROVIDER_ORDER.filter((p) => ratedSet.has(p));
  for (const p of ratedSet) {
    if (!rated.includes(p)) rated.push(p);
  }

  return { mode, raters, rated, cells, case_count: caseCount };
}

function activityIso(run: DecisionRunResult & { createdAt?: string; updatedAt?: string }): string | undefined {
  return (
    (typeof run.updatedAt === "string" && run.updatedAt) ||
    (typeof run.createdAt === "string" && run.createdAt) ||
    undefined
  );
}

/**
 * Group the user's runs into multi-demo authorship batches (newest first).
 */
export function buildAuthorshipBatchSummaries(
  runs: DecisionRunResult[]
): AuthorshipBatchSummary[] {
  type Bag = {
    batchKey: string;
    batch_id: string;
    harness_run_number?: number;
    harness_kind: HarnessKind;
    started_at?: string;
    byDecision: Map<string, DecisionRunResult[]>;
  };

  const bags = new Map<string, Bag>();

  for (const run of runs) {
    if (!runQualifiesForAuthorshipSummary(run)) continue;
    const kind = run.harness_kind;

    const batchKey =
      run.harness_batch_id?.trim() ||
      (typeof run.harness_run_number === "number"
        ? `run-number:${run.harness_run_number}`
        : `decision:${run.decision_id}`);

    let bag = bags.get(batchKey);
    if (!bag) {
      bag = {
        batchKey,
        batch_id: run.harness_batch_id?.trim() || batchKey,
        harness_run_number: run.harness_run_number,
        harness_kind: kind ?? "multi-demo-authorship",
        started_at: activityIso(run as DecisionRunResult & { createdAt?: string; updatedAt?: string }),
        byDecision: new Map(),
      };
      bags.set(batchKey, bag);
    }
    if (typeof run.harness_run_number === "number") {
      bag.harness_run_number = run.harness_run_number;
    }
    if (kind) bag.harness_kind = kind;
    if (run.harness_batch_id?.trim()) bag.batch_id = run.harness_batch_id.trim();
    const iso = activityIso(run as DecisionRunResult & { createdAt?: string; updatedAt?: string });
    if (iso && (!bag.started_at || iso < bag.started_at)) bag.started_at = iso;

    const list = bag.byDecision.get(run.decision_id) ?? [];
    list.push(run);
    bag.byDecision.set(run.decision_id, list);
  }

  const synthesizerCount = UNIFIED_BRIEF_SYNTHESIZERS.length;
  const expectedPerDemo = synthesizerCount * AUTHORSHIP_SUMMARY_MODES.length;

  const summaries: AuthorshipBatchSummary[] = [];
  for (const bag of bags.values()) {
    const demos: AuthorshipDemoSummary[] = [];
    let total_briefs = 0;
    let total_contributions = 0;
    let total_audits = 0;
    const cross_case_shifts: AuthorshipInfluenceShift[] = [];
    const rollupAcc: Record<UnifiedBriefAuthorshipMode, ModeAcc> = {
      open: new Map(),
      blind: new Map(),
      reassigned: new Map(),
    };
    const rollupCaseCount: Record<UnifiedBriefAuthorshipMode, number> = {
      open: 0,
      blind: 0,
      reassigned: 0,
    };

    for (const [decision_id, decisionRuns] of bag.byDecision) {
      const picked = pickPersistRunForUnifiedBrief(decisionRuns);
      const persist = picked
        ? consolidateUnifiedAuthorshipOntoRun(picked, decisionRuns)
        : null;
      const primary = persist ?? decisionRuns[0]!;
      const label = demoLabel(primary.demo_scenario_id ?? decision_id);
      const modes = countModeCoverage(persist);
      const mats = matricesByMode(persist);
      const allShifts = influenceShiftsForDemo(persist, {
        demo_label: label,
        decision_id,
      });
      const moral_cells = collectMoralCells(persist);
      for (const mode of AUTHORSHIP_SUMMARY_MODES) {
        total_briefs += modes[mode].briefs;
        total_contributions += modes[mode].contributions;
        total_audits += modes[mode].audits;
        if (mats[mode]) {
          accumulateMatrix(rollupAcc[mode], mats[mode]);
          rollupCaseCount[mode] += 1;
        }
      }
      cross_case_shifts.push(...allShifts);
      demos.push({
        demo_id: primary.demo_scenario_id ?? decision_id,
        demo_label: label,
        decision_id,
        harness_trial: primary.harness_trial,
        modes,
        influence_shift_count: allShifts.length,
        top_shifts: allShifts.slice(0, 8),
        moral_cells,
        audit_count: moral_cells.length,
      });
    }

    demos.sort((a, b) => (a.harness_trial ?? 99) - (b.harness_trial ?? 99));
    cross_case_shifts.sort(
      (a, b) => b.severity - a.severity || a.demo_label.localeCompare(b.demo_label)
    );

    const rollup_matrices = AUTHORSHIP_SUMMARY_MODES.map((mode) =>
      finalizeRollup(mode, rollupAcc[mode], rollupCaseCount[mode])
    ).filter((m): m is AuthorshipRollupMatrix => m != null);

    summaries.push({
      batch_id: bag.batch_id,
      batch_short: shortHarnessBatchId(bag.batch_id) ?? bag.batch_id.slice(0, 8),
      harness_run_number: bag.harness_run_number,
      harness_kind: bag.harness_kind,
      kind_label: authorshipBatchKindLabel({
        harnessKind: bag.harness_kind,
        batchId: bag.batch_id,
      }),
      started_at: bag.started_at,
      budget_condition: isAuthorshipBudgetConditionsConstrainedBatch(bag.batch_id)
        ? "constrained"
        : isAuthorshipBudgetConditionsControlBatch(bag.batch_id)
          ? "adequate"
          : undefined,
      decision_count: demos.length,
      demos,
      total_briefs,
      total_contributions,
      total_audits,
      expected_briefs: demos.length * expectedPerDemo,
      cross_case_shifts,
      total_influence_shifts: cross_case_shifts.length,
      rollup_matrices,
    });
  }

  summaries.sort((a, b) => {
    const ta = a.started_at ? Date.parse(a.started_at) : 0;
    const tb = b.started_at ? Date.parse(b.started_at) : 0;
    return tb - ta;
  });

  return summaries;
}

/** Exported for UI legend — same mapping as rollup cells. */
export function authorshipRollupScoreToInfluence(score: number): ContributionInfluence {
  return scoreToInfluence(score);
}

export { INFLUENCE_SCORE };
