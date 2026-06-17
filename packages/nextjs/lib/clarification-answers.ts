import type { ClarificationAnswer, LensQuestion } from "@/types/decision";
import { resolveStoredAnswerType } from "@/lib/clarification-answer-type";

export type ClarificationAnswersMap = Record<string, string | number | boolean>;

export function clarificationQuestionKey(q: { lens: string; question_id: string }) {
  return `${q.lens}-${q.question_id}`;
}

function parseAnswerValue(
  q: LensQuestion,
  raw: string | number | boolean | undefined
): string | number | boolean {
  if (q.answer_type === "boolean") {
    if (raw === "unknown" || raw === null || raw === undefined) {
      return "unknown";
    }
    if (typeof raw === "string") {
      const s = raw.trim().toLowerCase();
      if (s === "yes" || s === "true") return true;
      if (s === "no" || s === "false") return false;
      if (s === "unknown") return "unknown";
      return raw.trim();
    }
    return raw === true || raw === "true" || raw === "yes";
  }

  if (q.answer_type === "numeric" || q.answer_type === "percentage") {
    if (typeof raw === "number") return raw;
    if (typeof raw === "string" && raw.trim() !== "") {
      const trimmed = raw.trim();
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
      return trimmed;
    }
    return Number(raw) ?? 0;
  }

  return typeof raw === "string" ? raw : String(raw ?? "");
}

/** Build API payload for clarification submit / reapply (same shape as initial clarification POST). */
export function buildClarificationAnswersForSubmit(
  questions: LensQuestion[],
  clarificationAnswers: ClarificationAnswersMap
): ClarificationAnswer[] {
  return questions.map((q: LensQuestion) => {
    const answer = parseAnswerValue(q, clarificationAnswers[clarificationQuestionKey(q)]);
    return {
      question_id: q.question_id,
      lens: q.lens,
      answer,
      answer_type: resolveStoredAnswerType(q.answer_type, answer),
    };
  });
}
