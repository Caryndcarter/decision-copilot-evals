import { describe, expect, it } from "vitest";
import { DEMO_BRIEF_GUIDE_STEPS, DEMO_UNIFIED_GUIDE_STEPS } from "./demo-brief-guide";
// The Vercel/AWS tour is archived (not the active dataset); this guard covers
// the content scrub that applied to it specifically.
import { TOUR_RUNS } from "@/app/tour/_data/tour-demo-data-vercel-aws";

describe("demo Decision Brief guide", () => {
  it("walks picker, collapsed sections, canned chat, then Unified Brief", () => {
    expect(DEMO_BRIEF_GUIDE_STEPS.map((s) => s.spot)).toEqual([
      "provider-picker",
      "analysis-sections",
      "demo-chat",
      "unified-cta",
    ]);
    expect(DEMO_BRIEF_GUIDE_STEPS[1].extraSpots).toContain("lens-section");
    expect(DEMO_BRIEF_GUIDE_STEPS[2].pauseAuto).toBe(true);
    const copy = DEMO_BRIEF_GUIDE_STEPS.map((s) => `${s.title} ${s.body}`).join("\n");
    expect(copy).not.toMatch(/dogfood/i);
    expect(copy).toMatch(/collapsed/i);
    expect(copy).toMatch(/chat/i);
    expect(copy).toMatch(/API/i);
  });

  it("pauses the Unified Brief guide on the canned discuss rail", () => {
    expect(DEMO_UNIFIED_GUIDE_STEPS.map((s) => s.spot)).toEqual(["demo-chat"]);
    expect(DEMO_UNIFIED_GUIDE_STEPS[0].pauseAuto).toBe(true);
    expect(DEMO_UNIFIED_GUIDE_STEPS[0].body).toMatch(/no live model/i);
  });

  it("replaces the xAI dogfood line with a plain-language trial", () => {
    const xai = TOUR_RUNS.find((r) => r.provider === "xai");
    const safe = xai?.lenses.reversibility.safe_first.join(" ") ?? "";
    expect(safe).not.toMatch(/dogfood/i);
    expect(safe).toMatch(/team only/i);
    expect(safe).toMatch(/customer-facing cutover/i);
  });

});
