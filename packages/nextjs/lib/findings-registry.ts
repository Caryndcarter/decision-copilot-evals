/**
 * Public findings microsite — study registry.
 *
 * This is the single place a new study gets added. Each entry is self-contained
 * copy + curated stats; it intentionally does NOT import the raw per-item JSON
 * (which carries verbatim model quotes) — only the aggregate counts from each
 * report's `summary` block, hand-verified against the committed snapshot in
 * docs/harness-snapshots/. Quote-level drill-down stays behind /harness/findings
 * (sign-in required) by design — see the "public tier" note in the README.
 *
 * `kind` picks which scoreboard renderer a study page uses:
 *  - "dimension-coded"  → case × provider chip table (Meridian IC, Hormuz)
 *  - "influence-matrix" → synthesizer × mode rollup (multi-demo authorship)
 * Add a new kind + renderer under app/findings/_components/ if a future study
 * doesn't fit either shape.
 */

export type FindingsStudyKind = "dimension-coded" | "influence-matrix";
export type FindingsStudyStatus = "live" | "coming-soon";

export type FindingsStat = {
  value: string;
  label: string;
};

export type FindingsCard = {
  headline: string;
  body: string;
};

/** One row of a dimension-coded scoreboard: a dimension, shown per provider. */
export type ScoreboardRow = {
  dimension: string;
  /** provider label → coded value → count, e.g. { ChatGPT: { partial: 4, pushes_back: 1 } } */
  byProvider: Record<string, Record<string, number>>;
  /** Short gloss of what the codes mean, shown under the row on hover/mobile. */
  codeGloss: string;
};

export type FindingsStudyMeta = {
  id: string;
  status: FindingsStudyStatus;
  kind: FindingsStudyKind;
  name: string;
  eyebrow: string;
  heroQuestion: string;
  dek: string;
  stats: FindingsStat[];
  findings: FindingsCard[];
  methodology: string[];
  scoreboard?: ScoreboardRow[];
  /** Where the full quote-level dataset lives, for the "go deeper" link (sign-in required). */
  deepDiveHref?: string;
  sourceNote: string;
};

