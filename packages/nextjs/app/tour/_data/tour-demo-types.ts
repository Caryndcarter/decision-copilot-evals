/**
 * Shared types + content-agnostic labels for the `/tour` and `/demo/*` frozen
 * demo. The actual scenario content lives in one of the sibling data modules
 * (`tour-demo-data-meran-tankers.ts`, `tour-demo-data-vercel-aws.ts`), and the
 * active one is selected by the `tour-demo-data.ts` barrel.
 */

export type TourProvider = "openai" | "anthropic" | "gemini" | "xai";

export interface TourIntake {
  situation: string;
  constraints: string;
  posture: string;
  leaning_direction: string;
  knowns_assumptions: string;
  unknowns: string;
}

export interface TourClarification {
  lens: "risk" | "reversibility" | "people";
  question: string;
  answer: string;
}

export interface TourLensSnapshot {
  risk: { top: string[]; confidence: string };
  reversibility: { hard_to_undo: string[]; safe_first: string[] };
  people: { impacts: { who: string; sentiment: string; note: string }[] };
}

export interface TourProviderRun {
  provider: TourProvider;
  brief: {
    title: string;
    summary: string;
    recommendation: string;
    next_steps: string[];
  };
  lenses: TourLensSnapshot;
}

export interface TourDisagreement {
  label: string;
  rows: { provider: TourProvider; stance: string }[];
}

export interface TourUnifiedBrief {
  title: string;
  summary: string;
  recommendation: string;
  key_considerations: string[];
  next_steps: string[];
  contributions: { provider: TourProvider; note: string }[];
}

/** Scenario identity — swapped together with the content so ids/labels match. */
export interface TourScenario {
  decisionId: string;
  label: string;
}

export const PROVIDER_TAB_LABEL: Record<TourProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  xai: "xAI",
};

export const POSTURE_LABEL: Record<string, string> = {
  pressure_test: "Challenge my leaning",
  surface_risks: "Surface risks first",
  explore: "Compare options openly",
};

export const LENS_LABEL = {
  risk: "Risk",
  reversibility: "Reversibility",
  people: "Stakeholders",
} as const;
