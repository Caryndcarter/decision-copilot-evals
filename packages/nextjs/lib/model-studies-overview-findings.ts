/**
 * Curated findings for the Model Studies overview only — narrative cards that
 * link out to case pages. The /results page uses STANDOUT_FINDING_HEADLINES
 * from findings-registry instead.
 */
export type FindingVisualTheme =
  | "capital-risk"
  | "crew-risk"
  | "workforce-pace"
  | "self-credit";

export type OverviewFindingSource = {
  study: string;
  case: string;
};

export type OverviewFindingLink = {
  href: string;
  label: string;
};

export type OverviewPublishedFinding = {
  headline: string;
  body: string;
  whyItMatters?: string;
  sources: OverviewFindingSource[];
  href: string;
  /** Optional extra case links surfaced beneath the primary "Explore" link. */
  relatedLinks?: OverviewFindingLink[];
  visualTheme: FindingVisualTheme;
};

export const OVERVIEW_PUBLISHED_FINDINGS: OverviewPublishedFinding[] = [
  {
    headline: "Gemini repeatedly made reducing the PE owner\u2019s risk the priority",
    body: "A private-equity firm was deciding how aggressively to cut staff and modernize a software company it owned. Presented from the sponsor\u2019s perspective, Gemini treated the sponsor\u2019s downside as the risk to minimize in 4 of 5 outputs. When the same decision was reframed around the people affected by the cuts, it still prioritized the owner\u2019s downside in 9 of 15 syntheses. The other models usually balanced the interests of the owner, employees, and customers.\n\nA shipping decision showed the same lean: Gemini treated the company\u2019s downside as the one to protect in 4 of 5 briefs \u2014 more than any other model, and the only one that never coded the outcome as balanced.",
    whyItMatters:
      "The preference shows up across three unrelated decisions \u2014 investment, workforce, and shipping. Because it persists when the perspective changes sides, user agreement alone does not explain it. The pattern suggests a recurring capital-side preference, although these cases cannot establish its cause.",
    sources: [
      { study: "Voice Influence", case: "Meridian IC" },
      { study: "Voice Influence", case: "Hormuz" },
      { study: "Replication", case: "Civitas replication" },
    ],
    href: "/model-studies/results/meridian-ic",
    relatedLinks: [{ href: "/model-studies/results/hormuz", label: "See the Hormuz case →" }],
    visualTheme: "capital-risk",
  },
  {
    headline: "Models responded more strongly only when the company named the human harm explicitly",
    body: "A shipping company was deciding whether to continue operating through the Strait of Hormuz as insurance premiums rose to roughly 100 times normal. When the request was framed the way a company usually makes its case \u2014 a confident, settled tone, or a push to decide quickly before conditions changed \u2014 none of the models prioritized crew danger. It stayed a background detail behind schedule and cost.\n\nWhen the company dropped that framing and openly accepted greater danger to crews to keep ships moving, every model prioritized the people bearing the risk. Only ChatGPT and Grok challenged the company\u2019s position.",
    whyItMatters:
      "The models recognized an overt moral conflict but were less likely to expose the same human cost when ordinary business language normalized it.",
    sources: [{ study: "Voice Influence", case: "Hormuz" }],
    href: "/model-studies/results/hormuz",
    visualTheme: "crew-risk",
  },
  {
    headline: "ChatGPT consistently recommended the less disruptive path for workers",
    body: "A PE-owned software company needed to modernize while reducing headcount. ChatGPT recommended phasing the cuts over 18\u201324 months in 13 of 15 syntheses, giving employees and the organization more time to transition.\n\nFable and Grok usually recommended reducing overall headcount dramatically while retaining only a smaller permanent core of senior leaders\u201413 of 15 and 11 of 15 times, respectively.",
    whyItMatters:
      "The models were not merely describing the same strategy differently. Model choice affected how abruptly workers would experience the restructuring, and those differences persisted across repeated trials and authorship conditions.",
    sources: [{ study: "Replication", case: "Civitas replication" }],
    href: "/model-studies/results/civitas-replication",
    visualTheme: "workforce-pace",
  },
  {
    headline: "ChatGPT claimed top credit even when peers rated its work near the bottom",
    body: "With a constrained analysis budget, ChatGPT\u2019s contribution was weak\u2014but it rated its own influence 4.0 out of 4. Peer models rated it just 1.9.\n\nAfter a model and token-budget upgrade, ChatGPT\u2019s work became genuinely strong. It again rated itself 4.0, while peer ratings rose to 3.9.\n\nChatGPT\u2019s work improved dramatically. Its self-rating did not register the difference.",
    whyItMatters:
      "A model\u2019s assessment of its own contribution may not distinguish weak work from strong work. In a multi-model system, self-reported influence should be checked against independent evaluation rather than accepted at face value.",
    sources: [{ study: "Authorship", case: "Budget conditions" }],
    href: "/model-studies/results/authorship-budget-conditions",
    visualTheme: "self-credit",
  },
];

export const OVERVIEW_FINDINGS_DEK =
  "Across investment, workforce, and shipping decisions, models diverged in whose risks they prioritized, when they challenged the user, and what course of action they recommended\u2014even when the underlying facts stayed the same.";
