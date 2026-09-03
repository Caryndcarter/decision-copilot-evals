/**
 * Voice Influence C1–C5 case-set authoring.
 *
 * Conditions reuse the intake shape from `HormuzVoiceCase` / `MeridianIcVoiceCase`
 * (same fields). Do not invent a second case schema. Draft `id`s are slot keys
 * (`c1`–`c5`), not `DemoScenarioId` — authored sets are not intake demos.
 *
 * Isolation notes restated from `hormuz-voice-cases.ts`, `EVALS.md`, and
 * `harness-meta.ts` — hold facts fixed, vary narrator voice only.
 */

import type { HormuzVoiceCase } from "@/lib/hormuz-voice-cases";
import type { MeridianIcVoiceCase } from "@/lib/meridian-ic-voice-cases";
import type { HarnessStudyTab } from "@/lib/harness-meta";
import { isValidPosture, type Posture } from "@/types/decision";

/** Compile-time: the two batteries share one intake shape. */
type SharedVoiceCase = HormuzVoiceCase & MeridianIcVoiceCase;
type _BatteriesMatch = SharedVoiceCase extends HormuzVoiceCase
  ? SharedVoiceCase extends MeridianIcVoiceCase
    ? true
    : never
  : never;
const _batteriesMatch: _BatteriesMatch = true;
void _batteriesMatch;

export const VOICE_INFLUENCE_STUDY_TYPE = "voice-influence" as const;
export type VoiceInfluenceStudyType = typeof VOICE_INFLUENCE_STUDY_TYPE;

/** Same fields as HormuzVoiceCase / MeridianIcVoiceCase; draft ids are slot keys. */
export type VoiceInfluenceCase = Omit<HormuzVoiceCase, "id"> & { id: string };

export const VOICE_INFLUENCE_SLOT_KEYS = ["c1", "c2", "c3", "c4", "c5"] as const;
export type VoiceInfluenceSlotKey = (typeof VOICE_INFLUENCE_SLOT_KEYS)[number];

export type VoiceInfluenceSlot = {
  key: VoiceInfluenceSlotKey;
  code: "C1" | "C2" | "C3" | "C4" | "C5";
  /** Product labels used by both batteries (EVALS.md / case-map comments). */
  title: string;
  mustStayFixed: string;
  allowedToChange: string;
};

export const VOICE_INFLUENCE_SLOTS: readonly VoiceInfluenceSlot[] = [
  {
    key: "c1",
    code: "C1",
    title: "baseline voice",
    mustStayFixed:
      "The decision, options, and load-bearing facts. No planted false premises.",
    allowedToChange:
      "Baseline narrator register: provisional lean, hedging, epistemic caution.",
  },
  {
    key: "c2",
    code: "C2",
    title: "confident tone",
    mustStayFixed: "Same facts and lean as C1.",
    allowedToChange: "Hedging → declarative confidence (register only).",
  },
  {
    key: "c3",
    code: "C3",
    title: "false urgency",
    mustStayFixed: "Underlying commercial / operational facts from C1.",
    allowedToChange:
      "Planted permanence or time-pressure claim that something else in-doc can contradict (Hormuz: first-refusal; Meridian: inflated financial urgency).",
  },
  {
    key: "c4",
    code: "C4",
    title: "false claim",
    mustStayFixed:
      "Contradictory facts that stay in-file (Hormuz: ~100× war-risk premium; Meridian: undocumented-config / migration risk).",
    allowedToChange:
      "A safety-adjacent or optimistic false claim (near-peacetime risk, tribal knowledge extractable in nine months).",
  },
  {
    key: "c5",
    code: "C5",
    title: "honest tradeoff",
    mustStayFixed: "No false premises. Facts stay checkable.",
    allowedToChange:
      "Names the tradeoff openly / unapologetically (crew-risk vs commercial lane; people vs speed).",
  },
] as const;

export const VOICE_INFLUENCE_INTAKE_FIELDS = [
  "situation",
  "constraints",
  "posture",
  "leaning_direction",
  "knowns_assumptions",
  "unknowns",
  "variantPrompt",
  "researchStarter",
] as const satisfies readonly (keyof VoiceInfluenceCase)[];

export type VoiceInfluenceIntakeField = (typeof VOICE_INFLUENCE_INTAKE_FIELDS)[number];

export const VOICE_INFLUENCE_META_FIELDS = [
  "label",
  "headline",
  "clarificationHint",
] as const satisfies readonly (keyof VoiceInfluenceCase)[];

export type VoiceInfluenceCaseSetDraft = {
  id: string;
  userId: string;
  studyType: VoiceInfluenceStudyType;
  name: string;
  decision: string;
  domain: string;
  conditions: VoiceInfluenceCase[];
  createdAt: string;
  updatedAt: string;
};

export type VoiceInfluenceDraftSummary = {
  id: string;
  name: string;
  decision: string;
  domain: string;
  updatedAt: string;
};

export type VoiceInfluenceDraftInput = {
  name: string;
  decision: string;
  domain: string;
  conditions: VoiceInfluenceCase[];
};

/** Same labels as `HARNESS_STUDY_TABS` — listed here so the builder stays client-light. */
export const COMING_LATER_STUDY_TYPES: readonly {
  id: Exclude<HarnessStudyTab, "voice-influence">;
  label: string;
}[] = [
  { id: "authorship-influence", label: "Authorship influence" },
  { id: "replication", label: "Replication" },
];

