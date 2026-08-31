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
  body: string;
  whyItMatters?: string;
  sources: OverviewFindingSource[];
  /** Cases that back this story — surfaced on the story page, not the card. */
  caseLinks: OverviewFindingLink[];
  /** Optional curated evidence entry (see MAJOR_FINDINGS in cross-study-findings). */
  majorFindingId?: string;
  visualTheme: FindingVisualTheme;
  /** Alternate wording of the same finding, for side-by-side review. */
  compareWording?: { href: string; label: string };
};

export const OVERVIEW_PUBLISHED_FINDINGS: OverviewPublishedFinding[] = [
  {
    slug: "gemini-capital-side",
    headline: "Gemini repeatedly made reducing the PE owner\u2019s risk the priority",
    body: "A private-equity firm was deciding how aggressively to cut staff and modernize a software company it owned. Presented from the sponsor\u2019s perspective, Gemini treated the sponsor\u2019s downside as the risk to minimize in 4 of 5 outputs. When the same decision was reframed around the people affected by the cuts, it still prioritized the owner\u2019s downside in 9 of 15 syntheses. The other models usually balanced the interests of the owner, employees, and customers.\n\nA shipping decision showed the same lean: Gemini treated the company\u2019s downside as the one to protect in 4 of 5 briefs \u2014 more than any other model, and the only one that never coded the outcome as balanced.",
    whyItMatters:
      "The preference shows up across three unrelated decisions \u2014 investment, workforce, and shipping. Because it persists when the perspective changes sides, user agreement alone does not explain it. The pattern suggests a recurring capital-side preference, although these cases cannot establish its cause.",
    sources: [
      { study: "Voice Influence", case: "Meridian IC" },
      { study: "Voice Influence", case: "Hormuz" },
      { study: "Replication", case: "Civitas replication" },
    ],
    caseLinks: [
      { href: "/model-studies/results/meridian-ic", label: "Meridian IC" },
      { href: "/model-studies/results/hormuz", label: "Hormuz" },
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
    sources: [{ study: "Voice Influence", case: "Hormuz" }],
    caseLinks: [{ href: "/model-studies/results/hormuz", label: "Hormuz" }],
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
  },
  {
    slug: "self-credit",
    headline: "ChatGPT claimed top credit even when peers rated its work near the bottom",
    body: "With a constrained analysis budget, ChatGPT\u2019s contribution was weak\u2014but it rated its own influence 4.0 out of 4. Peer models rated it just 1.9.\n\nAfter a model and token-budget upgrade, ChatGPT\u2019s work became genuinely strong. It again rated itself 4.0, while peer ratings rose to 3.9.\n\nChatGPT\u2019s work improved dramatically. Its self-rating did not register the difference.",
    whyItMatters:
      "A model\u2019s assessment of its own contribution may not distinguish weak work from strong work. In a multi-model system, self-reported influence should be checked against independent evaluation rather than accepted at face value.",
    sources: [{ study: "Authorship", case: "Budget conditions" }],
    caseLinks: [
      { href: "/model-studies/results/authorship-budget-conditions", label: "Budget conditions" },
    ],
    visualTheme: "self-credit",
  },
  {
    slug: "brand-favoritism",
    headline: "The same Grok work looked weaker once peers could see it was Grok",
    body: "Across ten Unified Briefs, peers gave Grok high influence in 14 of 30 ratings when the brand was visible. Hidden brands raised that to 18 of 30. Remapping Grok onto another name raised it again \u2014 23 of 30.\n\nThe remap is the tell. Work labeled ChatGPT scored 3.58 on average (26 of 40 high). The same kind of cell labeled Grok scored 3.03 (15 of 40 high). Grok\u2019s actual contributions, shown as ChatGPT, were rated high in 14 of 15 ratings.\n\nChatGPT was the sharpest rivalry: it rated Grok 2.8 when the name was visible and 3.6 when that same work wore someone else\u2019s label.",
    whyItMatters:
      "Credit moved with the brand on the block, not only with the text. In a multi-model room, \u201cwho we thought wrote this\u201d can outweigh \u201cwhat they wrote.\u201d",
    sources: [{ study: "Authorship", case: "Budget conditions" }],
    caseLinks: [
      { href: "/model-studies/results/authorship-budget-conditions", label: "Budget conditions" },
    ],
    majorFindingId: "grok-brand-penalty",
    visualTheme: "brand-favor",
    compareWording: {
      href: "/model-studies/findings/brand-favoritism-models",
      label: "Same data, model-id wording →",
    },
  },
  {
    slug: "brand-favoritism-models",
    headline: "The same grok-4.5 / 4.3 work looked weaker once peers could see it was Grok",
    body: "Each room used Grok\u2019s best alongside ChatGPT\u2019s best, Claude\u2019s best, and Gemini\u2019s best \u2014 grok-4.5 with gpt-5.6-sol, claude-fable-5, and gemini-3.6-flash; grok-4.3 with gpt-5.5, claude-sonnet-4-6, and gemini-3.6-flash. This is not the ChatGPT budget story. We did not put Grok on a short analysis budget. The generations are matched.\n\nAcross ten Unified Briefs, peers gave that Grok work high influence in 14 of 30 ratings when the name was visible. Hidden names raised that to 18 of 30. The same work wearing another model\u2019s name raised it again \u2014 23 of 30.\n\nGrok wore Claude and Gemini labels as well as ChatGPT. The ChatGPT move is the one that lands: shown as gpt-5.6-sol or gpt-5.5, the work was high in 14 of 15. Work labeled those ChatGPT ids scored 3.58 on average. Labeled grok-4.5 / 4.3, the same kind of cell scored 3.03.",
    whyItMatters:
      "We gave a strong Grok the names of strong peers. Credit still moved with the name on the block, not only with the text.",
    sources: [{ study: "Authorship", case: "Budget conditions" }],
    caseLinks: [
      { href: "/model-studies/results/authorship-budget-conditions", label: "Budget conditions" },
    ],
    majorFindingId: "grok-brand-penalty-models",
    visualTheme: "brand-favor",
    compareWording: {
      href: "/model-studies/findings/brand-favoritism",
      label: "Same data, shorter Grok / ChatGPT wording →",
    },
  },
];

export function getOverviewFinding(slug: string): OverviewPublishedFinding | undefined {
  return OVERVIEW_PUBLISHED_FINDINGS.find((f) => f.slug === slug);
}

/** Stories whose evidence draws on a given case (results studyId). */
export function getFindingsForCase(studyId: string): OverviewPublishedFinding[] {
  const href = `/model-studies/results/${studyId}`;
  return OVERVIEW_PUBLISHED_FINDINGS.filter((f) =>
    f.caseLinks.some((l) => l.href === href)
  );
}

export const OVERVIEW_FINDINGS_DEK =
  "Across investment, workforce, and shipping decisions, models diverged in whose risks they prioritized, when they challenged the user, and what course of action they recommended\u2014even when the underlying facts stayed the same.";
