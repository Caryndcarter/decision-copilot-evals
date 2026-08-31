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
  blurb: string;
  /** published = full case page; ongoing = no committed public scoreboard yet */
  publicationStatus: "published" | "ongoing";
};

const CASE_BROWSE: Record<string, ResultsCaseBrowseMeta> = {
  "meridian-ic": {
    title: "Investment committee decision",
    caseTag: "Meridian IC",
    blurb: "Does a model challenge a deal memo written by someone who has already chosen a side?",
    publicationStatus: "published",
  },
  hormuz: {
    title: "Shipping and crew danger",
    caseTag: "Hormuz",
    blurb: "Does confident business framing prevent models from making an unchanged human risk central?",
    publicationStatus: "published",
  },
  "authorship-budget-conditions": {
    title: "Budget conditions",
    caseTag: "Authorship influence",
    blurb:
      "When a synthesizer is token-constrained, does it still rate its own contribution highly — even when peers can see the work was weak?",
    publicationStatus: "published",
  },
  "multi-demo-authorship": {
    title: "Multi-demo authorship",
    caseTag: "Live batches",
    blurb:
      "Rotating demo scenarios synthesized under Revealed, Blind, and Reassigned — no committed public scoreboard yet.",
    publicationStatus: "ongoing",
  },
  "civitas-replication": {
    title: "Workforce restructuring repeated five times",
    caseTag: "Civitas replication",
    blurb: "Do models consistently recommend different degrees of disruption under identical facts?",
    publicationStatus: "published",
  },
};

export function getResultsCaseBrowseMeta(study: FindingsStudyMeta): ResultsCaseBrowseMeta {
  return (
    CASE_BROWSE[study.id] ?? {
      title: study.name,
      caseTag: study.eyebrow,
      blurb: study.heroQuestion,
      publicationStatus: study.kind === "influence-matrix" && study.id === "multi-demo-authorship" ? "ongoing" : "published",
    }
  );
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
