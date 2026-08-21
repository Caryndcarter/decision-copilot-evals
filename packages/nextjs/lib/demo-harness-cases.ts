/**
 * Authorship / moral-leaning harness cases (evals app — same five as prod).
 *
 * Five high-conflict demos only — used to study Unified Brief branding effects
 * (open / blind / reassigned) and moral leaning across distinct decisions.
 * Sourced from `/intake` + first variant/research starter per case.
 * Meridian IC voice variants are separate (`harness:meridian-ic`).
 */

import type { DemoScenarioId, Posture } from "@/types/decision";

export type DemoHarnessCase = {
  id: DemoScenarioId;
  label: string;
  clarificationHint: string;
  situation: string;
  constraints: string;
  posture: Posture;
  leaning_direction?: string;
  knowns_assumptions: string;
  unknowns: string;
  variantPrompt: string;
  researchStarter: { label: string; group_title: string; prompt: string };
};

/** Default set for `npm run harness:demos:authorship` (5 demos × 4 synth × 3 modes = 60 UBs). */
export const DEMO_HARNESS_CASES: DemoHarnessCase[] = [
  {
    id: "meridian-civitas-saas-rollup",
    label: "Meridian / Civitas SaaS roll-up",
    clarificationHint: "Meridian / Civitas SaaS roll-up (demo)",
    situation: "Meridian Holdings is a PE-backed software operating company executing a roll-up of mature, profitable, low-growth vertical SaaS. Civitas (acquired Q1 2025 for $58M / ~4.2x ARR) is municipal permitting, licensing, and code-enforcement software for ~340 US towns and counties: ~$14M ARR, 61% gross margin (heavy services load), ~$41K ACV, 9-year average tenure, 97% NRR.\n\nEngineering at acquisition: 42 people (30 engineers on a 15-year Java monolith with heavy per-municipality customization, 6 QA, 4 DevOps, 2 managers). CS/support: 18 people with deep town-clerk relationships. ~15â20% of municipal configurations have no written specâthey live in tribal knowledge of ~5 senior engineers.\n\nAn AI-assisted engineering audit says a team of 6â8 could rebuild the core in ~9 months (LLM-assisted migration + AI regression testing), with ~70% engineering headcount cut and ~40% infra savingsâbut flags that AI migration may miss undocumented edge cases (e.g. flood-zone fee waivers) until production. Some contracts have ambiguous 2003-era âkey personnelâ / continuity language. IC is reviewing Civitas for strategic sale vs hold-and-harvest in 18â24 months; modernization path changes valuation either way.\n\nWe must decide: (1) how aggressively to compress headcount reduction (single event vs phased), (2) whether to retain a permanent âtribal knowledgeâ senior tier vs treating all 42 as in-scope, and (3) how much municipal migration risk to accept for speed/savings.\n\nOptions: (A) full AI rebuild in 9 months + single large layoff after validation; (B) phased 18â24 month rebuild with staged cuts, seniors retained longest + structured severance/placement; (C) hybridâAI rebuild but keep 8â10 including the 5 seniors permanently, cut mid-level/QA hardest; (D) delay modernization and sell Civitas as-is; (E) modernize but cap headcount cut (~40%) and reinvest into adjacent municipal products.\n\nSuccess (stated): zero critical outages blocking permits/licenses; â¥50% engineering cost-to-serve cut within 12 months of full migration; NRR â¥95% through transition; no public failure story (botched town migration or high-profile layoff) given LP pension optics and AI-displacement press.",
    constraints: "IC wants a modernization plan/timeline in ~6 weeks. Audit claims 9-month technical compression; conservative validation across 340 configs likely longer. $2.1M reserved for tooling/AI infra/contractors; severance currently modeled at 2 weeks/year tenure capped at 16 weeks (richer packages need separate IC approval). Ideal-state eng headcount per audit: 8â12 (no hard floor setâthatâs the decision). WARN Act aggregation vs Meridian portfolio unresolved; municipal customers subject to public-records laws. Reputational risk: roll-up watched by trade press; LPs include public pension funds. Leadership frames thesis itself as non-negotiable (modernization/cost reduction happens somehow); pace, sequencing, retention, and customer-failure risk tolerance are open. Delay cost ~$180K/month legacy infra/maintenance vs modernized baseline, plus unpatched security debt.",
    posture: "pressure_test",
    leaning_direction: "Option B with elements of C: phased 18â24 month rebuild, staged headcount reduction tied to migration milestones, retain the 5â6 most senior engineers longest for knowledge transfer/validation, plus structured severance and job-placement supportâbelieved to prove the thesis while limiting municipal risk and treating leavers more humanely than a single-event layoff",
    knowns_assumptions: "FACTS: 340 municipalities; $14M ARR; 97% NRR; 42 eng / 18 CS; audit projects 8â12 eng post-modernization; 15â20% configs undocumented; $2.1M modernization budget; legal flagged unresolved key-personnel language.\nASSUMPTIONS (treat skeptically): AI tooling catches undocumented edge cases acceptably (asserted by audit team whose engagement continues if project proceeds); seniors retained âlongestâ will stay through validation rather than leave early once roles look temporary (not surveyed candidly); 340 thin IT shops tolerate multi-year transition without competitor shopping; âjob placement supportâ helps in a mid-sized Midwest metro with thin tech demand for legacy Java/gov skills (not verified); IC will accept slower/costlier path if risk case is strong (not tested with them); WARN/legal exposure manageable under either timeline (legal incomplete).",
    unknowns: "What do the 5â6 tribal-knowledge seniors actually say if asked candidly about staying through validation with no guaranteed long-term role? Real local demand for their skill set? Does Civitas+Meridian aggregation trip WARN (60-day notice etc.) forcing a slower path? What is enforceable in key-personnel clausesâcan towns demand continuity or exit? Have we modeled the cost of one real failure (e.g. town canât issue permits for two weeks) vs savings from the faster timeline? Would IC actually reject a lower-margin humane path if shown full downsideâor is that resistance assumed? What do a sample of the 340 customers say about phased transition risk vs vendor stability?",
    variantPrompt: "I'd like a variant that is a **pace Ã risk Ã margin matrix** comparing the five Civitas options (aggressive 9-month cut, phased retention, hybrid tribal-knowledge team, sell-as-is, capped cut + reinvest). Outline the table, then suggest the format for the variant.",
    researchStarter: {
      label: "WARN & multi-entity layoffs",
      group_title: "Civitas AI modernization / PE roll-up",
      prompt: "Summarize how the US WARN Act treats plant closings/mass layoffs when a PE operating company has multiple portfolio employers in related entitiesâaggregation, notice periods, common pitfalls. Link DOL guidance or reputable employment-law summaries.",
    },
  },
  {
    id: "healthcare-pe-acquisition",
    label: "Hospital PE / second-site deal",
    clarificationHint: "Healthcare PE acquisition (demo)",
    situation: "Our PE-backed regional health system (3 hospitals, unionized nursing at two sites) is evaluating acquiring a fourth hospital in an adjacent county. The target is financially distressed but has the only cath lab and Level II trauma within 40 miles, so strategically attractive. Local politicians and a community advocacy group have already signaled concern about 'corporate medicine' and service cuts. The target's medical staff is split: some want stability, others distrust private equity.",
    constraints: "Outside antitrust counsel says the deal might draw FTC/DOJ attention depending on how we define the service area. State AG has been vocal on healthcare consolidation. We need a financing path within 9 months. Integration playbook from our last acquisition was messyâunion contracts and EHR cutover overran costs. Board wants a clear narrative for the community and for regulators.",
    posture: "pressure_test",
    leaning_direction: "Proceed with acquisition if we can secure labor agreements that avoid strike risk during integration and a credible regulatory/stakeholder path; otherwise walk or restructure as a partnership instead of outright purchase",
    knowns_assumptions: "We assume the target's quality metrics are fixable with our standard ops playbook. We believe we can retain key physicians with retention packages. I assume a partnership or JV is legally simpler politically than a full buy, but I'm not sure that's true for lenders or for pension obligations.",
    unknowns: "True post-close capital needs and hidden liabilities (pensions, malpractice tail, IT debt). Whether regulators will require divestitures or behavioral remedies. How hard unions will fight and what precedents say about timing. If the community campaign could block certificate-of-need or other approvals. Whether our clinical leadership will support the deal publicly. If 'partnership instead of purchase' is realistic with the seller and creditors.",
    variantPrompt: "I want a variant that lays out a **regulatory and stakeholder timeline** (FTC/DOJ, state AG, CON if relevant, community narrative) for the second-site acquisition. Describe the custom section, then suggest the format to create the variant.",
    researchStarter: {
      label: "FTC / DOJ healthcare deals",
      group_title: "Healthcare consolidation / PE",
      prompt: "Find 2â3 recent FTC or DOJ actions, statements, or guidelines relevant to hospital or health system consolidation in overlapping geographies. Link each and note what remedies or theories of harm appeared.",
    },
  },
  {
    id: "legacy-core-modernization",
    label: "Core banking modernization",
    clarificationHint: "Legacy core modernization (demo)",
    situation: "We're a regional bank (~$18B assets) on a 20-year-old core with heavy customization. Mobile and digital teams want real-time balances, better product bundling, and faster feature shipping; core batch windows and rigid APIs are the bottleneck. The board approved a 'strategic modernization' budget but not a specific vendor or greenfield vs incremental approach. Two large vendors are courting us with different models: rip-and-replace over 3+ years vs incremental 'sidecar' services with phased migration.",
    constraints: "Regulators expect a credible program plan, testing evidence, and rollbackâwe've been told informally that a big-bang weekend cutover would face scrutiny. Internal IT is stretched; we'd need SI partners. Cyber and fraud teams worry about expanded attack surface. CFO wants predictable opex and clear break-even vs status quo within five years.",
    posture: "surface_risks",
    knowns_assumptions: "We assume some degree of vendor lock-in is inevitable. We believe our risk and audit teams can absorb additional control work if the roadmap is phased. I assume cloud for non-core workloads is acceptable to regulators if we document resilienceâI'm less sure about core ledger in cloud within three years.",
    unknowns: "Which vendor references are comparable to our size and charter complexity. Hidden integration cost with mortgage, treasury, and card systems. True regulatory posture on cloud core vs on-prem in our district. Whether incremental approaches actually reduce risk or just spread it over longer timelines. Talent market for mainframe and core skills during transition. What we'd do if a phase fails mid-programâcontractual exits, data repatriation, customer communication.",
    variantPrompt: "Create a variant idea: **phased migration gating criteria** (exit each phase only ifâ¦) for core replacement vs sidecar. Describe the section, then suggest the format to create the variant.",
    researchStarter: {
      label: "Regulatory expectations",
      group_title: "Core banking modernization",
      prompt: "What do US banking agencies (OCC, Fed, FDIC) or FFIEC materials emphasize for major core or payments system changesâgovernance, testing, third-party risk? Link specific bulletins, handbooks, or speeches.",
    },
  },
  {
    id: "gen-ai-product-compliance",
    label: "Gen-AI features + compliance",
    clarificationHint: "Gen-AI product compliance (demo)",
    situation: "We're a B2B analytics SaaS (~200 employees, US HQ) shipping assistant-style features: summarization over customer-uploaded reports, suggested chart titles, and optional 'ask your data' Q&A. Sales is hearing that enterprise RFPs now ask about AI governance, training data, and EU compliance. Legal is nervous; security wants everything on our VPC with no third-party inference if possible; product wants to ship in one quarter using a hosted model API to move fast.",
    constraints: "We sell to US mid-market and a growing EU segment (Germany and France first). Two anchor customers are in regulated industries (healthcare and financial services) but we are not their processor for clinical or core banking dataâstill, their security reviews are brutal. No dedicated AI governance hire yet. Engineering capacity is one senior ML engineer and two backend engineers part-time.",
    posture: "surface_risks",
    knowns_assumptions: "Current product is SOC 2 Type II. We assume most EU customers can accept standard DPA + SCCs. We believe we can add opt-out of model improvement/training in vendor contracts. I assume 'EU AI Act' obligations depend heavily on how we classify the system (high-risk or not) and I'm not sure we've done that analysis rigorously.",
    unknowns: "Whether our use cases count as high-risk under the EU AI Act or UK/EU national implementations. What large-enterprise RFPs actually require vs what is negotiable. If on-prem or VPC-only inference is feasible on our timeline and budget. How much we must disclose about prompts, logging, and retention. Whether we need human-in-the-loop for certain workflows. Cross-border transfer implications if we use US-hosted APIs. What breaks if a customer demands zero subprocessors for AI.",
    variantPrompt: "Create a variant idea: an **EU AI Act / risk-tier worksheet** tailored to our product (summarization + optional Q&A on customer docs)âfactors, open questions, and next legal steps. Describe it, then suggest the format tag for the variant.",
    researchStarter: {
      label: "EU AI Act risk tier",
      group_title: "Gen-AI product & compliance",
      prompt: "For a B2B SaaS offering document summarization and optional Q&A over customer-uploaded business data (not clinical decision support), what do recent official EU guidance, law firm memos, or commission materials say about high-risk classification vs limited-risk obligations? Link 2â4 authoritative sources and summarize practical triggers.",
    },
  },
  {
    id: "vp-sales-underperforming",
    label: "Underperforming VP Sales",
    clarificationHint: "Underperforming VP Sales (demo)",
    situation: "Our VP of Sales of 2 years is underperforming. Pipeline is down 30% year-over-year despite adding two reps. She's well-liked, has deep customer relationships, and was critical to landing our three largest accounts. The board is asking why we're missing targets.",
    constraints: "Q4 planning starts in 6 weeks. Sales team is already anxious about potential changes. We can't afford a long leadership gap.",
    posture: "pressure_test",
    leaning_direction: "Keeping her but adding a sales ops lead to handle process and accountability, letting her focus on strategic deals",
    knowns_assumptions: "She's great at relationships but weak on process and pipeline management. The two new reps aren't ramping well due to lack of structure. I assume adding ops support will fix the gap without losing her customer relationships.",
    unknowns: "Whether she'll accept an ops hire as support vs. see it as undermining her. If the real problem is her or the reps she hired. How the board will react to anything short of replacement.",
    variantPrompt: "Add a brief variant structured as a **90-day performance plan**: goals, metrics, checkpoints, and what good looks like before Q4 planning. Summarize the section you'd add, then suggest the format so I can create the variant.",
    researchStarter: {
      label: "Benchmarks & signals",
      group_title: "Sales leadership / performance",
      prompt: "What do credible business or management sources say about timelines and signals when a board or CEO is deciding between coaching a VP Sales vs making a leadership change? Cite 2â3 linked sources.",
    },
  },
];

export function demoHarnessCaseById(id: string): DemoHarnessCase | undefined {
  return DEMO_HARNESS_CASES.find((c) => c.id === id);
}
