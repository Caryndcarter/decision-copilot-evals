import { describe, expect, it } from "vitest";
import { DEMO_BRIEF_EXCERPT_NOTE } from "./demo-brief-toolbar";

describe("demo brief excerpt note", () => {
  it("labels both demo briefs as shortened, not broken", () => {
    expect(DEMO_BRIEF_EXCERPT_NOTE).toMatch(/shortened for the tour/i);
    expect(DEMO_BRIEF_EXCERPT_NOTE).toMatch(/much longer/i);
    expect(DEMO_BRIEF_EXCERPT_NOTE).not.toMatch(/truncat/i);
    expect(DEMO_BRIEF_EXCERPT_NOTE).not.toMatch(/dogfood/i);
  });
});
