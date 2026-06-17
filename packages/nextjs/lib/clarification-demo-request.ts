import { resolveClarificationUiAnswerType } from "@/lib/clarification-answer-type";
import { clarificationQuestionKey } from "@/lib/clarification-answers";
import type { LensQuestion } from "@/types/decision";
import type { DemoSampleQuestion } from "@/lib/clarification-demo-samples-types";

export function buildDemoSampleQuestions(questions: LensQuestion[]): DemoSampleQuestion[] {
  return questions.map((q) => ({
    answer_key: clarificationQuestionKey(q),
    lens: q.lens,
    question_text: q.question_text,
    ui_answer_type: resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options),
    options: q.options,
  }));
}
