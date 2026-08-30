/** Shared copy for the product “How it works” flow — homepage + /how-it-works. */

export type HowItWorksStep = {
  n: string;
  title: string;
  desc: string;
};

export const HOW_IT_WORKS_INTRO = {
  beforeLink:
    "You bring the decision. Decision Copilot brings independent perspectives pressure-testing the same problem, then creates a ",
  linkLabel: "Unified Brief",
  afterLink: " with plans you can refine and act on.",
} as const;

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    n: "1",
    title: "Describe what's on the table",
    desc: "Lay out the decision as you see it — situation, what you know, what's still unclear. Then tell your think tank how to analyze it: compare options, gut-check a favorite, show the opposition case, surface risks, or widen the alternatives — so the analysis matches the kind of help you need.",
  },
  {
    n: "2",
    title: "Convene your think tank",
    desc: "Run a single AI model or several at once. Each one reads the same brief and produces its own structured analysis — so you're not relying on one voice for a complicated call.",
  },
  {
    n: "3",
    title: "Answer what the models need to know",
    desc: "Before finalizing, the models ask follow-up questions — missing context and details they can't safely assume without your clarification. Your answers sharpen the analysis.",
  },
  {
    n: "4",
    title: "Get a brief you can use",
    desc: "Each run produces a structured decision brief — risks, tradeoffs, stakeholder impacts, recommendation, next steps. Read it, edit it in place, and discuss it with the models. When you've run a think tank, merge into one Unified Brief — then challenge the synthesis or regenerate when you want the merge to change.",
  },
];

export const HOW_IT_WORKS_UNIFIED_BRIEF_CTA = "What's in a Unified Brief →";
