import type { ClarificationAnswer, LensQuestion } from "@/types/decision";

export type ClarificationAnswersMap = Record<string, string | number | boolean>;

export function clarificationQuestionKey(q: { lens: string; question_id: string }) {
  return `${q.lens}-${q.question_id}`;
}

/** Build API payload for clarification submit / reapply (same shape as initial clarification POST). */
export function buildClarificationAnswersForSubmit(
  questions: LensQuestion[],
  clarificationAnswers: ClarificationAnswersMap
): ClarificationAnswer[] {
  return questions.map((q: LensQuestion) => {
    const raw = clarificationAnswers[clarificationQuestionKey(q)];
    let answer: string | number | boolean;
    if (q.answer_type === "boolean") {
      if (raw === "unknown" || raw === null || raw === undefined) {
        answer = "unknown";
      } else if (typeof raw === "string") {
        const s = raw.trim().toLowerCase();
        if (s === "yes" || s === "true") answer = true;
        else if (s === "no" || s === "false") answer = false;
        else if (s === "unknown") answer = "unknown";
        else answer = raw.trim();
      } else {
        answer = raw === true || raw === "true" || raw === "yes";
      }
    } else if (q.answer_type === "numeric" || q.answer_type === "percentage") {
      answer = typeof raw === "number" ? raw : Number(raw) ?? 0;
    } else {
      answer = typeof raw === "string" ? raw : String(raw ?? "");
    }
    return {
      question_id: q.question_id,
      lens: q.lens,
      answer,
      answer_type: q.answer_type,
    };
  });
}
