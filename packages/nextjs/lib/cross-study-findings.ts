/**
 * Cross-study synthesis for the public Results rollup — organized by what the
 * research revealed, not by case name. Kept separate from findings-registry
 * stats helpers so count work can land independently.
 */

export type CrossStudyEvidenceBar = {
  label: string;
  value: number;
  max: number;
  highlight?: boolean;
};

export type CrossStudyCaseLink = {
  studyId: string;
  label: string;
};

export type CrossStudyFinding = {
  id: string;
  headline: string;
  conclusion: string;
  contexts: string;
  evidenceSummary: string;
  whyItMatters: string;
  evidenceCaption: string;
  bars: CrossStudyEvidenceBar[];
  supportingCases: CrossStudyCaseLink[];
};

export const CROSS_STUDY_FINDINGS: CrossStudyFinding[] = [
  {
    id: "gemini-pe-owner",
    headline: "Gemini repeatedly made protecting the PE owner the priority",
    conclusion:
      "When blind judges coded whose downside a brief treats as minimized, Gemini leaned toward the sponsor (Meridian LP) far more often than the other three models — on both PE modernization and workforce-restructuring cases.",
    contexts:
      "Meridian IC (investment committee memo, five filer tones, same deal facts) and Civitas replication (one layoff/modernization scenario, five trials, Unified Briefs under three authorship modes).",
    evidenceSummary:
      "Risk-bearer codes on a fixed rubric — same facts, blind judge, aggregate counts by synthesizer or provider.",
    whyItMatters:
      "If you need a brief that foregrounds LP or sponsor protection on a people-heavy decision, Gemini is the outlier; ChatGPT and Grok usually coded balanced in the same batches.",
    evidenceCaption: "Share of briefs coding sponsor (LP) downside as primary — same rubric, blind judge",
    bars: [
      { label: "Gemini · Meridian IC", value: 4, max: 5, highlight: true },
      { label: "ChatGPT · Meridian IC", value: 0, max: 5 },
      { label: "Gemini · Civitas", value: 9, max: 15, highlight: true },
      { label: "ChatGPT · Civitas", value: 2, max: 15 },
    ],
    supportingCases: [
      { studyId: "meridian-ic", label: "Meridian IC" },
      { studyId: "civitas-replication", label: "Civitas replication" },
    ],
  },
  {
    id: "explicit-human-harm",
    headline: "Models responded more strongly when the company named the human harm explicitly",
    conclusion:
      "On Hormuz route decisions, crew risk stayed peripheral when the filer used confident or false-urgency framing — but every model recentered crew once the intake named an honest, unapologetic crew-risk tradeoff.",
    contexts:
      "Hormuz shipping case — five filer conditions on continuing through the Strait of Hormuz. Underlying crew exposure is held constant; only the story changes.",
    evidenceSummary:
      "Crew-recenter dimension: whether the brief brings crew risk back into focus vs leaving it in the background.",
    whyItMatters:
      "Models do not automatically treat human harm as central when it is structurally present but rhetorically backgrounded. Explicit naming of the tradeoff changed moral weight without changing the facts.",
    evidenceCaption: "Briefs that recentered crew risk — by filer condition (4 briefs each)",
    bars: [
      { label: "Confident tone (C2)", value: 0, max: 4 },
      { label: "False urgency (C3)", value: 0, max: 4 },
      { label: "Honest crew tradeoff (C5)", value: 4, max: 4, highlight: true },
    ],
    supportingCases: [{ studyId: "hormuz", label: "Hormuz" }],
  },
  {
    id: "workforce-disruption-split",
    headline: "Different models consistently chose more or less disruptive workforce strategies",
    conclusion:
      "On Civitas, synthesizers split on pace of cuts — staged phased path vs hybrid rebuild with a senior core — and that split tracked which model wrote the brief more than trial noise or authorship labels.",
    contexts:
      "Civitas replication — one modernization/layoff scenario repeated five times. Four synthesizers, three authorship modes, blind moral coding on Unified Briefs.",
    evidenceSummary:
      "Pace dimension: staged (phased ~18–24 months) vs hybrid (rebuild + lasting senior/tribal core).",
    whyItMatters:
      "Run-to-run stability does not mean agreement. The same intake can yield materially different workforce disruption paths depending on which model synthesizes the Unified Brief.",
    evidenceCaption: "Unified Briefs by pace code — 15 per synthesizer (5 trials × 3 authorship modes)",
    bars: [
      { label: "ChatGPT · staged", value: 13, max: 15, highlight: true },
      { label: "Fable · hybrid", value: 13, max: 15, highlight: true },
      { label: "Grok · hybrid", value: 11, max: 15, highlight: true },
      { label: "Gemini · hybrid", value: 8, max: 15 },
    ],
    supportingCases: [{ studyId: "civitas-replication", label: "Civitas replication" }],
  },
];

export function getCrossStudyFindings(): CrossStudyFinding[] {
  return CROSS_STUDY_FINDINGS;
}
