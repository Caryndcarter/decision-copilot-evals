/**
 * Canned tour chat — Meran Tankers language from the frozen tour briefs.
 * No API calls. Used only by the demo Decision Brief and Unified Brief rails.
 */

export type DemoChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type DemoChatScript = {
  id: "decision-brief" | "unified-brief";
  composerPlaceholder: string;
  thinkingLabel: string;
  /** Decision Brief shows Send + Research; Unified Brief shows Send only. */
  showResearch: boolean;
  discussWith?: readonly ("openai" | "anthropic" | "gemini" | "xai")[];
  discussWithSelected?: "openai" | "anthropic" | "gemini" | "xai";
  turns: DemoChatTurn[];
};

export const DEMO_DECISION_BRIEF_CHAT: DemoChatScript = {
  id: "decision-brief",
  composerPlaceholder: "Message…",
  thinkingLabel: "Thinking…",
  showResearch: true,
  turns: [
    {
      role: "user",
      content:
        "If war-risk premiums go to 7–8% after another convoy incident, does the NOC renewal still make sense as drafted?",
    },
    {
      role: "assistant",
      content:
        "No. At 5% of a ~$62M hull the premium is already about $3.1M per voyage against $1.4–1.7M of contribution before it. At 7–8% that voyage math goes negative unless rates reprice with the premium.\n\nDon’t sign the twelve-month NOC as drafted. Require automatic premium pass-through and keep a shorter, reversible trading-house pilot so you can step back if the escort or insurance market moves.",
    },
  ],
};

export const DEMO_UNIFIED_BRIEF_CHAT: DemoChatScript = {
  id: "unified-brief",
  composerPlaceholder: "Ask ChatGPT about this Unified Brief…",
  thinkingLabel: "ChatGPT is thinking…",
  showResearch: false,
  discussWith: ["anthropic", "openai", "gemini", "xai"],
  discussWithSelected: "openai",
  turns: [
    {
      role: "user",
      content:
        "Why not just lock the twelve-month NOC renewal if customers want capacity?",
    },
    {
      role: "assistant",
      content:
        "All four models treat that as converting a provisional lean into a brittle obligation. The commercial case for staying in-lane is real, but it rests on the ~5% war-risk premium holding and being passed through — neither is contractually secured mid-term.\n\nThe Unified Brief’s recommendation is: renew the trading house only with defined break triggers and premium pass-through; put conditional terms to the NOC rather than pre-conceding its eight-lifting structure; and don’t sign until the board has a written stop-trigger list with named authority to freeze fixtures within hours.",
    },
  ],
};

export function demoChatHasNoLiveApi(script: DemoChatScript): boolean {
  const blob = JSON.stringify(script);
  return !/\/api\/decision/.test(blob) && script.turns.some((t) => t.role === "user") && script.turns.some((t) => t.role === "assistant");
}
