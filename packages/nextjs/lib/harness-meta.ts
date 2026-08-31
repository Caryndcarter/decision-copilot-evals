import type { HarnessKind } from "@/types/decision";
import { MERIDIAN_IC_VOICE_CASES } from "./meridian-ic-voice-cases";
import { HORMUZ_VOICE_CASES } from "./hormuz-voice-cases";
import { DEMO_HARNESS_CASES } from "./demo-harness-cases";
import { MERIDIAN_CASE_LABELS } from "./meridian-ic-moral-display";

/** Canonical batch UUID for Meridian IC voice harness Run #1 (2026-08-20). */
export const MERIDIAN_IC_VOICE_RUN1_BATCH_ID = "8f2a0820-0820-41b0-9e11-000000000001";

/** Earlier same-day Meridian IC parallel test before Run #1 (no run number stored). */
export const MERIDIAN_IC_VOICE_EARLY_BATCH_ID = "e7430820-0820-41b0-9e11-000000000001";

/** Dynamo import · Meridian IC voice · July 31, 2026 (pre–Sol/Fable defaults). */
export const MERIDIAN_IC_VOICE_DYNAMO_JULY31_BATCH_ID =
  "58b61818-cb9e-53a4-920b-ad2f7bfad740";

/** Dynamo import · Meridian IC voice · August 14, 2026. */
export const MERIDIAN_IC_VOICE_DYNAMO_AUG14_BATCH_ID =
  "f84c32e7-99a3-5133-ab9b-6a06f0eb770f";

/** Merged legacy import batch (superseded — split into July 31 + Aug 14). */
export const MERIDIAN_IC_VOICE_DYNAMO_LEGACY_MERGED_BATCH_ID =
  "aa7f373e-66d4-5ebf-912d-2193454b6a65";

/** Dynamo import · Civitas replication · July 27, 2026. */
export const CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID =
  "db9445cf-ef02-5740-b69f-d34a1194e04a";

/**
 * Multi-demo authorship batch used as the adequate-budget control
 * (Sol-era synthesizer / contribution defaults).
 */
export const AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_BATCH_ID =
  "bc243273-6103-470c-9f11-94943925ca95";

/**
 * Civitas July 27 stays `harness_kind: civitas-replication`.
 * Authorship influence includes it by batch id — do not retag.
 */
export const AUTHORSHIP_BUDGET_CONDITIONS_CONSTRAINED_BATCH_IDS = [
  CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
] as const;

/** Extra batches loaded into authorship rollup / findings without changing stored kind. */
export const AUTHORSHIP_INFLUENCE_INCLUDE_BATCH_IDS = [
  ...AUTHORSHIP_BUDGET_CONDITIONS_CONSTRAINED_BATCH_IDS,
] as const;

/** Primary product title for the budget-conditions cut (not a model name). */
export const AUTHORSHIP_BUDGET_CONDITIONS_TITLE =
  "Authorship influence · budget conditions";

export const AUTHORSHIP_BUDGET_CONDITIONS_SCENARIO_LABEL = "Civitas (constrained tokens)";

export const AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_LABEL = "adequate budget (Sol)";

export const AUTHORSHIP_BUDGET_CONDITIONS_PURPOSE =
  "Authorship influence · budget conditions — same Civitas scenario under two contribution-analysis budgets: constrained at 4,096 tokens (2026-07-27) versus adequate budget (Sol) at 8,192 (ChatGPT synthesizer) / 16,384 (others). Measures whether a tight token budget produces unjustified self-credit when peers can see weak work. July 27 remains a civitas-replication batch; it is listed here by id, not retagged.";

function normalizeHarnessBatchId(batchId?: string): string | undefined {
  const raw = batchId?.trim();
  if (!raw) return undefined;
  return raw;
}

export function isAuthorshipBudgetConditionsConstrainedBatch(batchId?: string): boolean {
  const id = normalizeHarnessBatchId(batchId);
  if (!id) return false;
  return (AUTHORSHIP_BUDGET_CONDITIONS_CONSTRAINED_BATCH_IDS as readonly string[]).includes(id);
}

export function isAuthorshipBudgetConditionsControlBatch(batchId?: string): boolean {
  return normalizeHarnessBatchId(batchId) === AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_BATCH_ID;
}

