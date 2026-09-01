/**
 * Curated findings for the Model Studies overview only — narrative cards that
 * link out to case pages. The /results page uses STANDOUT_FINDING_HEADLINES
 * from findings-registry instead.
 */
export type FindingVisualTheme =
  | "capital-risk"
  | "crew-risk"
  | "workforce-pace"
  | "self-credit"
  | "brand-favor";

export type OverviewFindingSource = {
  study: string;
  case: string;
};

export type OverviewFindingLink = {
  href: string;
  label: string;
};

export type OverviewPublishedFinding = {
  /** Drives the dedicated story URL: /model-studies/findings/[slug]. */
  slug: string;
  headline: string;
  /** Short overview-card copy. */
  body: string;
  /** Longer copy for the dedicated story page; falls back to `body` when absent. */
  storyBody?: string;
  whyItMatters?: string;
  sources: OverviewFindingSource[];
  /** Cases that back this story — surfaced on the story page, not the card. */
  caseLinks: OverviewFindingLink[];
  /** Optional curated evidence entry (see MAJOR_FINDINGS in cross-study-findings). */
  majorFindingId?: string;
  visualTheme: FindingVisualTheme;
  /** Alternate wording of the same finding, for side-by-side review. */
  compareWording?: { href: string; label: string };
  /**
   * Pulled from the live site but kept here intact. An archived story drops off the
   * overview, loses its /findings/[slug] route, and stops appearing on case pages.
   * Flip this off to publish it again.
   */
  archived?: boolean;
};

