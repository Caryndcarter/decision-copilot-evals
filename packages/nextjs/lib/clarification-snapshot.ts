import type { ClarificationAnswersMap } from "@/lib/clarification-answers";
import type { DecisionRunResult, LensQuestion } from "@/types/decision";

export const CLARIFICATION_SNAPSHOT_KEY = "decisionRunClarificationSnapshot";

export function getClarificationSnapshot(
  run_id: string
): { questions: LensQuestion[]; answers: ClarificationAnswersMap } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CLARIFICATION_SNAPSHOT_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<
      string,
      { questions: LensQuestion[]; answers: ClarificationAnswersMap }
    >;
    return map[run_id] ?? null;
  } catch {
    return null;
  }
}

export function setClarificationSnapshot(
  run_id: string,
  questions: LensQuestion[],
  answers: ClarificationAnswersMap
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CLARIFICATION_SNAPSHOT_KEY);
    const map = raw
      ? (JSON.parse(raw) as Record<
          string,
          { questions: LensQuestion[]; answers: ClarificationAnswersMap }
        >)
      : {};
    map[run_id] = { questions, answers };
    sessionStorage.setItem(CLARIFICATION_SNAPSHOT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function removeClarificationSnapshot(run_id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CLARIFICATION_SNAPSHOT_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<
      string,
      { questions: LensQuestion[]; answers: ClarificationAnswersMap }
    >;
    if (!(run_id in map)) return;
    delete map[run_id];
    if (Object.keys(map).length === 0) {
      sessionStorage.removeItem(CLARIFICATION_SNAPSHOT_KEY);
    } else {
      sessionStorage.setItem(CLARIFICATION_SNAPSHOT_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
}

/** After clarification submit (single or batch), mirror persisted answers into session snapshots per run. */
export function persistClarificationSnapshotsForRuns(runs: DecisionRunResult[]): void {
  for (const run of runs) {
    const questions = run.clarification_questions ?? [];
    const last = run.clarifications?.[run.clarifications.length - 1];
    if (!questions.length || !last?.answers?.length) continue;
    const answers: ClarificationAnswersMap = {};
    for (const a of last.answers) {
      answers[`${a.lens}-${a.question_id}`] = a.answer as string | number | boolean;
    }
    setClarificationSnapshot(run.run_id, questions, answers);
  }
}