export function isAuthorshipInfluenceIncludeBatch(batchId?: string): boolean {
  const id = normalizeHarnessBatchId(batchId);
  if (!id) return false;
  return (AUTHORSHIP_INFLUENCE_INCLUDE_BATCH_IDS as readonly string[]).includes(id);
}

/** Mongo clause for findings authorship (live five-demos + whitelist). */
export function authorshipOnlyMongoClause(): Record<string, unknown> {
  return {
    harness_run: true,
    $or: [
      { harness_kind: "multi-demo-authorship" },
      { harness_batch_id: { $in: [...AUTHORSHIP_INFLUENCE_INCLUDE_BATCH_IDS] } },
    ],
  };
}

/** Tabs a batch should appear under on My Decisions → Studies. */
export function harnessStudyTabsForBatch(opts: {
  kind?: HarnessKind;
  batchId?: string;
}): Array<HarnessStudyTab | "other"> {
  const primary = harnessStudyTabForKind(opts.kind);
  if (isAuthorshipBudgetConditionsConstrainedBatch(opts.batchId) && primary === "replication") {
    return ["replication", "authorship-influence"];
  }
  return [primary];
}

export function authorshipBatchKindLabel(opts: {
  harnessKind: HarnessKind;
  batchId?: string;
}): string {
  if (isAuthorshipBudgetConditionsConstrainedBatch(opts.batchId)) {
    return AUTHORSHIP_BUDGET_CONDITIONS_TITLE;
  }
  if (isAuthorshipBudgetConditionsControlBatch(opts.batchId)) {
    return `${HARNESS_KIND_LABELS["multi-demo-authorship"]} · ${AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_LABEL}`;
  }
  return HARNESS_KIND_LABELS[opts.harnessKind] ?? HARNESS_KIND_LABELS["multi-demo-authorship"];
}

/** Infer harness kind from demo scenario when older runs omit `harness_kind`. */
export function inferHarnessKindFromDemoScenario(demoScenarioId?: string): HarnessKind | undefined {
  if (!demoScenarioId) return undefined;
  if (demoScenarioId.startsWith("meridian-ic-")) return "meridian-ic-voice";
  if (demoScenarioId.startsWith("hormuz-")) return "hormuz-voice";
  if (demoScenarioId === "meridian-civitas-saas-rollup") return "civitas-replication";
  if (DEMO_HARNESS_CASES.some((c) => c.id === demoScenarioId)) return "multi-demo-authorship";
  return undefined;
}

/** UI grouping for My Decisions → Studies tab (test type families). */
export type HarnessStudyTab = "voice-influence" | "authorship-influence" | "replication";

/** Top-level My Decisions tab for structured AI-behavior study runs. */
export type RunsStudyTab = "decisions" | "studies";

/** Accept `tab=studies` (preferred) and legacy `tab=harness`. */
export function parseRunsTab(tab?: string): RunsStudyTab {
  if (tab === "studies" || tab === "harness") return "studies";
  return "decisions";
}

export const HARNESS_STUDY_TABS: {
  id: HarnessStudyTab;
  label: string;
  blurb: string;
  findingsStudy?: string;
}[] = [
  {
    id: "voice-influence",
    label: "Voice influence",
    blurb:
      "Users often write intake with a lean already baked into the framing. We hold the facts fixed and vary only narrator voice (Meridian IC · Civitas, Meran Tankers tanker ops) to see whether Decision Briefs rubber-stamp the filer, push back, or miss false premises.",
    findingsStudy: "meridian-ic-moral",
  },
  {
    id: "authorship-influence",
    label: "Authorship influence",
    blurb:
      "Unified Briefs credit think-tank members by brand — and logos may bias the synthesizer. Across five high-conflict demos we compare Blind (default), Revealed, and Reassigned authorship. A budget-conditions cut (Civitas constrained tokens vs adequate budget) checks whether Blind vs Revealed credit shifts when contribution analysis is token-constrained.",
    findingsStudy: "multi-demo-authorship",
  },
  {
    id: "replication",
    label: "Replication",
    blurb:
      "A single demo run can look decisive by chance. We re-run the full Civitas path (intake through Unified Brief) across trials to separate stable provider behavior from one-shot noise.",
    findingsStudy: "civitas-replication-moral",
  },
];

