/**
 * Aggregate multi-demo authorship harness batches for the summary UI.
 */

import { DEMO_HARNESS_CASES } from "@/lib/demo-harness-cases";
import { HARNESS_KIND_LABELS, shortHarnessBatchId } from "@/lib/harness-meta";
import { buildInfluenceMatrix, type InfluenceMatrix } from "@/lib/unified-brief-influence-matrix";
import {
  UNIFIED_BRIEF_AUDIT_DIMENSIONS,
  type UnifiedBriefAuditDimension,
} from "@/lib/unified-brief-audit/rubric";
import {
  getUnifiedBriefAuditForAuthor,
  getUnifiedBriefContributionsByAuthor,
  getUnifiedBriefsByAuthor,
  UNIFIED_BRIEF_SYNTHESIZERS,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import { pickPersistRunForUnifiedBrief } from "@/lib/unified-brief-persist-run";
import type {
  DecisionRunResult,
  DemoScenarioId,
  HarnessKind,
  LLMProviderName,
  UnifiedBriefAuthorshipMode,
} from "@/types/decision";

export const AUTHORSHIP_SUMMARY_MODES: UnifiedBriefAuthorshipMode[] = ["open", "blind", "reassigned"];

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

export type AuthorshipDemoSummary = {
  demo_id: DemoScenarioId | string;
  demo_label: string;
  decision_id: string;
  harness_trial?: number;
  modes: Record<UnifiedBriefAuthorshipMode, AuthorshipModeCoverage>;
  influence_shift_count: number;
  top_shifts: { badge: string; title: string; severity: number }[];
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
};

function demoLabel(id: string): string {
  return DEMO_HARNESS_CASES.find((c) => c.id === id)?.label ?? id;
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

/** Count large open→blind / open→reassigned credit moves for one decision. */
function influenceShifts(persistRun: DecisionRunResult | null): {
  count: number;
  top: { badge: string; title: string; severity: number }[];
} {
  const matrices = matricesByMode(persistRun);
  const shifts: { badge: string; title: string; severity: number }[] = [];
  const pairs: Array<[UnifiedBriefAuthorshipMode, UnifiedBriefAuthorshipMode]> = [
    ["open", "blind"],
    ["open", "reassigned"],
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
        if (Math.abs(delta) < 2) continue;
        shifts.push({
          badge: `${fromMode} → ${toMode}`,
          title: `${rated} Δ${delta > 0 ? "+" : ""}${delta} (rater ${rater})`,
          severity: Math.abs(delta),
        });
      }
    }
  }
  shifts.sort((x, y) => y.severity - x.severity);
  return { count: shifts.length, top: shifts.slice(0, 3) };
}

function activityIso(run: DecisionRunResult & { createdAt?: string; updatedAt?: string }): string | undefined {
  return (typeof run.updatedAt === "string" && run.updatedAt) ||
    (typeof run.createdAt === "string" && run.createdAt) ||
    undefined;
}

/**
 * Group the user's runs into multi-demo authorship batches (newest first).
 * Falls back to `harness_run_number` when older runs lack `harness_batch_id`.
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
    if (!run.harness_run) continue;
    const kind = run.harness_kind;
    // Include legacy authorship-like batches without kind only if they match demo case ids
    // from the five-case set; otherwise require explicit kind.
    const isAuthorship =
      kind === "multi-demo-authorship" ||
      (!kind &&
        !!run.demo_scenario_id &&
        DEMO_HARNESS_CASES.some((c) => c.id === run.demo_scenario_id));
    if (!isAuthorship) continue;

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
        harness_kind: "multi-demo-authorship",
        started_at: activityIso(run as DecisionRunResult & { createdAt?: string; updatedAt?: string }),
        byDecision: new Map(),
      };
      bags.set(batchKey, bag);
    }
    if (typeof run.harness_run_number === "number") {
      bag.harness_run_number = run.harness_run_number;
    }
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

    for (const [decision_id, decisionRuns] of bag.byDecision) {
      const persist = pickPersistRunForUnifiedBrief(decisionRuns);
      const primary = persist ?? decisionRuns[0]!;
      const modes = countModeCoverage(persist);
      const shifts = influenceShifts(persist);
      const moral_cells = collectMoralCells(persist);
      for (const mode of AUTHORSHIP_SUMMARY_MODES) {
        total_briefs += modes[mode].briefs;
        total_contributions += modes[mode].contributions;
        total_audits += modes[mode].audits;
      }
      demos.push({
        demo_id: primary.demo_scenario_id ?? decision_id,
        demo_label: demoLabel(primary.demo_scenario_id ?? decision_id),
        decision_id,
        harness_trial: primary.harness_trial,
        modes,
        influence_shift_count: shifts.count,
        top_shifts: shifts.top,
        moral_cells,
        audit_count: moral_cells.length,
      });
    }

    demos.sort((a, b) => (a.harness_trial ?? 99) - (b.harness_trial ?? 99));

    summaries.push({
      batch_id: bag.batch_id,
      batch_short: shortHarnessBatchId(bag.batch_id) ?? bag.batch_id.slice(0, 8),
      harness_run_number: bag.harness_run_number,
      harness_kind: bag.harness_kind,
      kind_label: HARNESS_KIND_LABELS["multi-demo-authorship"],
      started_at: bag.started_at,
      decision_count: demos.length,
      demos,
      total_briefs,
      total_contributions,
      total_audits,
      expected_briefs: demos.length * expectedPerDemo,
    });
  }

  summaries.sort((a, b) => {
    const ta = a.started_at ? Date.parse(a.started_at) : 0;
    const tb = b.started_at ? Date.parse(b.started_at) : 0;
    return tb - ta;
  });

  return summaries;
}