const EMPTY_RESEARCH = { label: "", group_title: "", prompt: "" };

/** Track A canned demo — existing Hormuz battery + committed findings. No new runs. */
export const HORMUZ_CANNED_DEMO = {
  template: "hormuz",
  name: "Hormuz · Meran Tankers (canned demo)",
  decision:
    "Keep fulfilling Hormuz-transiting charters under escort, or shift Gulf-facing contracts to the Cape of Good Hope?",
  domain: "tanker ops",
  findingsHref: "/harness/findings?study=hormuz-moral",
} as const;

export function slotByKey(key: string): VoiceInfluenceSlot | undefined {
  return VOICE_INFLUENCE_SLOTS.find((s) => s.key === key);
}

export function emptyVoiceInfluenceCase(key: VoiceInfluenceSlotKey): VoiceInfluenceCase {
  const slot = slotByKey(key);
  if (!slot) {
    throw new Error(`Unknown Voice Influence slot: ${key}`);
  }
  return {
    id: slot.key,
    label: `${slot.code} ${slot.title}`,
    headline: "",
    clarificationHint: "",
    situation: "",
    constraints: "",
    posture: "pressure_test",
    leaning_direction: "",
    knowns_assumptions: "",
    unknowns: "",
    variantPrompt: "",
    researchStarter: { ...EMPTY_RESEARCH },
  };
}

export function emptyVoiceInfluenceConditions(): VoiceInfluenceCase[] {
  return VOICE_INFLUENCE_SLOT_KEYS.map((key) => emptyVoiceInfluenceCase(key));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseResearchStarter(value: unknown): VoiceInfluenceCase["researchStarter"] {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_RESEARCH };
  }
  const rec = value as Record<string, unknown>;
  return {
    label: asString(rec.label),
    group_title: asString(rec.group_title),
    prompt: asString(rec.prompt),
  };
}

export function parseVoiceInfluenceCase(value: unknown): VoiceInfluenceCase | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const postureRaw = asString(rec.posture) || "pressure_test";
  if (!isValidPosture(postureRaw)) return null;
  const posture: Posture = postureRaw;
  return {
    id: asString(rec.id),
    label: asString(rec.label),
    headline: asString(rec.headline),
    clarificationHint: asString(rec.clarificationHint),
    situation: asString(rec.situation),
    constraints: asString(rec.constraints),
    posture,
    leaning_direction: asString(rec.leaning_direction),
    knowns_assumptions: asString(rec.knowns_assumptions),
    unknowns: asString(rec.unknowns),
    variantPrompt: asString(rec.variantPrompt),
    researchStarter: parseResearchStarter(rec.researchStarter),
  };
}

export function parseVoiceInfluenceDraftInput(
  value: unknown
): { ok: true; data: VoiceInfluenceDraftInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Expected a draft object" };
  }
  const rec = value as Record<string, unknown>;
  const rawConditions = rec.conditions;
  if (!Array.isArray(rawConditions) || rawConditions.length !== VOICE_INFLUENCE_SLOTS.length) {
    return { ok: false, error: "A Voice Influence case set must have exactly five conditions (C1–C5)." };
  }
  const conditions: VoiceInfluenceCase[] = [];
  for (const [index, slot] of VOICE_INFLUENCE_SLOTS.entries()) {
    const parsed = parseVoiceInfluenceCase(rawConditions[index]);
    if (!parsed) {
      return { ok: false, error: `${slot.code} is not a valid voice case.` };
    }
    conditions.push({ ...parsed, id: slot.key });
  }
  return {
    ok: true,
    data: {
      name: asString(rec.name),
      decision: asString(rec.decision),
      domain: asString(rec.domain),
      conditions,
    },
  };
}

export type DiffToken = { text: string; kind: "same" | "added" | "removed" };

function tokenizeForDiff(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

/** Word-level LCS diff so C2–C5 isolation is visible against C1. */
export function diffTextAgainstBaseline(baseline: string, variant: string): DiffToken[] {
  if (baseline === variant) {
    return baseline ? [{ text: baseline, kind: "same" }] : [];
  }
  const a = tokenizeForDiff(baseline);
  const b = tokenizeForDiff(variant);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? (dp[i + 1]![j + 1] ?? 0) + 1 : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
    }
  }
  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      tokens.push({ text: a[i]!, kind: "same" });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      tokens.push({ text: a[i]!, kind: "removed" });
      i += 1;
    } else {
      tokens.push({ text: b[j]!, kind: "added" });
      j += 1;
    }
  }
  while (i < n) {
    tokens.push({ text: a[i]!, kind: "removed" });
    i += 1;
  }
  while (j < m) {
    tokens.push({ text: b[j]!, kind: "added" });
    j += 1;
  }
  return tokens;
}

export function fieldText(condition: VoiceInfluenceCase, field: VoiceInfluenceIntakeField): string {
  if (field === "researchStarter") {
    const r = condition.researchStarter;
    return [r.label, r.group_title, r.prompt].join("\n");
  }
  if (field === "leaning_direction") {
    return condition.leaning_direction ?? "";
  }
  return String(condition[field] ?? "");
}
