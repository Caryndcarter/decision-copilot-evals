import { describe, expect, it } from "vitest";
import { HORMUZ_VOICE_CASES } from "./hormuz-voice-cases";
import { MERIDIAN_IC_VOICE_CASES } from "./meridian-ic-voice-cases";
import {
  COMING_LATER_STUDY_TYPES,
  VOICE_INFLUENCE_INTAKE_FIELDS,
  VOICE_INFLUENCE_SLOTS,
  VOICE_INFLUENCE_STUDY_TYPE,
  diffTextAgainstBaseline,
  emptyVoiceInfluenceConditions,
  parseVoiceInfluenceCase,
  parseVoiceInfluenceDraftInput,
} from "./voice-influence-case-set";

const INTAKE_KEYS = [
  "situation",
  "constraints",
  "posture",
  "leaning_direction",
  "knowns_assumptions",
  "unknowns",
  "variantPrompt",
  "researchStarter",
] as const;

describe("Voice Influence case-set schema", () => {
  it("reuses Hormuz / Meridian intake field names", () => {
    expect(VOICE_INFLUENCE_INTAKE_FIELDS).toEqual([...INTAKE_KEYS]);
    const hormuz = HORMUZ_VOICE_CASES[0]!;
    const meridian = MERIDIAN_IC_VOICE_CASES[0]!;
    for (const key of INTAKE_KEYS) {
      expect(hormuz).toHaveProperty(key);
      expect(meridian).toHaveProperty(key);
    }
    const parsed = parseVoiceInfluenceCase(hormuz);
    expect(parsed?.situation).toBe(hormuz.situation);
    expect(parsed?.researchStarter.prompt).toBe(hormuz.researchStarter.prompt);
    expect(parsed?.posture).toBe("pressure_test");
  });

  it("pre-labels C1–C5 the way the batteries do", () => {
    expect(VOICE_INFLUENCE_SLOTS.map((s) => `${s.code} ${s.title}`)).toEqual([
      "C1 baseline voice",
      "C2 confident tone",
      "C3 false urgency",
      "C4 false claim",
      "C5 honest tradeoff",
    ]);
    const conditions = emptyVoiceInfluenceConditions();
    expect(conditions).toHaveLength(5);
    expect(conditions.map((c) => c.id)).toEqual(["c1", "c2", "c3", "c4", "c5"]);
    expect(conditions.every((c) => c.posture === "pressure_test")).toBe(true);
    expect(conditions[0]!.label).toBe("C1 baseline voice");
  });

  it("rejects drafts that are not five conditions", () => {
    const four = emptyVoiceInfluenceConditions().slice(0, 4);
    const result = parseVoiceInfluenceDraftInput({
      name: "Test",
      decision: "Decide X",
      domain: "ops",
      conditions: four,
    });
    expect(result.ok).toBe(false);
  });

  it("normalizes a five-condition draft without inventing fields", () => {
    const result = parseVoiceInfluenceDraftInput({
      name: "Meran draft",
      decision: "Keep sailing Hormuz or go Cape?",
      domain: "tanker ops",
      studyType: VOICE_INFLUENCE_STUDY_TYPE,
      conditions: emptyVoiceInfluenceConditions().map((c, i) => ({
        ...c,
        situation: i === 0 ? "Baseline situation" : c.situation,
      })),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.conditions[0]!.situation).toBe("Baseline situation");
    expect(result.data.conditions[1]!.id).toBe("c2");
  });

  it("diffs C2 against C1 so isolation is visible", () => {
    const tokens = diffTextAgainstBaseline("same facts hedged", "same facts locked in");
    const added = tokens.filter((t) => t.kind === "added").map((t) => t.text).join("");
    const removed = tokens.filter((t) => t.kind === "removed").map((t) => t.text).join("");
    expect(removed).toContain("hedged");
    expect(added).toContain("locked");
    expect(tokens.some((t) => t.kind === "same" && t.text === "same")).toBe(true);
  });

  it("keeps other study types disabled / coming later", () => {
    expect(COMING_LATER_STUDY_TYPES.map((t) => t.id)).toEqual([
      "authorship-influence",
      "replication",
    ]);
  });
});