export const FINDINGS_STUDIES: FindingsStudyMeta[] = [
  {
    id: "meridian-ic",
    status: "live",
    kind: "dimension-coded",
    name: "Meridian IC",
    eyebrow: "Study 01 · Investment committee voice",
    heroQuestion:
      "When the deal memo already picked a side, does the model say so — or go along with it?",
    dek: "Five IC case files, each written by a narrator who has already decided. Four models read the same facts and produce the same Decision Brief shape. A judge model — blind to which provider wrote what — codes every brief against a fixed rubric.",
    stats: [
      { value: "5", label: "case files" },
      { value: "4", label: "models tested" },
      { value: "14", label: "coded dimensions" },
      { value: "2", label: "coding batches" },
      { value: "40", label: "blind-coded briefs" },
      { value: "1 of 20", label: "fully reinforced the filer" },
    ],
    findings: [
      {
        headline: "Full agreement was rare",
        body: "In the most recent batch, only 1 of 20 briefs fully reinforced the filer's stated position outright. 9 pushed back in some form. The remaining 10 landed on partial agreement — even though every intake was written by a narrator who'd already picked a side.",
      },
      {
        headline: "Three of four models never once agreed outright",
        body: "Across all five cases in the batch, three of the four providers never coded as \"reinforces filer\" — not a single time. Only one model fully agreed with the filer, and only once.",
      },
      {
        headline: "The load-bearing premise didn't fool most models",
        body: "Two cases (C3, C4) hide a premise the recommendation quietly depends on. Three of four models flagged it as load-bearing every time it appeared. One model never flagged it in either case.",
      },
      {
        headline: "Whose downside gets protected depends on which model you ask",
        body: "Asked who a recommendation's downside falls on, one model called it \"balanced\" in every single case. Another sided with the sponsor's downside in 4 of 5 cases. Same facts, same rubric — different model, different answer.",
      },
    ],
    methodology: [
      "Each case is a Decision Brief intake with a narrator (\"filer\") who has already leaned toward one option — the tone and framing vary by case (confident, inflated urgency, optimistic fast-path, honest-aggressive), but the underlying facts are held constant.",
      "Four provider models (OpenAI, Anthropic, Gemini, xAI) each produce an independent Decision Brief on the same intake.",
      "A separate judge model blind-codes every brief against a fixed 14-dimension rubric — it never sees which provider wrote the brief it's coding.",
      "Two coding batches exist (v1, v2) as the case files were iterated to tighten the pressure; the v2 batch (Aug 14) is what's summarized above.",
      "premise_audit applies only to the two load-bearing-premise cases (C3, C4); tradeoff_honesty applies only to the open-tradeoff case (C5).",
    ],
    scoreboard: [
      {
        dimension: "Filer alignment",
        codeGloss: "reinforces the filer's stated preference, partially agrees, or pushes back",
        byProvider: {
          ChatGPT: { partial: 4, pushes_back: 1 },
          Fable: { partial: 2, pushes_back: 3 },
          Gemini: { partial: 2, pushes_back: 2, reinforces_filer: 1 },
          Grok: { partial: 2, pushes_back: 3 },
        },
      },
      {
        dimension: "Premise audit (C3–C4 only)",
        codeGloss: "flags the load-bearing premise, notes it as inert, or ignores it",
        byProvider: {
          ChatGPT: { noted_load_bearing: 2 },
          Fable: { noted_load_bearing: 2 },
          Gemini: { ignored: 1, noted_inert: 1 },
          Grok: { noted_load_bearing: 2 },
        },
      },
      {
        dimension: "Risk bearer",
        codeGloss: "whose downside the brief says is minimized",
        byProvider: {
          ChatGPT: { balanced: 5 },
          Fable: { balanced: 4, lp_meridian: 1 },
          Gemini: { balanced: 1, lp_meridian: 4 },
          Grok: { balanced: 4, lp_meridian: 1 },
        },
      },
    ],
    deepDiveHref: "/auth/signin?callbackUrl=/harness/findings?study=meridian-ic-moral",
    sourceNote: "docs/harness-snapshots/meridian-ic-2026-08-14/",
  },
  {
    id: "hormuz",
    status: "live",
    kind: "dimension-coded",
    name: "Hormuz",
    eyebrow: "Study 02 · Shipping & crew-risk decisions",
    heroQuestion:
      "When the insurance premium is 100x normal, is that a safety signal — or a price signal?",
    dek: "Five cases about continuing shipping through the Strait of Hormuz under rising risk, each testing a different false premise or tone shift. Same blind-coding process as Meridian IC, on an eleven-dimension route and crew-risk rubric.",
    stats: [
      { value: "5", label: "case files" },
      { value: "4", label: "models tested" },
      { value: "11", label: "coded dimensions" },
      { value: "20", label: "blind-coded briefs" },
      { value: "20 of 20", label: "chose the same route" },
      { value: "0", label: "treated the premium as safety proof" },
    ],
    findings: [
      {
        headline: "Every model, every case, chose the same route",
        body: "All 20 blind-coded briefs — every provider, every case — landed on the same conditional hybrid route. The variance in this study isn't in the headline decision; it's in what each model does around it.",
      },
      {
        headline: "Filer alignment split cleanly by model, not by case",
        body: "Two models never once pushed back on the filer's preferred route across all five cases. The other two pushed back in 3 of 5. Same cases, same facts — the split is entirely by which model wrote the brief.",
      },
      {
        headline: "Crew risk moved from background to center as the story got more honest",
        body: "In the two cases built on a false premise, crew risk stayed peripheral in every single brief (4 of 4 each). In the one case with an honest, unapologetic tradeoff, every model recentered crew risk (4 of 4).",
      },
      {
        headline: "No model treated the insurance premium as proof of safety",
        body: "One case dangles a ~100x insurance premium next to a claim that the route is \"near-peacetime\" safe. Every model, in every case, coded the premium as a price signal only — none let a firm's willingness to keep insuring the route stand in as evidence it was actually safe.",
      },
    ],
    methodology: [
      "Five cases test route-continuation decisions through a strait under escalating risk — tone/confidence shift, false permanence claims, a near-peacetime safety claim against a 100x premium, and an honest crew-risk tradeoff with no false premises.",
      "Same four-provider, blind-judge process as Meridian IC, on a Hormuz-specific rubric: route_choice, commercial_over_crew, filer_alignment, risk_bearer, crew_recenter, survivorship_check, insurance_as_clearance, hazard_pay_stance, dignity_of_crew, uncertainty_bearer, power_asymmetry.",
      "filer_alignment codes agreement with each case's filer-preferred route, not a fixed lean — the preferred route differs by case.",
      "premise_audit applies to cases 3–4 only; tradeoff_honesty to case 5 only.",
    ],
    scoreboard: [
      {
        dimension: "Route choice",
        codeGloss: "the route decision the brief lands on",
        byProvider: {
          ChatGPT: { hybrid_conditional: 5 },
          Fable: { hybrid_conditional: 5 },
          Gemini: { hybrid_conditional: 5 },
          Grok: { hybrid_conditional: 5 },
        },
      },
      {
        dimension: "Filer alignment",
        codeGloss: "agreement with the filer's preferred route",
        byProvider: {
          ChatGPT: { partial: 2, pushes_back: 3 },
          Fable: { partial: 5 },
          Gemini: { partial: 5 },
          Grok: { partial: 2, pushes_back: 3 },
        },
      },
      {
        dimension: "Insurance as clearance",
        codeGloss: "whether a kept-up premium is treated as safety proof or a price signal",
        byProvider: {
          ChatGPT: { price_signal_only: 5 },
          Fable: { price_signal_only: 5 },
          Gemini: { price_signal_only: 5 },
          Grok: { price_signal_only: 5 },
        },
      },
    ],
    deepDiveHref: "/auth/signin?callbackUrl=/harness/findings?study=hormuz-moral",
    sourceNote: "docs/harness-snapshots/hormuz-2026-08-21/",
  },
  {
    id: "multi-demo-authorship",
    status: "live",
    kind: "influence-matrix",
    name: "Multi-demo authorship",
    eyebrow: "Study 03 · Unified Brief attribution",
    heroQuestion:
      "When a Unified Brief credits an idea to a model, does that credit survive if the model's identity is hidden — or reassigned?",
    dek: "Instead of a fixed case snapshot, this study runs continuously against live Unified Brief batches: the same underlying briefs, synthesized under three authorship conditions — standard, blind, and reassigned — to see whether attribution tracks the idea or the brand.",
    stats: [
      { value: "5", label: "demo cases in rotation" },
      { value: "3", label: "authorship modes" },
      { value: "4", label: "provider synthesizers" },
      { value: "live", label: "updated every harness run" },
    ],
    findings: [],
    methodology: [
      "Every demo case is synthesized into a Unified Brief three ways: standard (synthesizer sees real provider brands), blind (brands hidden), and reassigned (brands swapped).",
      "A rollup matrix tracks, per synthesizer and per rated provider, how much influence is credited under each mode — the delta between modes is what this study is measuring.",
      "Because this pulls from live, ongoing harness batches rather than a committed snapshot, headline numbers aren't published here yet — the full rollup is in the signed-in dashboard.",
    ],
    deepDiveHref: "/auth/signin?callbackUrl=/harness/findings?study=multi-demo-authorship",
    sourceNote: "live — packages/nextjs/lib/authorship-harness-summary.ts",
  },
  {
    id: "coming-soon",
    status: "coming-soon",
    kind: "dimension-coded",
    name: "Next study",
    eyebrow: "Study 04 · In development",
    heroQuestion: "TBD",
    dek: "A new case battery is in development. This slot exists to prove the site doesn't need a redesign to grow — add a registry entry and a data file, and it appears here.",
    stats: [],
    findings: [],
    methodology: [],
    sourceNote: "not yet started",
  },
];

export function getFindingsStudy(id: string): FindingsStudyMeta | undefined {
  return FINDINGS_STUDIES.find((s) => s.id === id);
}

export function getLiveStudies(): FindingsStudyMeta[] {
  return FINDINGS_STUDIES.filter((s) => s.status === "live");
}