export function parseHarnessStudyTab(value: unknown): HarnessStudyTab | undefined {
  if (typeof value !== "string") return undefined;
  return HARNESS_STUDY_TABS.some((t) => t.id === value) ? (value as HarnessStudyTab) : undefined;
}

export function harnessStudyTabForKind(kind?: HarnessKind): HarnessStudyTab | "other" {
  switch (kind) {
    case "meridian-ic-voice":
    case "hormuz-voice":
      return "voice-influence";
    case "multi-demo-authorship":
      return "authorship-influence";
    case "civitas-replication":
      return "replication";
    default:
      return "other";
  }
}

/** Resolve kind on a batch section when older runs omit harness_kind. */
export function resolveHarnessBatchKind(opts: {
  kind?: HarnessKind;
  demoScenarioId?: string;
}): HarnessKind | undefined {
  return opts.kind ?? inferHarnessKindFromDemoScenario(opts.demoScenarioId);
}

/** What each study type measures (methodology — shared across scenarios). */
export const HARNESS_TEST_TYPE: Record<HarnessKind, string> = {
  "meridian-ic-voice": "Voice influence",
  "hormuz-voice": "Voice influence",
  "multi-demo-authorship": "Authorship influence",
  "civitas-replication": "Replication",
};

/** Scenario / fixture that differentiates batches within the same test type. */
export const HARNESS_SCENARIO_LABEL: Record<HarnessKind, string> = {
  "meridian-ic-voice": "Meridian IC",
  "hormuz-voice": "Meran Tankers",
  "multi-demo-authorship": "Five demos",
  "civitas-replication": "Civitas",
};

/** Full batch name: test type · scenario (shown on My Decisions → Studies). */
export const HARNESS_KIND_LABELS: Record<HarnessKind, string> = {
  "multi-demo-authorship": "Authorship influence · five demos",
  "civitas-replication": "Replication · Civitas",
  "meridian-ic-voice": "Voice influence · Meridian IC",
  "hormuz-voice": "Voice influence · Meran Tankers",
};

/** Compact badge: test type abbreviated where needed · scenario. */
export const HARNESS_KIND_SHORT: Record<HarnessKind, string> = {
  "multi-demo-authorship": "Authorship influence",
  "civitas-replication": "Replication · Civitas",
  "meridian-ic-voice": "Voice · Meridian IC",
  "hormuz-voice": "Voice · Meran Tankers",
};

/** What each study batch is designed to test (shown on My Decisions → Studies). */
export const HARNESS_KIND_PURPOSE: Record<HarnessKind, string> = {
  "meridian-ic-voice":
    "Voice influence — same Civitas layoff decision framed five ways by a PE investment committee (neutral LP voice, confident tone, inflated urgency, optimistic fast-path, honest aggressive). Compares provider Decision Briefs for filer alignment, premise handling, and people-vs-speed coding.",
  "hormuz-voice":
    "Voice influence — same isolation design on a fictional Strait of Hormuz tanker operator: five voice/framing variants (provisional lean, confident tone, false urgency, safety-adjacent claim, honest unapologetic tradeoff). Tests whether briefs track filer lean and flag load-bearing false premises.",
  "civitas-replication":
    "Replication — full Civitas modernization stress path (intake, clarification, variant, research, Unified Brief) repeated across trials to compare provider behavior under the original PE roll-up scenario.",
  "multi-demo-authorship":
    "Authorship influence — Blind (default), Revealed, and Reassigned Unified Briefs across five high-conflict demos (hospital PE, VP sales, Gen-AI compliance, banking modernization, Civitas roll-up). Measures synthesizer branding effects, influence shifts, and moral audit scores.",
};

