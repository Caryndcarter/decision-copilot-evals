import { resolveClarificationUiAnswerType } from "@/lib/clarification-answer-type";
import { clarificationQuestionKey, type ClarificationAnswersMap } from "@/lib/clarification-answers";
import type { DemoSampleQuestion } from "@/lib/clarification-demo-samples-types";
import type { LensQuestion } from "@/types/decision";

export function demoSampleQuestionsToLensQuestions(questions: DemoSampleQuestion[]): LensQuestion[] {
  return questions.map((q) => ({
    question_id: q.answer_key.startsWith(`${q.lens}-`)
      ? q.answer_key.slice(q.lens.length + 1)
      : q.answer_key,
    lens: q.lens,
    question_text: q.question_text,
    answer_type: q.ui_answer_type,
    options: q.options,
  }));
}

export function buildDemoSampleForQuestion(q: DemoSampleQuestion): string | number | boolean {
  const uiType = q.ui_answer_type;
  if (uiType === "percentage") return 50;
  if (uiType === "numeric") return 5;
  if (uiType === "enum" && q.options?.length) return q.options[0]!;
  return "Moderate impact expected. Need more data to assess fully.";
}

/** Static fallback when Gemini demo generation is unavailable. */
export function buildDemoClarificationSamples(questions: LensQuestion[]): ClarificationAnswersMap {
  const samples: ClarificationAnswersMap = {};
  for (const q of questions) {
    const key = clarificationQuestionKey(q);
    const uiType = resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options);
    if (uiType === "percentage") samples[key] = 50;
    else if (uiType === "numeric") samples[key] = 5;
    else if (uiType === "enum" && q.options?.length) samples[key] = q.options[0]!;
    else samples[key] = "Moderate impact expected. Need more data to assess fully.";
  }
  return samples;
}

export function buildDemoClarificationUnknowns(questions: LensQuestion[]): ClarificationAnswersMap {
  const unknowns: ClarificationAnswersMap = {};
  for (const q of questions) {
    const key = clarificationQuestionKey(q);
    const uiType = resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options);
    if (uiType === "percentage" || uiType === "numeric") unknowns[key] = 0;
    else if (uiType === "enum" && q.options?.length)
      unknowns[key] = q.options[q.options.length - 1]!;
    else unknowns[key] = "Unknown";
  }
  return unknowns;
}
