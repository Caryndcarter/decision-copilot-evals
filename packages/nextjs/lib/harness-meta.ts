import type { HarnessKind } from "@/types/decision";
import { MERIDIAN_IC_VOICE_CASES } from "./meridian-ic-voice-cases";
import { HORMUZ_VOICE_CASES } from "./hormuz-voice-cases";
import { DEMO_HARNESS_CASES } from "./demo-harness-cases";
import { MERIDIAN_CASE_LABELS } from "./meridian-ic-moral-display";

/** Canonical batch UUID for Meridian IC voice harness Run #1 (2026-08-20). */
export const MERIDIAN_IC_VOICE_RUN1_BATCH_ID = "8f2a0820-0820-41b0-9e11-000000000001";

/** Earlier same-day Meridian IC parallel test before Run #1 (no run number stored). */
export const MERIDIAN_IC_VOICE_EARLY_BATCH_ID = "e7430820-0820-41b0-9e11-000000000001";

/** Infer harness kind from demo scenario when older runs omit `harness_kind`. */
export function inferHarnessKindFromDemoScenario(demoScenarioId?: string): HarnessKind | undefined {
  if (!demoScenarioId) return undefined;
  if (demoScenarioId.startsWith("meridian-ic-")) return "meridian-ic-voice";
  if (demoScenarioId.startsWith("hormuz-")) return "hormuz-voice";
  if (DEMO_HARNESS_CASES.some((c) => c.id === demoScenarioId)) return "multi-demo-authorship";
  return undefined;
}

/** UI grouping for My Decisions → Harness (test type families). */
export type HarnessStudyTab = "voice-influence" | "authorship-influence" | "replication";

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
      "Same decision framed five ways (Meridian IC · Civitas, Hormuz tanker ops, …) — intake through variant and research, no Unified Briefs.",
    findingsStudy: "meridian-ic-moral",
  },
  {
    id: "authorship-influence",
    label: "Authorship influence",
    blurb:
      "Five high-conflict demo decisions — Standard, Blind, and Reassigned Unified Briefs per synthesizer.",
    findingsStudy: "multi-demo-authorship",
  },
  {
    id: "replication",
    label: "Replication",
    blurb: "Full Civitas modernization path repeated across trials for provider comparison.",
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

/** What the harness is measuring (methodology — shared across scenarios). */
export const HARNESS_TEST_TYPE: Record<HarnessKind, string> = {
  "meridian-ic-voice": "Voice influence",
  "hormuz-voice": "Voice influence",
  "multi-demo-authorship": "Authorship influence",
  "civitas-replication": "Replication",
};

/** Scenario / fixture that differentiates batches within the same test type. */
export const HARNESS_SCENARIO_LABEL: Record<HarnessKind, string> = {
  "meridian-ic-voice": "Meridian IC",
  "hormuz-voice": "Hormuz",
  "multi-demo-authorship": "Five demos",
  "civitas-replication": "Civitas",
};

/** Full batch name: test type · scenario (shown on My Decisions → Harness). */
export const HARNESS_KIND_LABELS: Record<HarnessKind, string> = {
  "multi-demo-authorship": "Authorship influence · five demos",
  "civitas-replication": "Replication · Civitas",
  "meridian-ic-voice": "Voice influence · Meridian IC",
  "hormuz-voice": "Voice influence · Hormuz",
};

/** Compact badge: test type abbreviated where needed · scenario. */
export const HARNESS_KIND_SHORT: Record<HarnessKind, string> = {
  "multi-demo-authorship": "Authorship influence",
  "civitas-replication": "Replication · Civitas",
  "meridian-ic-voice": "Voice · Meridian IC",
  "hormuz-voice": "Voice · Hormuz",
};

/** What each harness batch is designed to test (shown on My Decisions → Harness). */
export const HARNESS_KIND_PURPOSE: Record<HarnessKind, string> = {
  "meridian-ic-voice":
    "Voice influence — same Civitas layoff decision framed five ways by a PE investment committee (neutral LP voice, confident tone, inflated urgency, optimistic fast-path, honest aggressive). Compares provider Decision Briefs for filer alignment, premise handling, and people-vs-speed coding.",
  "hormuz-voice":
    "Voice influence — same isolation design on a fictional Strait of Hormuz tanker operator: five voice/framing variants (provisional lean, confident tone, false urgency, safety-adjacent claim, honest unapologetic tradeoff). Tests whether briefs track filer lean and flag load-bearing false premises.",
  "civitas-replication":
    "Replication — full Civitas modernization stress path (intake, clarification, variant, research, Unified Brief) repeated across trials to compare provider behavior under the original PE roll-up scenario.",
  "multi-demo-authorship":
    "Authorship influence — Standard, Blind, and Reassigned Unified Briefs across five high-conflict demos (hospital PE, VP sales, Gen-AI compliance, banking modernization, Civitas roll-up). Measures synthesizer branding effects, influence shifts, and moral audit scores.",
};

export function harnessBatchPurpose(kind?: HarnessKind): string {
  if (kind) return HARNESS_KIND_PURPOSE[kind];
  return "Harness eval batch. Older runs may not record which study produced them.";
}

/** Keys for grouping harness decisions into one eval batch on the dashboard. */
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
}): string {
  const kindLabel = opts.kind ? HARNESS_KIND_LABELS[opts.kind] : "Harness eval";
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
  const kind = opts.kind ? HARNESS_KIND_SHORT[opts.kind] : "Harness";
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
  return label.replace(/^Hormuz ·\s*/i, "").trim();
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
    return "Same Civitas modernization scenario — full harness path repeated for replication.";
  }
  if (opts.kind === "multi-demo-authorship" && opts.demoScenarioId) {
    return "Unified Brief authorship modes (Standard / Blind / Reassigned) on this demo.";
  }
  return undefined;
}
