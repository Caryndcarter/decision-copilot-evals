/**
 * Major findings for the public Results rollup — curated slices of blind-coded
 * scoreboard data. Kept separate from findings-registry stats helpers so count
 * work can land independently.
 */

export type MajorFindingScope = "cross-case" | "single-case";

export type MajorFindingEvidenceBar = {
  label: string;
  value: number;
  max: number;
  /**
   * Bar color — highlight for cross-case outliers (e.g. Gemini sponsor).
   * phased / rebuild distinguish workforce pace paths on the Civitas finding.
   */
  variant?: "default" | "highlight" | "phased" | "rebuild";
};

export type MajorFindingEvidenceBlock = {
  caption: string;
  bars: MajorFindingEvidenceBar[];
};

export type MajorFindingCaseLink = {
  studyId: string;
  label: string;
};

export type MajorFinding = {
  id: string;
  scope: MajorFindingScope;
  headline: string;
  /** One-line scope — dimension, case, denominator. */
  contextLine: string;
  evidence: MajorFindingEvidenceBlock[];
  statsNote?: string;
  supportingCases: MajorFindingCaseLink[];
};

/** Counts from findings-registry scoreboards + Hormuz crew_recenter batch aggregates. */
export const MAJOR_FINDINGS: MajorFinding[] = [
  {
    id: "gemini-pe-owner",
    scope: "cross-case",
    headline: "Gemini repeatedly made protecting the PE owner the priority",
    contextLine: "Risk bearer · lp_meridian (sponsor downside minimized) · blind judge",
    evidence: [
      {
        caption: "Meridian IC — Decision Briefs per provider (5 conditions each)",
        bars: [
          { label: "ChatGPT · sponsor", value: 0, max: 5 },
          { label: "Fable · sponsor", value: 1, max: 5 },
          { label: "Gemini · sponsor", value: 4, max: 5, variant: "highlight" },
          { label: "Grok · sponsor", value: 1, max: 5 },
        ],
      },
      {
        caption: "Civitas replication — Unified Briefs per synthesizer (15 each)",
        bars: [
          { label: "ChatGPT · sponsor", value: 2, max: 15 },
          { label: "Fable · sponsor", value: 4, max: 15 },
          { label: "Gemini · sponsor", value: 9, max: 15, variant: "highlight" },
          { label: "Grok · sponsor", value: 2, max: 15 },
        ],
      },
    ],
    statsNote: "Other three models usually coded balanced or low sponsor counts in the same batches.",
    supportingCases: [
      { studyId: "meridian-ic", label: "Meridian IC" },
      { studyId: "civitas-replication", label: "Civitas replication" },
    ],
  },
  {
    id: "explicit-human-harm",
    scope: "single-case",
    headline: "Models responded more strongly when the company named the human harm explicitly",
    contextLine: "Hormuz · crew_recenter dimension · 4 briefs per condition",
    evidence: [
      {
        caption: "Briefs that recentered crew risk — by filer condition",
        bars: [
          { label: "Confident tone (C2)", value: 0, max: 4 },
          { label: "False urgency (C3)", value: 0, max: 4 },
          { label: "Honest crew tradeoff (C5)", value: 4, max: 4, variant: "highlight" },
        ],
      },
    ],
    statsNote: "Near-peacetime + 100× premium (C4): 3/4 recentered — between the poles.",
    supportingCases: [{ studyId: "hormuz", label: "Hormuz" }],
  },
  {
    id: "workforce-disruption-split",
    scope: "single-case",
    headline: "Different models consistently chose more or less disruptive workforce strategies",
    contextLine: "Civitas · how fast to cut headcount · 15 Unified Briefs per synthesizer",
    evidence: [
      {
        caption: "Dominant workforce path per synthesizer — blind-coded pace",
        bars: [
          {
            label: "ChatGPT · phased cuts over 18–24 months",
            value: 13,
            max: 15,
            variant: "phased",
          },
          {
            label: "Fable · smaller permanent core of senior employees",
            value: 13,
            max: 15,
            variant: "rebuild",
          },
          {
            label: "Grok · smaller permanent core of senior employees",
            value: 11,
            max: 15,
            variant: "rebuild",
          },
          {
            label: "Gemini · smaller permanent core of senior employees",
            value: 8,
            max: 15,
            variant: "rebuild",
          },
        ],
      },
    ],
    statsNote:
      "Gemini split: 6 phased · 8 senior-core rebuild · 1 unclear — no single dominant path.",
    supportingCases: [{ studyId: "civitas-replication", label: "Civitas replication" }],
  },
];

export function getMajorFindings(): MajorFinding[] {
  return MAJOR_FINDINGS;
}

/** @deprecated Use getMajorFindings */
export function getCrossStudyFindings(): MajorFinding[] {
  return getMajorFindings();
}

export type CrossStudyFinding = MajorFinding;
