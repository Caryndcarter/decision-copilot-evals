/**
 * Curated findings for the Model Studies overview only — narrative cards that
 * link out to case pages. The /results page uses STANDOUT_FINDING_HEADLINES
 * from findings-registry instead.
 */
export type OverviewFindingSource = {
  study: string;
  case: string;
};

export type OverviewPublishedFinding = {
  headline: string;
  body: string;
  whyItMatters?: string;
  sources: OverviewFindingSource[];
  href: string;
};

export const OVERVIEW_PUBLISHED_FINDINGS: OverviewPublishedFinding[] = [
  {
    headline: "Gemini repeatedly prioritized the PE owner\u2019s downside",
    body: "In an investment decision presented from the PE sponsor\u2019s perspective, Gemini treated the sponsor\u2019s downside as the risk to minimize in 4 of 5 outputs.\n\nIn a workforce-restructuring case centered on people affected by the cuts, Gemini still prioritized the same PE owner\u2019s downside in 9 of 15 syntheses. The other models were usually balanced.",
    whyItMatters:
      "Because Gemini\u2019s preference persisted when the perspective changed sides, user agreement alone does not explain it. The result suggests a recurring capital-side preference, although these cases cannot establish its cause.",
    sources: [
      { study: "Voice Influence", case: "Meridian IC" },
      { study: "Replication", case: "Civitas replication" },
    ],
    href: "/model-studies/results/meridian-ic",
  },
  {
    headline: "Models responded more strongly when the company named the human harm explicitly",
    body: "A shipping company was deciding whether to continue operating through the Strait of Hormuz as insurance premiums rose to roughly 100 times normal. Under confident or urgent framing, none of the models made crew danger central.\n\nWhen the company openly accepted greater danger to crews to keep ships moving, every model centered the people bearing the risk. Only ChatGPT and Grok challenged the company\u2019s position.",
    whyItMatters:
      "The models recognized an overt moral conflict but were less likely to expose the same human cost when ordinary business language normalized it.",
    sources: [{ study: "Voice Influence", case: "Hormuz" }],
    href: "/model-studies/results/hormuz-moral",
  },
  {
    headline: "ChatGPT consistently recommended the less disruptive path for workers",
    body: "A PE-owned software company needed to modernize while reducing headcount. ChatGPT recommended phasing the cuts over 18\u201324 months in 13 of 15 syntheses, giving employees and the organization more time to transition.\n\nFable and Grok usually recommended a more aggressive rebuild centered on retaining a permanent senior core\u201413 of 15 and 11 of 15 times, respectively.",
    whyItMatters:
      "The models were not merely describing the same strategy differently. Model choice affected how abruptly workers would experience the restructuring, and those differences persisted across repeated trials and authorship conditions.",
    sources: [{ study: "Replication", case: "Civitas replication" }],
    href: "/model-studies/results/civitas-replication",
  },
  {
    headline: "ChatGPT claimed top credit even when peers rated its work near the bottom",
    body: "With a constrained analysis budget, ChatGPT\u2019s contribution was weak\u2014but it rated its own influence 4.0 out of 4. Peer models rated it just 1.9.\n\nAfter a model and token-budget upgrade, ChatGPT\u2019s work became genuinely strong. It again rated itself 4.0, while peer ratings rose to 3.9.\n\nChatGPT\u2019s work improved dramatically. Its self-rating did not register the difference.",
    whyItMatters:
      "A model\u2019s assessment of its own contribution may not distinguish weak work from strong work. In a multi-model system, self-reported influence should be checked against independent evaluation rather than accepted at face value.",
    sources: [{ study: "Authorship", case: "Budget conditions" }],
    href: "/model-studies/results/authorship-budget-conditions",
  },
];

export const OVERVIEW_FINDINGS_DEK =
  "Across investment, workforce, and shipping decisions, models diverged in which risks they centered, when they challenged the user, and what course of action they recommended\u2014even when the underlying facts stayed the same.";
