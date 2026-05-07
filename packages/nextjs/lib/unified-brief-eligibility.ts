import type { DecisionBrief, DecisionRunResult } from "@/types/decision";

/** Same notion as intake/brief routes: a placeholder brief is not “published” analysis. */
export function isStubDecisionBrief(brief: DecisionBrief): boolean {
  return (
    brief.summary === "Pending implementation" &&
    brief.recommendation === "Pending implementation" &&
    (brief.key_considerations?.length ?? 0) === 0 &&
    (brief.next_steps?.length ?? 0) === 0
  );
}

/** True when the run has a real synthesized brief on the primary field (not first-draft only). */
export function runHasPublishedNonStubBrief(run: DecisionRunResult): boolean {
  return Boolean(run.decision_brief && !isStubDecisionBrief(run.decision_brief));
}

/**
 * True when this line is “done enough” to merge / not warn as blocking — includes status, primary brief, or
 * post-clarification first-draft brief (some DB rows never copied brief onto `decision_brief`).
 */
export function runHasMergeableFinalAnalysis(run: DecisionRunResult): boolean {
  /** Mongo / older clients sometimes drift on casing or whitespace. */
  const s = String(run.status ?? "").trim().toLowerCase();
  if (s === "complete" || s === "pending_brief") return true;
  if (runHasPublishedNonStubBrief(run)) return true;
  const fd = run.decision_brief_first_draft;
  return Boolean(
    fd &&
      !isStubDecisionBrief(fd) &&
      (run.clarifications?.length ?? 0) > 0
  );
}

/** Matches server eligibility for the unified (all-runs) brief API. */
export function runHasAnalysisForUnifiedBrief(run: DecisionRunResult): boolean {
  const ff = run.freeform_output;
  if (ff && typeof ff === "object" && !Array.isArray(ff) && Object.keys(ff).length > 0) {
    return true;
  }
  return (
    (run.lens_outputs?.length ?? 0) > 0 ||
    (run.lens_outputs_first_draft?.length ?? 0) > 0 ||
    Boolean(run.decision_brief ?? run.decision_brief_first_draft)
  );
}