export function harnessBatchPurpose(
  kind?: HarnessKind,
  opts?: { batchId?: string; studyTab?: HarnessStudyTab }
): string {
  if (
    opts?.studyTab === "authorship-influence" &&
    isAuthorshipBudgetConditionsConstrainedBatch(opts.batchId)
  ) {
    return AUTHORSHIP_BUDGET_CONDITIONS_PURPOSE;
  }
  if (isAuthorshipBudgetConditionsControlBatch(opts?.batchId)) {
    return `${HARNESS_KIND_PURPOSE["multi-demo-authorship"]} Control: ${AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_LABEL}.`;
  }
  if (kind) return HARNESS_KIND_PURPOSE[kind];
  return "Behavior study batch. Older runs may not record which test type produced them.";
}

/** Keys for grouping study runs into one batch on the dashboard. */
export function harnessBatchKey(opts: {
  harnessBatchId?: string;
  harnessRunNumber?: number;
  harnessKind?: HarnessKind;
  decisionId: string;
}): string {
  if (opts.harnessBatchId?.trim()) return opts.harnessBatchId.trim();
  if (typeof opts.harnessRunNumber === "number" && opts.harnessKind) {
    return `${opts.harnessKind}:run-${opts.harnessRunNumber}`;
  }
  if (typeof opts.harnessRunNumber === "number") {
    return `run-number:${opts.harnessRunNumber}`;
  }
  return `legacy:${opts.decisionId}`;
}

/** Human-readable batch title (eval name + run number). */
export function harnessBatchTitle(opts: {
  kind?: HarnessKind;
  runNumber?: number;
  batchId?: string;
  studyTab?: HarnessStudyTab;
}): string {
  const kindLabel =
    opts.studyTab === "authorship-influence" && opts.kind
      ? authorshipBatchKindLabel({ harnessKind: opts.kind, batchId: opts.batchId })
      : opts.kind
        ? HARNESS_KIND_LABELS[opts.kind]
        : "Behavior study";
  if (typeof opts.runNumber === "number") {
    return `${kindLabel} · Run ${opts.runNumber}`;
  }
  return kindLabel;
}

/** First 8 chars of a batch UUID for badges (keeps lists readable). */
export function shortHarnessBatchId(batchId: string | undefined): string | undefined {
  if (!batchId?.trim()) return undefined;
  const raw = batchId.trim();
  if (raw.includes(":") || raw.startsWith("legacy:")) return undefined;
  return raw.replace(/-/g, "").slice(0, 8);
}

export function harnessBadgeLabel(opts: {
  kind?: HarnessKind;
  runNumber?: number;
  trial?: number;
  batchId?: string;
}): string {
  const kind = opts.kind ? HARNESS_KIND_SHORT[opts.kind] : "Study";
  const shortId = shortHarnessBatchId(opts.batchId);
  const parts = [kind];
  if (typeof opts.runNumber === "number") parts.push(`Run ${opts.runNumber}`);
  if (shortId) parts.push(shortId);
  if (typeof opts.trial === "number") parts.push(`Case ${opts.trial}`);
  return parts.join(" · ");
}

/** Compact label for a case row inside an already-grouped batch. */
export function harnessTrialLabel(trial?: number): string {
  if (typeof trial === "number" && trial > 0) return `Case ${trial}`;
  return "Case";
}

const HORMUZ_CASE_NOTES: Record<number, string> = {
  1: "Provisional lean; epistemic contrast with confident register (C2)",
  2: "Same facts as C1; hedging → confident register",
  3: "Permanence claim vs first-refusal clause in the intake",
  4: "Near-peacetime risk claim vs ~100× war-risk premium",
  5: "Names crew-risk tradeoff openly; no false premises",
};

function meridianVariantShort(label: string): string {
  return label.replace(/^Meridian IC ·\s*/i, "").trim();
}

function hormuzVariantShort(label: string): string {
  return label.replace(/^Meran Tankers ·\s*/i, "").trim();
}

/** Stable case index from scenario id (ignores subset/resume harness_trial numbering). */
export function harnessCanonicalCaseIndex(demoScenarioId?: string): number | undefined {
  if (!demoScenarioId) return undefined;
  const demoIdx = DEMO_HARNESS_CASES.findIndex((c) => c.id === demoScenarioId);
  if (demoIdx >= 0) return demoIdx + 1;
  const meridianIdx = MERIDIAN_IC_VOICE_CASES.findIndex((c) => c.id === demoScenarioId);
  if (meridianIdx >= 0) return meridianIdx + 1;
  const hormuzIdx = HORMUZ_VOICE_CASES.findIndex((c) => c.id === demoScenarioId);
  if (hormuzIdx >= 0) return hormuzIdx + 1;
  return undefined;
}

