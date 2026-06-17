import type { CombinedClarificationQuestion } from "@/lib/merge-clarification-questions";
import type { LensQuestion } from "@/types/decision";

type AnswerType = LensQuestion["answer_type"];

const EXPLANATION_RE =
  /\b(explain|describe|detail|detailed|elaborate|walk (?:me )?through|outline|summarize|what are|how would|why|analysis|assessment|assess|in what way|tell us about|provide context|share your)\b/i;

const FEASIBILITY_RE = /\b(feasib|viable|possible|realistic)\b/i;

function answerTypeRank(type: AnswerType): number {
  switch (type) {
    case "short_text":
      return 5;
    case "enum":
      return 4;
    case "percentage":
    case "numeric":
      return 3;
    case "boolean":
      return 1;
    default:
      return 0;
  }
}

/** True when the question explicitly asks the user to supply a number or amount. */
function isNumericQuestion(text: string): boolean {
  if (/\b(how many|how much)\b/i.test(text)) return true;
  if (/\bwhat (is|are) (the|your) (budget|amount|cost|spending cap|price|number)\b/i.test(text)) {
    return true;
  }
  if (/\b(enter|provide|specify) (a|the|your) (number|amount|budget|figure)\b/i.test(text)) {
    return true;
  }
  return false;
}

function isPercentageQuestion(text: string): boolean {
  return /\b(what percentage|what percent|how many percent)\b/i.test(text);
}

function isYesNoPhrasedQuestion(text: string): boolean {
  return /^(is|are|have|has|do|does|will|can|could|should)\b/i.test(text.trim());
}

/** Feasibility / constraint questions need prose, not a bare number or yes/no. */
function isCompoundAssessmentQuestion(text: string): boolean {
  if (FEASIBILITY_RE.test(text) && /\b(technically|financially|operationally|legally)\b.*\band\b/i.test(text)) {
    return true;
  }
  if (FEASIBILITY_RE.test(text) && /\b(constraints|trade.?offs|factors to consider)\b/i.test(text)) {
    return true;
  }
  if (/\bwithin your (current )?(timeline|budget)\b/i.test(text) && FEASIBILITY_RE.test(text)) {
    return true;
  }
  return false;
}

/** Infer answer shape from question wording — prefer substantive text over yes/no controls. */
export function inferAnswerTypeFromQuestionText(text: string): AnswerType | null {
  if (EXPLANATION_RE.test(text)) return "short_text";
  if (isCompoundAssessmentQuestion(text)) return "short_text";
  if (FEASIBILITY_RE.test(text)) return "short_text";
  if (isYesNoPhrasedQuestion(text)) return "short_text";
  if (isPercentageQuestion(text)) return "percentage";
  if (isNumericQuestion(text)) return "numeric";
  return null;
}

/**
 * Resolve the control shown to the user. Models usually need context, not bare yes/no —
 * upgrade boolean (and mismatched numeric) to short_text unless enum options apply.
 */
export function resolveClarificationUiAnswerType(
  questionText: string,
  memberType: AnswerType,
  options?: string[]
): AnswerType {
  if (memberType === "enum" && options?.length) return "enum";

  const inferred = inferAnswerTypeFromQuestionText(questionText);
  if (inferred) return inferred;

  if (memberType === "boolean") return "short_text";
  if (memberType === "numeric" && !isNumericQuestion(questionText)) return "short_text";
  if (memberType === "percentage" && !isPercentageQuestion(questionText)) return "short_text";
  return memberType;
}

/** Pick the UI answer type for a merged dedupe group. */
export function pickMergedAnswerType(
  members: Pick<CombinedClarificationQuestion, "answer_type" | "options">[],
  canonicalQuestionText: string
): AnswerType {
  const options = members.find((m) => m.options?.length)?.options;
  const memberTypes = members.map((m) => m.answer_type);
  const primaryType =
    memberTypes.every((t) => t === "enum") && options?.length
      ? "enum"
      : memberTypes.reduce(
          (best, t) => (answerTypeRank(t) > answerTypeRank(best) ? t : best),
          memberTypes[0]!
        );

  return resolveClarificationUiAnswerType(canonicalQuestionText, primaryType, options);
}

function parseBooleanToken(value: string): boolean | "unknown" | null {
  const s = value.trim().toLowerCase();
  if (s === "yes" || s === "true") return true;
  if (s === "no" || s === "false") return false;
  if (s === "unknown") return "unknown";
  return null;
}

/** True when a string answer is substantive prose, not a bare yes/no/unknown token. */
export function isProseAnswer(value: string | number | boolean): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return !["yes", "no", "true", "false", "unknown"].includes(lower);
}

/** Persisted type reflects what was actually stored — prose upgrades boolean/numeric to short_text. */
export function resolveStoredAnswerType(
  memberType: AnswerType,
  answer: string | number | boolean
): AnswerType {
  if (memberType === "enum") return "enum";
  if (isProseAnswer(answer)) return "short_text";
  return memberType;
}

/** Coerce one user answer to the shape expected by an underlying question. */
export function coerceClarificationAnswer(
  value: string | number | boolean,
  targetType: AnswerType
): string | number | boolean {
  if (targetType === "boolean") {
    if (value === "unknown" || value === null || value === undefined || value === "") {
      return "unknown";
    }
    if (value === true || value === false) return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const parsed = parseBooleanToken(value);
      if (parsed === "unknown") return "unknown";
      if (parsed !== null) return parsed;
      return value.trim();
    }
    return "unknown";
  }

  if (targetType === "numeric" || targetType === "percentage") {
    if (typeof value === "number") return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  if (value === true) return "yes";
  if (value === false) return "no";
  if (value === "unknown") return "unknown";
  return typeof value === "string" ? value : String(value ?? "");
}
