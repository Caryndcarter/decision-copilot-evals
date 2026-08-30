import type {
  Clarification,
  ClarificationAnswer,
  Confidence,
  DecisionBrief,
  DecisionRunResult,
  Lens,
  LensOutput,
  LensQuestion,
  LLMProviderName,
} from "@/types/decision";
import {
  TOUR_CLARIFICATIONS,
  TOUR_INTAKE,
  TOUR_RUNS,
  TOUR_UNIFIED_BRIEF,
  type TourProvider,
} from "@/app/tour/_data/tour-demo-data";

export const DEMO_DECISION_ID = "demo-vp-sales";
export const DEMO_SCENARIO_LABEL = "Underperforming VP Sales";
export const DEMO_PROVIDERS: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];

const GENERATED_AT = "2026-08-15T14:30:00.000Z";

export const DEMO_INTAKE = {
  decision_id: DEMO_DECISION_ID,
  situation: TOUR_INTAKE.situation,
  constraints: TOUR_INTAKE.constraints,
  posture: "pressure_test" as const,
  leaning_direction: TOUR_INTAKE.leaning_direction,
  knowns_assumptions: TOUR_INTAKE.knowns_assumptions,
  unknowns: TOUR_INTAKE.unknowns,
};

const LENS_MAP: Record<(typeof TOUR_CLARIFICATIONS)[number]["lens"], Lens> = {
  risk: "risk",
  reversibility: "reversibility",
  people: "stakeholders",
};

export const DEMO_CLARIFICATION_QUESTIONS: LensQuestion[] = TOUR_CLARIFICATIONS.map((c, i) => ({
  question_id: `demo-q-${i + 1}`,
  lens: LENS_MAP[c.lens],
  question_text: c.question,
  answer_type: "short_text" as const,
  required: true,
}));

function clarificationAnswers(runId: string): ClarificationAnswer[] {
  return DEMO_CLARIFICATION_QUESTIONS.map((q, i) => ({
    question_id: q.question_id,
    lens: q.lens,
    answer: TOUR_CLARIFICATIONS[i]!.answer,
    answer_type: "short_text" as const,
  }));
}

function clarificationsForRun(runId: string): Clarification[] {
  return [
    {
      decision_id: DEMO_DECISION_ID,
      run_id: runId,
      clarification_round: 1,
      answers: clarificationAnswers(runId),
    },
  ];
}

function mapSentiment(s: string): "positive" | "negative" | "neutral" {
  if (s === "positive" || s === "negative" || s === "neutral") return s;
  return "neutral";
}

function buildLensOutputs(
  provider: TourProvider,
  confidence: Confidence
): LensOutput[] {
  const run = TOUR_RUNS.find((r) => r.provider === provider)!;
  const risk: LensOutput = {
    lens: "risk",
    confidence: run.lenses.risk.confidence as Confidence,
    assumptions_detected: [],
    blind_spots: [],
    tradeoffs: [],
    remaining_uncertainty: [],
    questions_to_answer_next: [],
    top_risks: run.lenses.risk.top,
  };
  const reversibility: LensOutput = {
    lens: "reversibility",
    confidence,
    assumptions_detected: [],
    blind_spots: [],
    tradeoffs: [],
    remaining_uncertainty: [],
    questions_to_answer_next: [],
    irreversible_steps: run.lenses.reversibility.hard_to_undo,
    safe_to_try_first: run.lenses.reversibility.safe_first,
  };
  const stakeholders: LensOutput = {
    lens: "stakeholders",
    confidence,
    assumptions_detected: [],
    blind_spots: [],
    tradeoffs: [],
    remaining_uncertainty: [],
    questions_to_answer_next: [],
    stakeholder_impacts: run.lenses.people.impacts.map((imp) => ({
      stakeholder: imp.who,
      impact: imp.note,
      sentiment: mapSentiment(imp.sentiment),
    })),
    execution_risks: [],
  };
  return [risk, reversibility, stakeholders];
}

function buildBrief(provider: TourProvider): DecisionBrief {
  const b = TOUR_RUNS.find((r) => r.provider === provider)!.brief;
  return {
    title: b.title,
    generated_at: GENERATED_AT,
    summary: b.summary,
    recommendation: b.recommendation,
    key_considerations: [],
    next_steps: b.next_steps,
  };
}

export function demoRunId(provider: LLMProviderName): string {
  return `demo-vp-sales-${provider}`;
}

export function buildDemoRun(provider: LLMProviderName): DecisionRunResult {
  const runId = demoRunId(provider);
  const tour = TOUR_RUNS.find((r) => r.provider === provider)!;
  const confidence = tour.lenses.risk.confidence as Confidence;
  const lens_outputs = buildLensOutputs(provider, confidence);
  const decision_brief = buildBrief(provider);

  return {
    decision_id: DEMO_DECISION_ID,
    run_id: runId,
    status: "complete",
    intake: DEMO_INTAKE,
    clarification_questions: DEMO_CLARIFICATION_QUESTIONS,
    clarification_needed: false,
    clarifications: clarificationsForRun(runId),
    lens_outputs,
    decision_title: decision_brief.title,
    decision_brief,
    llm_provider: provider,
    demo_scenario_id: "vp-sales-underperforming",
  };
}

export const DEMO_RUNS: DecisionRunResult[] = DEMO_PROVIDERS.map(buildDemoRun);

export function getDemoRun(provider: LLMProviderName): DecisionRunResult {
  return DEMO_RUNS.find((r) => r.llm_provider === provider) ?? DEMO_RUNS[0]!;
}

export const DEMO_UNIFIED_BRIEF: DecisionBrief = {
  title: TOUR_UNIFIED_BRIEF.title,
  generated_at: GENERATED_AT,
  summary: TOUR_UNIFIED_BRIEF.summary,
  recommendation: TOUR_UNIFIED_BRIEF.recommendation,
  key_considerations: TOUR_UNIFIED_BRIEF.key_considerations,
  next_steps: [
    "Draft board metrics memo before announcing ops scope.",
    "Assign ops to CRM/forecast cadence for 60 days.",
    "Pre-brief top accounts on continuity within two weeks.",
  ],
};
