import { describe, expect, it } from "vitest";
import {
  DEMO_DECISION_BRIEF_CHAT,
  DEMO_UNIFIED_BRIEF_CHAT,
  demoChatHasNoLiveApi,
} from "./demo-chat-script";

describe("demo chat scripts", () => {
  it("is a canned user-then-model exchange with no live chat API", () => {
    for (const script of [DEMO_DECISION_BRIEF_CHAT, DEMO_UNIFIED_BRIEF_CHAT]) {
      expect(demoChatHasNoLiveApi(script)).toBe(true);
      expect(script.turns[0]?.role).toBe("user");
      expect(script.turns[1]?.role).toBe("assistant");
      expect(script.turns[0]?.content.length).toBeGreaterThan(20);
      expect(script.turns[1]?.content.length).toBeGreaterThan(40);
    }
  });

  it("stays on the Meran Tankers / Hormuz tour decision", () => {
    const blob = `${DEMO_DECISION_BRIEF_CHAT.turns.map((t) => t.content).join("\n")}\n${DEMO_UNIFIED_BRIEF_CHAT.turns.map((t) => t.content).join("\n")}`;
    expect(blob).toMatch(/NOC/i);
    expect(blob).toMatch(/premium/i);
    expect(blob).not.toMatch(/dogfood/i);
  });

  it("matches product chrome: Decision Brief has Research, Unified does not", () => {
    expect(DEMO_DECISION_BRIEF_CHAT.showResearch).toBe(true);
    expect(DEMO_UNIFIED_BRIEF_CHAT.showResearch).toBe(false);
    expect(DEMO_UNIFIED_BRIEF_CHAT.discussWith).toEqual(["anthropic", "openai", "gemini", "xai"]);
  });
});
