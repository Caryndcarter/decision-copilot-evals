import { describe, expect, it } from "vitest";
import { AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT } from "./authorship-brand-favoritism";
import { getOverviewFinding } from "./model-studies-overview-findings";
import { getMajorFinding } from "./cross-study-findings";

describe("authorship brand favoritism snapshot", () => {
  it("records the Grok-label penalty and remap lift", () => {
    const snap = AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT;
    expect(snap.decisions).toBe(10);
    expect(snap.grok_peer_high.revealed.high).toBe(14);
    expect(snap.grok_peer_high.blind.high).toBe(18);
    expect(snap.grok_peer_high.reassigned.high).toBe(23);
    expect(snap.credit_when_labeled.xai.mean).toBe(3.03);
    expect(snap.credit_when_labeled.openai.mean).toBe(3.58);
    expect(snap.grok_work_shown_as.openai.high).toBe(14);
    expect(snap.grok_work_shown_as.openai.n).toBe(15);
    expect(snap.chatgpt_rates_grok.revealed.mean).toBe(2.8);
    expect(snap.chatgpt_rates_grok.reassigned.mean).toBe(3.6);
  });

  it("is wired as an overview story with evidence", () => {
    const card = getOverviewFinding("brand-favoritism");
    expect(card?.majorFindingId).toBe("grok-brand-penalty");
    expect(card?.visualTheme).toBe("brand-favor");
    expect(card?.headline.toLowerCase()).toMatch(/grok/);
    const major = getMajorFinding("grok-brand-penalty");
    expect(major?.evidence).toHaveLength(3);
    expect(major?.supportingCases[0]?.studyId).toBe("authorship-budget-conditions");
  });

  it("keeps a model-id wording variant with remap frequencies", () => {
    const snap = AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT;
    expect(snap.grok_swaps).toHaveLength(3);
    expect(snap.grok_swaps.map((s) => s.n).sort()).toEqual([10, 15, 15]);
    const chatgptLabel = snap.grok_swaps.find((s) => s.shown_as_key === "openai");
    expect(chatgptLabel?.high).toBe(14);
    expect(chatgptLabel?.chatgpt_as_rater_n).toBe(2);
    expect(chatgptLabel?.by_batch.adequate.shown_as_model).toBe("gpt-5.6-sol");
    expect(chatgptLabel?.by_batch.constrained.real_model).toBe("grok-4.3");
    const geminiLabel = snap.grok_swaps.find((s) => s.shown_as_key === "gemini");
    expect(geminiLabel?.lift_vs_revealed).toBe(0.5);
    const v2 = getOverviewFinding("brand-favoritism-models");
    expect(v2?.compareWording?.href).toBe("/model-studies/findings/brand-favoritism");
    expect(v2?.headline).toMatch(/gpt-5\.6-sol|gpt-5\.5/);
    expect(getMajorFinding("grok-brand-penalty-models")?.evidence).toHaveLength(2);
    expect(snap.think_tank.adequate.xai).toBe("grok-4.5");
    expect(snap.think_tank.constrained.anthropic).toBe("claude-sonnet-4-6");
    expect(snap.credit_when_labeled.xai.mean).toBe(3.03);
  });
});
