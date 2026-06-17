import type { ClarificationAnswersMap } from "@/lib/clarification-answers";
import type { LensQuestion } from "@/types/decision";

export interface DemoSampleQuestion {
  answer_key: string;
  lens: LensQuestion["lens"];
  question_text: string;
  ui_answer_type: LensQuestion["answer_type"];
  options?: string[];
}

export interface ClarificationDemoSamplesResult {
  answers: ClarificationAnswersMap;
  demo_model: string;
  demo_method: "gemini" | "fallback";
}
