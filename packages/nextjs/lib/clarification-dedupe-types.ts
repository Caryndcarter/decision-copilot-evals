import type { CombinedClarificationQuestion } from "@/lib/merge-clarification-questions";
import { coerceClarificationAnswer } from "@/lib/clarification-answer-type";
import type { LensQuestion } from "@/types/decision";

export interface DedupedClarificationQuestion {
  /** Stable id for form state and batch submit expansion */
  merge_id: string;
  /** Primary lens for UI grouping (lowest-priority theme when cross-lens) */
  lens: LensQuestion["lens"];
  /** Set when merged questions spanned multiple lens categories */
  lenses?: LensQuestion["lens"][];
  question_text: string;
  answer_type: LensQuestion["answer_type"];
  options?: string[];
  required?: boolean;
  /** Providers that asked this question (or a merged equivalent) */
  providers: string[];
  /** All underlying entry_ids — one answer fans out to each */
  entry_ids: string[];
}

export interface ClarificationDedupeResult {
  unique: DedupedClarificationQuestion[];
  all: CombinedClarificationQuestion[];
  original_count: number;
  unique_count: number;
  dedupe_model: string;
  dedupe_method: "gemini" | "heuristic";
  /** @deprecated Use dedupe_method === "heuristic" */
  fallback?: boolean;
}

export function expandDedupedAnswersToEntryIds(
  answersByMergeId: Record<string, string | number | boolean>,
  unique: DedupedClarificationQuestion[],
  all?: CombinedClarificationQuestion[]
): Record<string, string | number | boolean> {
  const byEntryId = new Map((all ?? []).map((q) => [q.entry_id, q]));
  const out: Record<string, string | number | boolean> = {};
  for (const group of unique) {
    const val = answersByMergeId[group.merge_id];
    if (val === undefined) continue;
    for (const entryId of group.entry_ids) {
      const target = byEntryId.get(entryId);
      out[entryId] = target
        ? coerceClarificationAnswer(val, target.answer_type)
        : val;
    }
  }
  return out;
}

export function dedupedToLensQuestions(unique: DedupedClarificationQuestion[]): LensQuestion[] {
  return unique.map((m) => ({
    question_id: m.merge_id,
    lens: m.lens,
    question_text: m.question_text,
    answer_type: m.answer_type,
    options: m.options,
    required: m.required,
  }));
}
