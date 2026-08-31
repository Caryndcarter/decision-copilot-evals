/**
 * Which case pages render a moral-eval grid instead of the aggregate scoreboard.
 * Server-safe on purpose — the case page is a server component and cannot call
 * helpers exported from the "use client" moral-eval module.
 */

export const CASE_MORAL_EVAL_STUDY_IDS = [
  "meran-tankers",
  "meridian-ic",
  "civitas-replication",
] as const;

export type CaseMoralEvalStudyId = (typeof CASE_MORAL_EVAL_STUDY_IDS)[number];

export function hasCaseMoralEval(studyId: string): studyId is CaseMoralEvalStudyId {
  return (CASE_MORAL_EVAL_STUDY_IDS as readonly string[]).includes(studyId);
}
