import { describe, expect, it } from "vitest";
import { placeGuideCard } from "../_components/demo-brief-guide";
import {
  parseGuideStorage,
  shouldPlayOnGuideChange,
  shouldPlayOnGuideReady,
} from "../_components/demo-replay";

const ready = {
  ready: true,
  dismissed: false,
  spot: "provider-picker" as string | null,
  generation: 0,
};

describe("guide card placement", () => {
  it("keeps a tall last-step card fully on screen when the target is at the bottom", () => {
    const pos = placeGuideCard(
      { top: 920, left: 560, width: 220, height: 40 },
      { width: 1440, height: 980 },
      { width: 320, height: 260 }
    );
    expect(pos.top).toBeGreaterThanOrEqual(16);
    expect(pos.top + 260).toBeLessThanOrEqual(980 - 16);
    expect(pos.arrow).toBe("down");
    const beside = placeGuideCard(
      { top: 920, left: 1100, width: 180, height: 40 },
      { width: 1440, height: 980 },
      { width: 320, height: 260 }
    );
    expect(beside.top + 260).toBeLessThanOrEqual(980 - 16);
  });
});

describe("guide storage", () => {
  it("restores the in-progress step so refresh can replay the same animation", () => {
    expect(parseGuideStorage(null, 3)).toEqual({ dismissed: false, step: 0 });
    expect(parseGuideStorage("dismissed", 3)).toEqual({ dismissed: true, step: 0 });
    expect(parseGuideStorage("2", 3)).toEqual({ dismissed: false, step: 2 });
    expect(parseGuideStorage("9", 3)).toEqual({ dismissed: false, step: 0 });
  });
});

describe("demo replay triggers", () => {
  it("plays on first ready when the guide is already dismissed (refresh / return)", () => {
    expect(
      shouldPlayOnGuideReady({ ...ready, dismissed: true, spot: null }, "demo-chat")
    ).toBe(true);
  });

  it("plays on first ready when the current step is the target", () => {
    expect(shouldPlayOnGuideReady({ ...ready, spot: "demo-chat" }, "demo-chat")).toBe(true);
    expect(shouldPlayOnGuideReady(ready, "demo-chat")).toBe(false);
  });

  it("plays when the guide lands on the target or restarts there", () => {
    expect(
      shouldPlayOnGuideChange(ready, { ...ready, spot: "demo-chat" }, "demo-chat")
    ).toBe(true);
    expect(
      shouldPlayOnGuideChange(
        { ...ready, spot: "demo-chat" },
        { ...ready, spot: "demo-chat", generation: 1 },
        "demo-chat"
      )
    ).toBe(true);
    expect(
      shouldPlayOnGuideChange(
        { ...ready, spot: "demo-chat" },
        { ...ready, spot: "unified-cta" },
        "demo-chat"
      )
    ).toBe(false);
  });
});
