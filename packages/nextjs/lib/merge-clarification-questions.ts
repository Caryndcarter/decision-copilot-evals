import type { DecisionRunResult, LensQuestion } from "@/types/decision";

export interface MergedQuestionBinding {
  run_id: string;
  lens: LensQuestion["lens"];
  question_id: string;
  provider?: string;
}

export interface MergedClarificationQuestion {
  /** Stable id for form state and batch submit payload */
  merge_id: string;
  lens: LensQuestion["lens"];
  question_text: string;
  answer_type: LensQuestion["answer_type"];
  options?: string[];
  required?: boolean;
  /** Providers that asked this question (or a near-duplicate) */
  providers: string[];
  bindings: MergedQuestionBinding[];
}

export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s%$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeKeyForQuestion(q: LensQuestion): string {
  return `${q.lens}|${q.answer_type}|${normalizeQuestionText(q.question_text)}`;
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

export function mergeClarificationQuestions(runs: DecisionRunResult[]): MergedClarificationQuestion[] {
  const awaiting = getAwaitingClarificationRuns(runs);
  const byKey = new Map<string, MergedClarificationQuestion>();

  for (const run of awaiting) {
    const provider = run.llm_provider ?? "openai";
    for (const q of run.clarification_questions ?? []) {
      const key = mergeKeyForQuestion(q);
      const binding: MergedQuestionBinding = {
        run_id: run.run_id,
        lens: q.lens,
        question_id: q.question_id,
        provider,
      };
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.providers.includes(provider)) {
          existing.providers.push(provider);
        }
        existing.bindings.push(binding);
        if (q.required) existing.required = true;
      } else {
        byKey.set(key, {
          merge_id: key,
          lens: q.lens,
          question_text: q.question_text,
          answer_type: q.answer_type,
          options: q.options,
          required: q.required,
          providers: [provider],
          bindings: [binding],
        });
      }
    }
  }

  const lensOrder: Record<string, number> = { risk: 0, reversibility: 1, people: 2 };
  return Array.from(byKey.values()).sort((a, b) => {
    const la = lensOrder[a.lens] ?? 9;
    const lb = lensOrder[b.lens] ?? 9;
    if (la !== lb) return la - lb;
    return a.question_text.localeCompare(b.question_text);
  });
}

/** Convert merged questions to LensQuestion[] for demo quick-fill helpers. */
export function mergedToLensQuestions(merged: MergedClarificationQuestion[]): LensQuestion[] {
  return merged.map((m) => ({
    question_id: m.merge_id,
    lens: m.lens,
    question_text: m.question_text,
    answer_type: m.answer_type,
    options: m.options,
    required: m.required,
  }));
}