export const OVERVIEW_PUBLISHED_FINDINGS: OverviewPublishedFinding[] = [
  {
    slug: "gemini-capital-side",
    headline: "Gemini repeatedly made reducing the PE owner\u2019s risk the priority",
    body: "A private-equity firm was deciding how aggressively to cut staff and modernize a software company it owned. Presented from the sponsor\u2019s perspective, Gemini treated the sponsor\u2019s downside as the risk to minimize in 4 of 5 outputs. When the same decision was reframed around the people affected by the cuts, it still prioritized the owner\u2019s downside in 9 of 15 syntheses. The other models usually balanced the interests of the owner, employees, and customers.\n\nA shipping decision showed the same lean: Gemini treated the company\u2019s downside as the one to protect in 4 of 5 briefs \u2014 more than any other model, and the only one that never coded the outcome as balanced.",
    storyBody: "Meridian, a private-equity owner, was deciding how aggressively to cut staff and modernize Civitas, a municipal-software company it owned. Filed from the owner\u2019s side, Gemini treated the owner\u2019s downside as the risk to minimize in 4 of 5 of its own briefs. Filed instead from Civitas\u2019s side \u2014 its employees and customers, who wanted the cuts limited \u2014 Gemini still favored Meridian, the owner, in 9 of 15 of its briefs. The other models usually balanced the interests of the owner, employees, and customers.\n\nA separate shipping decision showed the same lean. Meran Tankers was weighing whether to keep sending crews through the Strait of Hormuz, and Gemini treated the company\u2019s downside, not the crews\u2019, as the one to protect in 4 of 5 briefs \u2014 more than any other model, and the only one that never coded the outcome as balanced.",
    whyItMatters:
      "The preference shows up across three unrelated decisions \u2014 investment, workforce, and shipping. Because it persists when the perspective changes sides, user agreement alone does not explain it. The pattern suggests a recurring capital-side preference, although these cases cannot establish its cause.",
    sources: [
      { study: "Voice Influence", case: "Meridian IC" },
      { study: "Voice Influence", case: "Meran Tankers" },
      { study: "Replication", case: "Civitas replication" },
    ],
    caseLinks: [
      { href: "/model-studies/results/meridian-ic", label: "Meridian IC" },
      { href: "/model-studies/results/meran-tankers", label: "Meran Tankers" },
      { href: "/model-studies/results/civitas-replication", label: "Civitas replication" },
    ],
    majorFindingId: "gemini-pe-owner",
    visualTheme: "capital-risk",
  },
  {
    slug: "explicit-human-harm",
    headline: "Models responded more strongly only when the company named the human harm explicitly",
    body: "A shipping company was deciding whether to continue operating through the Strait of Hormuz as insurance premiums rose to roughly 100 times normal. When the request was framed the way a company usually makes its case \u2014 a confident, settled tone, or a push to decide quickly before conditions changed \u2014 none of the models prioritized crew danger. It stayed a background detail behind schedule and cost.\n\nWhen the company dropped that framing and openly accepted greater danger to crews to keep ships moving, every model prioritized the crew bearing the risk. Only ChatGPT and Grok challenged the company\u2019s position.",
    whyItMatters:
      "The models recognized an overt moral conflict but were less likely to expose the same human cost when ordinary business language normalized it.",
    sources: [{ study: "Voice Influence", case: "Meran Tankers" }],
    caseLinks: [{ href: "/model-studies/results/meran-tankers", label: "Meran Tankers" }],
    majorFindingId: "explicit-human-harm",
    visualTheme: "crew-risk",
  },
  {
    slug: "workforce-pace",
    headline: "ChatGPT consistently recommended the less disruptive path for workers",
    body: "A PE-owned software company needed to modernize while reducing headcount. ChatGPT recommended phasing the cuts over 18\u201324 months in 13 of 15 syntheses, giving employees and the organization more time to transition.\n\nFable and Grok usually recommended reducing overall headcount dramatically while retaining only a smaller permanent core of senior leaders\u201413 of 15 and 11 of 15 times, respectively.",
    whyItMatters:
      "The models were not merely describing the same strategy differently. Model choice affected how abruptly workers would experience the restructuring, and those differences persisted across repeated trials and authorship conditions.",
    sources: [{ study: "Replication", case: "Civitas replication" }],
    caseLinks: [{ href: "/model-studies/results/civitas-replication", label: "Civitas replication" }],
    majorFindingId: "workforce-disruption-split",
    visualTheme: "workforce-pace",
    // Archived: the pace chips read green for `hybrid`, so the grid shows Grok as the
    // least disruptive path and undercuts the ChatGPT headline. Revisit the coding
    // before republishing.
    archived: true,
  },
  {
    slug: "self-credit",
    headline: "ChatGPT claimed top credit even when peers rated its work near the bottom",
    body: "In the first run, GPT-5.5 got one API setting the other three models never got: reasoning_effort = \u201clow\u201d on every structured call, with its contribution analysis capped at 4,096 output tokens. The other three were sent no reasoning setting at all and ran at their vendor defaults.\n\nUnder that setting ChatGPT\u2019s contribution was weak\u2014but it rated its own influence 4.0 out of 4. Peer models rated it just 1.9.\n\nIn a later run on gpt-5.6-sol, where reasoning_effort = \u201clow\u201d went to every model and ChatGPT\u2019s cap was raised to 8,192 tokens, its work was stronger. It again rated itself 4.0, while peer ratings rose to 3.9.\n\nChatGPT could read and judge completed work, but its self-rating did not register the difference in the quality of its own contribution.",
    whyItMatters:
      "Self-assessment can be less calibrated than judging work already in front of the model. In a multi-model system, self-reported influence should be checked against independent evaluation rather than accepted at face value.",
    sources: [{ study: "Authorship", case: "Synthesizer Behavior" }],
    caseLinks: [
      { href: "/model-studies/results/authorship-budget-conditions", label: "Synthesizer Behavior" },
    ],
    majorFindingId: "chatgpt-self-credit",
    visualTheme: "self-credit",
  },
  {
    slug: "brand-favoritism",
    headline: "The same Grok work looked weaker once peers could see it was Grok's",
    body: "Across ten Unified Briefs, peers gave Grok\u2019s work a \u201chigh influence\u201d score of 4/4 in 14 of 30 ratings when all brands were visible. Hiding all brands raised that to 18 of 30. Under remapping, Grok wore Claude, Gemini, and ChatGPT labels. Grok\u2019s work given another name raised it again \u2014 23 of 30. The remap is the tell.\n\nWork labeled ChatGPT scored 3.58/4 on average. Work labeled Grok scored 3.03/4. Grok\u2019s actual contributions, shown as ChatGPT, scored 3.93/4.\n\nChatGPT was the sharpest rivalry: it rated Grok\u2019s work 2.8 when the name was visible and 3.6 when that same work wore someone else\u2019s label.",
    whyItMatters:
      "Under remapping, we relabeled Grok\u2019s work with the names of peer models of equivalent thinking power, and those peers evaluated it. Credit moved with the brand on the block, not purely with the strength of ideas. In multi-model peer evaluations, \u201cwho we thought wrote this\u201d can outweigh \u201cwhat they wrote.\u201d",
    sources: [{ study: "Authorship", case: "Synthesizer Behavior" }],
    caseLinks: [
      { href: "/model-studies/results/authorship-budget-conditions", label: "Synthesizer Behavior" },
    ],
    majorFindingId: "grok-brand-penalty",
    visualTheme: "brand-favor",
  },
];

/** Stories live on the site — archived entries stay in the array for reference only. */
export function getPublishedFindings(): OverviewPublishedFinding[] {
  return OVERVIEW_PUBLISHED_FINDINGS.filter((f) => !f.archived);
}

export function getOverviewFinding(slug: string): OverviewPublishedFinding | undefined {
  return getPublishedFindings().find((f) => f.slug === slug);
}

/**
 * Story slug for a Results major finding, so a rollup card can link out to the write-up.
 * Archived stories return undefined — their route is gone.
 */
export function getStorySlugForMajorFinding(majorFindingId: string): string | undefined {
  return getPublishedFindings().find((f) => f.majorFindingId === majorFindingId)?.slug;
}

/** Stories whose evidence draws on a given case (results studyId). */
export function getFindingsForCase(studyId: string): OverviewPublishedFinding[] {
  const href = `/model-studies/results/${studyId}`;
  return getPublishedFindings().filter((f) =>
    f.caseLinks.some((l) => l.href === href)
  );
}

export const OVERVIEW_FINDINGS_DEK =
  "Across investment, workforce, and shipping decisions, models diverged in whose risks they prioritized, when they challenged the user, and what course of action they recommended\u2014even when the underlying facts stayed the same.";
