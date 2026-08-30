/**
 * Illustrative contribution attribution for the product tour's Unified Brief step.
 *
 * The real ported decision did not include a generated contributions analysis, so
 * this is a hand-authored, clearly-labeled mock that mirrors the tone of the real
 * `synthesis.overall_summary`. In the live product, this panel is generated from the
 * actual runs (see the "Contributions" view on the Unified Brief page).
 */

import type { TourProvider } from "./tour-decision";

export type TourInfluence = "high" | "medium" | "low";

export interface TourContribution {
  provider: TourProvider;
  influence: TourInfluence;
  adopted: string;
  unique_angle: string;
}

export const TOUR_CONTRIBUTIONS: TourContribution[] = [
  {
    provider: "gemini",
    influence: "high",
    adopted:
      "The concrete architecture recommendation — AWS Bedrock private endpoints — with cost figures and a named customer-acceptance condition.",
    unique_angle:
      "Only model to land on a specific, timeline-feasible technical path (with a 7-year audit-log and BAA specificity).",
  },
  {
    provider: "anthropic",
    influence: "high",
    adopted:
      "Risk sequencing and irreversibility logic: ship US-only behind a feature flag while compliance runs in parallel.",
    unique_angle:
      "Framed hallucination/output liability and the governance-ownership vacuum as compounding, first-class risks.",
  },
  {
    provider: "xai",
    influence: "medium",
    adopted:
      "Grounding the plan in hard deadlines and revenue at stake ($1.2M ARR, Aug 15 RFP, Sep 30 beta).",
    unique_angle:
      "Revenue-contingency mechanics and the sharpest deal-pressure trigger scenarios.",
  },
  {
    provider: "openai",
    influence: "low",
    adopted:
      "Reinforced the core risk cluster (EU AI Act classification, cross-border transfer, subprocessor demands).",
    unique_angle:
      "Broad coverage that corroborated the consensus rather than adding a novel angle.",
  },
];