function effectiveCaseIndex(opts: { demoScenarioId?: string; trial?: number }): number | undefined {
  return harnessCanonicalCaseIndex(opts.demoScenarioId) ?? opts.trial;
}

/** Descriptive case label for harness trial rows (voice/frame variant, demo scenario, etc.). */
export function harnessCaseLabel(opts: {
  kind?: HarnessKind;
  demoScenarioId?: string;
  trial?: number;
}): string {
  const caseIndex = effectiveCaseIndex(opts);
  const caseNum =
    typeof caseIndex === "number" && caseIndex > 0 ? `Case ${caseIndex}` : undefined;

  if (opts.demoScenarioId) {
    const meridian = MERIDIAN_IC_VOICE_CASES.find((c) => c.id === opts.demoScenarioId);
    if (meridian) {
      const variant = meridianVariantShort(meridian.label);
      return caseNum
        ? `${caseNum} · Voice variant: ${variant}`
        : `Voice variant: ${variant}`;
    }
    const hormuz = HORMUZ_VOICE_CASES.find((c) => c.id === opts.demoScenarioId);
    if (hormuz) {
      const variant = hormuzVariantShort(hormuz.label);
      return caseNum
        ? `${caseNum} · Voice variant: ${variant}`
        : `Voice variant: ${variant}`;
    }
    const demo = DEMO_HARNESS_CASES.find((c) => c.id === opts.demoScenarioId);
    if (demo) {
      return caseNum ? `${caseNum} · Demo scenario: ${demo.label}` : `Demo scenario: ${demo.label}`;
    }
  }

  if (opts.kind === "civitas-replication" && typeof caseIndex === "number" && caseIndex > 0) {
    return `Replication trial ${caseIndex}`;
  }

  if (opts.kind === "meridian-ic-voice" || opts.kind === "hormuz-voice") {
    if (typeof caseIndex === "number" && caseIndex > 0) {
      const meridian = MERIDIAN_IC_VOICE_CASES[caseIndex - 1];
      if (meridian && opts.kind === "meridian-ic-voice") {
        return `Case ${caseIndex} · Voice variant: ${meridianVariantShort(meridian.label)}`;
      }
      const hormuz = HORMUZ_VOICE_CASES[caseIndex - 1];
      if (hormuz && opts.kind === "hormuz-voice") {
        return `Case ${caseIndex} · Voice variant: ${hormuzVariantShort(hormuz.label)}`;
      }
    }
    return caseNum ? `${caseNum} · Voice variant` : "Voice variant";
  }

  return harnessTrialLabel(caseIndex);
}

/** One-line note on what the case is testing (shown under the case label when available). */
export function harnessCaseNote(opts: {
  kind?: HarnessKind;
  demoScenarioId?: string;
  trial?: number;
}): string | undefined {
  const caseIndex = effectiveCaseIndex(opts);
  if (opts.kind === "meridian-ic-voice" && typeof caseIndex === "number") {
    return MERIDIAN_CASE_LABELS[caseIndex]?.sub;
  }
  if (opts.kind === "hormuz-voice" && typeof caseIndex === "number") {
    return HORMUZ_CASE_NOTES[caseIndex];
  }
  if (opts.demoScenarioId) {
    const idx = MERIDIAN_IC_VOICE_CASES.findIndex((c) => c.id === opts.demoScenarioId);
    if (idx >= 0) return MERIDIAN_CASE_LABELS[idx + 1]?.sub;
    const hIdx = HORMUZ_VOICE_CASES.findIndex((c) => c.id === opts.demoScenarioId);
    if (hIdx >= 0) return HORMUZ_CASE_NOTES[hIdx + 1];
  }
  if (opts.kind === "civitas-replication") {
    return "Same Civitas modernization scenario — full study path repeated for replication.";
  }
  if (opts.kind === "multi-demo-authorship" && opts.demoScenarioId) {
    return "Unified Brief authorship modes (Blind / Revealed / Reassigned) on this demo.";
  }
  return undefined;
}
