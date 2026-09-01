import { describe, expect, it } from "vitest";
import { DEMO_BRIEF_GUIDE_STEPS } from "./demo-brief-guide";
// The Vercel/AWS tour is archived (not the active dataset); this guard covers
// the content scrub that applied to it specifically.
import { TOUR_RUNS } from "@/app/tour/_data/tour-demo-data-vercel-aws";

describe("demo Decision Brief guide", () => {
  it("walks picker, collapsed sections, then Unified Brief", () => {
    expect(DEMO_BRIEF_GUIDE_STEPS.map((s) => s.spot)).toEqual([
      "provider-picker",
      "analysis-sections",
      "unified-cta",
    ]);
    expect(DEMO_BRIEF_GUIDE_STEPS[1].extraSpots).toContain("lens-section");
    const copy = DEMO_BRIEF_GUIDE_STEPS.map((s) => `${s.title} ${s.body}`).join("\n");
    expect(copy).not.toMatch(/dogfood/i);
    expect(copy).toMatch(/collapsed/i);
  });

  it("replaces the xAI dogfood line with a plain-language trial", () => {
    const xai = TOUR_RUNS.find((r) => r.provider === "xai");
    const safe = xai?.lenses.reversibility.safe_first.join(" ") ?? "";
    expect(safe).not.toMatch(/dogfood/i);
    expect(safe).toMatch(/team only/i);
    expect(safe).toMatch(/customer-facing cutover/i);
  });

});
