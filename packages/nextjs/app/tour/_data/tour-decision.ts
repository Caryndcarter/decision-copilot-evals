/**
 * Frozen demo data for the public product tour (`/tour`).
 *
 * Source: one real, completed multi-model decision (4 provider runs + a synthesized
 * Unified Brief) exported from the runs collection, then trimmed and anonymized.
 * The tour renders this static snapshot only — it never calls model APIs or the DB,
 * so visitors can experience the full flow without signing in.
 *
 * Types are intentionally self-contained (a light superset of the fields the tour
 * renders) so this module does not couple the marketing page to the product's
 * internal run schema.
 */

import rawTourDecision from "./tour-decision.json";

export type TourProvider = "openai" | "anthropic" | "gemini" | "xai";
export type TourLensName = "risk" | "reversibility" | "people";

export interface TourTradeoff {
  option: string;
  upside: string;
  downside: string;
}

export interface TourBlindSpot {
  area: string;
  description: string;
}

export interface TourStakeholderImpact {
  stakeholder: string;
  sentiment: "positive" | "negative" | "neutral" | string;
  impact: string;
}

export interface TourLensOutput {
  lens: TourLensName;
  confidence?: string;
  top_risks?: string[];
  irreversible_steps?: string[];
  safe_to_try_first?: string[];
  stakeholder_impacts?: TourStakeholderImpact[];
  execution_risks?: string[];
  blind_spots?: TourBlindSpot[];
  tradeoffs?: TourTradeoff[];
  assumptions_detected?: string[];
  remaining_uncertainty?: string[];
}

export interface TourClarificationQuestion {
  question_text: string;
  lens: TourLensName;
  answer_type: string;
  question_id: string;
  required?: boolean;
  options?: string[];
}

export interface TourBriefCustomSection {
  heading: string;
  content: string;
}

export interface TourBrief {
  title: string;
  summary: string;
  recommendation: string;
  key_considerations?: string[];
  next_steps?: string[];
  custom_sections?: TourBriefCustomSection[];
  generated_at?: string;
}

export interface TourSynthesisPoint {
  area: string;
  description: string;
  providers?: string[];
}

export interface TourSynthesis {
  consensus?: TourSynthesisPoint[];
  majority_view?: TourSynthesisPoint[];
  minority_opinions?: TourSynthesisPoint[];
  overall_summary?: string;
  providers?: string[];
}

export interface TourRun {
  provider: TourProvider;
  decision_title: string;
  decision_brief: TourBrief;
  lens_outputs: TourLensOutput[];
  clarification_questions: TourClarificationQuestion[];
}

export interface TourIntake {
  situation: string;
  constraints: string;
  posture: string;
  knowns_assumptions: string;
  unknowns: string;
}

export interface TourData {
  decision_id: string;
  intake: TourIntake;
  providers: TourProvider[];
  runs: TourRun[];
  synthesis: TourSynthesis;
  unified_brief: TourBrief;
}

export const tourDecision = rawTourDecision as unknown as TourData;

/** Display metadata for provider pills — palette mirrors the homepage hero. */
export const PROVIDER_META: Record<
  TourProvider,
  { label: string; pill: string; dot: string }
> = {
  openai: {
    label: "OpenAI",
    pill: "text-emerald-300 bg-emerald-950/60 border-emerald-800/50",
    dot: "bg-emerald-400",
  },
  anthropic: {
    label: "Anthropic",
    pill: "text-orange-300 bg-orange-950/60 border-orange-800/50",
    dot: "bg-orange-400",
  },
  gemini: {
    label: "Google Gemini",
    pill: "text-blue-300 bg-blue-950/60 border-blue-800/50",
    dot: "bg-blue-400",
  },
  xai: {
    label: "xAI",
    pill: "text-zinc-300 bg-zinc-800/60 border-zinc-700/50",
    dot: "bg-zinc-400",
  },
};

/** Human-readable label for the analysis posture stored on the intake. */
export const POSTURE_LABELS: Record<string, string> = {
  explore: "Compare options openly",
  pressure_test: "Challenge my leaning",
  show_opposition: "Show me the opposition",
  surface_risks: "Risk-first — surface what could go wrong",
  generate_alternatives: "Widen the option set",
};

export function postureLabel(posture: string): string {
  return POSTURE_LABELS[posture] ?? posture;
}

export function getRun(data: TourData, provider: TourProvider): TourRun | undefined {
  return data.runs.find((r) => r.provider === provider);
}

export function getLens(run: TourRun, lens: TourLensName): TourLensOutput | undefined {
  return run.lens_outputs.find((l) => l.lens === lens);
}
