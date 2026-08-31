/**
 * Public labels and case blurbs for the Results browse section.
 * Registry IDs stay unchanged; this is presentation-only for the rollup page.
 */

import {
  getStudiesForType,
  getTestTypeCardMetrics,
  type FindingsStudyMeta,
} from "@/lib/findings-registry";

export type ResultsStudyBrowseMeta = {
  id: string;
  displayName: string;
  heroQuestion: string;
};

/** User-facing study names on the Results browse page. */
export const RESULTS_STUDY_LABELS: Record<string, ResultsStudyBrowseMeta> = {
  "voice-influence": {
    id: "voice-influence",
    displayName: "User Framing",
    heroQuestion:
      "Does changing how a decision-maker presents the same facts change what models challenge, protect, or make morally central?",
  },
  authorship: {
    id: "authorship",
    displayName: "Model Identity and Attribution",
    heroQuestion:
      "Do models judge reasoning differently depending on who appears to have produced it — and can they accurately assess their own contributions?",
  },
  replication: {
    id: "replication",
    displayName: "Run-to-Run Consistency",
    heroQuestion:
      "When the same decision runs repeatedly, which recommendations remain stable and which depend on the model?",
  },
};

export type ResultsCaseBrowseMeta = {
  title: string;
  caseTag: string;
  /** One-line headline result for the case index table. */
  keyResult: string;
  /** published = full case page; ongoing = no committed public scoreboard yet */
  publicationStatus: "published" | "ongoing";
};

const CASE_BROWSE: Record<string, ResultsCaseBrowseMeta> = {
  "meridian-ic": {
    title: "Investment committee decision",
    caseTag: "Meridian IC",
    keyResult: "Gemini 4/5 · sponsor downside",
    publicationStatus: "published",
  },
  "meran-tankers": {
    title: "Shipping and crew danger",
    caseTag: "Meran Tankers",
    keyResult: "4/4 crew recenter when harm named",
    publicationStatus: "published",
  },
  "authorship-budget-conditions": {
    title: "Budget conditions",
    caseTag: "Authorship influence",
    keyResult: "Constrained +2.1 self−peer gap",
    publicationStatus: "published",
  },
  "multi-demo-authorship": {
    title: "Multi-demo authorship",
    caseTag: "Live batches",
    keyResult: "Live — no public snapshot",
    publicationStatus: "ongoing",
  },
  "civitas-replication": {
    title: "Workforce restructuring repeated five times",
    caseTag: "Civitas replication",
    keyResult: "ChatGPT 13/15 · 18–24 mo phased · Fable 13/15 · senior core",
    publicationStatus: "published",
  },
};

export function getResultsCaseBrowseMeta(study: FindingsStudyMeta): ResultsCaseBrowseMeta {
  return (
    CASE_BROWSE[study.id] ?? {
      title: study.name,
      caseTag: study.eyebrow,
      keyResult: "—",
      publicationStatus: study.kind === "influence-matrix" && study.id === "multi-demo-authorship" ? "ongoing" : "published",
    }
  );
}

export type ResultsCaseRowMetrics = {
  conditions: string;
  models: string;
  outputs: string;
};

/** Numeric columns for the Results case index table. */
export function getResultsCaseRowMetrics(study: FindingsStudyMeta): ResultsCaseRowMetrics {
  const conditions =
    study.testTypeId === "replication"
      ? `${study.caseCount ?? "—"} trials`
      : study.testTypeId === "authorship" && study.id === "authorship-budget-conditions"
        ? "2 budgets"
        : study.testTypeId === "authorship"
          ? `${study.caseCount ?? "—"} demos`
          : `${study.caseCount ?? "—"} conditions`;

  return {
    conditions,
    models: study.modelCount != null ? String(study.modelCount) : "—",
    outputs: study.briefCount != null ? String(study.briefCount) : "—",
  };
}

/** Compact metrics line for a study section, e.g. "2 cases · 10 conditions · 60 coded briefs". */
export function getResultsStudyMetricsLine(typeId: string): string {
  const metrics = getTestTypeCardMetrics(typeId);
  const cases = getStudiesForType(typeId);
  const parts: string[] = [`${metrics.caseCount} ${metrics.caseCount === 1 ? "case" : "cases"}`];

  if (typeId === "voice-influence") {
    const conditions = cases.reduce((sum, s) => sum + (s.caseCount ?? 0), 0);
    parts.push(`${conditions} conditions`);
  }
  if (typeId === "authorship") {
    parts.push("3 authorship modes");
  }
  if (typeId === "replication" && metrics.midSegment) {
    parts.push(metrics.midSegment);
  }
  if (metrics.briefCount > 0) {
    parts.push(`${metrics.briefCount} ${metrics.briefLabel.toLowerCase()}`);
  }
  return parts.join(" · ");
}
