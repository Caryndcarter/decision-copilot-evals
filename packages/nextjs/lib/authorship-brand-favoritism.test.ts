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
});
