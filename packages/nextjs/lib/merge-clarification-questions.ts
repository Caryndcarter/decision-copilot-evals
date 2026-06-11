import type { DecisionRunResult, LensQuestion } from "@/types/decision";

export interface CombinedClarificationQuestion {
  /** Stable id for form state and batch submit: `run_id:lens-question_id` */
  entry_id: string;
  run_id: string;
  provider: string;
  lens: LensQuestion["lens"];
  question_id: string;
  question_text: string;
  answer_type: LensQuestion["answer_type"];
  options?: string[];
  required?: boolean;
}

const PROVIDER_ORDER = ["openai", "anthropic", "gemini", "xai"] as const;
export const LENS_THEME_ORDER: Record<string, number> = { risk: 0, people: 1, reversibility: 2 };

export const LENS_THEME_LABELS: Record<string, string> = {
  risk: "Risk",
  people: "People",
  reversibility: "Reversibility",
};

export function combinedQuestionEntryId(
  run_id: string,
  q: Pick<LensQuestion, "lens" | "question_id">
): string {
  return `${run_id}:${q.lens}-${q.question_id}`;
}

export function getAwaitingClarificationRuns(runs: DecisionRunResult[]): DecisionRunResult[] {
  return runs.filter(
    (r) =>
      !r.freeform_output &&
      r.status === "awaiting_clarification" &&
      (r.clarification_questions?.length ?? 0) > 0
  );
}

/** True when 2+ structured runs share a posture and still need clarification answers. */
export function canCombineClarifications(runs: DecisionRunResult[]): boolean {
  const awaiting = getAwaitingClarificationRuns(runs);
  if (awaiting.length < 2) return false;
  const postures = new Set(awaiting.map((r) => r.intake.posture));
  return postures.size === 1;
}

/** All clarification questions from every awaiting run, with provider attribution (no deduplication). */
export function listCombinedClarificationQuestions(
  runs: DecisionRunResult[]
): CombinedClarificationQuestion[] {
  const awaiting = getAwaitingClarificationRuns(runs);
  const items: CombinedClarificationQuestion[] = [];

  for (const run of awaiting) {
    const provider = run.llm_provider ?? "openai";
    for (const q of run.clarification_questions ?? []) {
      items.push({
        entry_id: combinedQuestionEntryId(run.run_id, q),
        run_id: run.run_id,
        provider,
        lens: q.lens,
        question_id: q.question_id,
        question_text: q.question_text,
        answer_type: q.answer_type,
        options: q.options,
        required: q.required,
      });
    }
  }

  return items.sort((a, b) => {
    const la = LENS_THEME_ORDER[a.lens] ?? 9;
    const lb = LENS_THEME_ORDER[b.lens] ?? 9;
    if (la !== lb) return la - lb;
    const pa = PROVIDER_ORDER.indexOf(a.provider as (typeof PROVIDER_ORDER)[number]);
    const pb = PROVIDER_ORDER.indexOf(b.provider as (typeof PROVIDER_ORDER)[number]);
    const providerCmp = (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    if (providerCmp !== 0) return providerCmp;
    return a.question_text.localeCompare(b.question_text);
  });
}

/** @deprecated Use listCombinedClarificationQuestions */
export const mergeClarificationQuestions = listCombinedClarificationQuestions;

/** Convert combined list to LensQuestion[] for demo quick-fill helpers. */
export function combinedToLensQuestions(
  questions: CombinedClarificationQuestion[]
): LensQuestion[] {
  return questions.map((m) => ({
    question_id: m.entry_id,
    lens: m.lens,
    question_text: m.question_text,
    answer_type: m.answer_type,
    options: m.options,
    required: m.required,
  }));
}

/** @deprecated Use combinedToLensQuestions */
export const mergedToLensQuestions = combinedToLensQuestions;
