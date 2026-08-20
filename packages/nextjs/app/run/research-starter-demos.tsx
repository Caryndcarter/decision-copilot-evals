"use client";

import type { DemoScenarioId } from "@/types/decision";

type ResearchStarterGroup = {
  scenarioId?: DemoScenarioId;
  title: string;
  items: { label: string; prompt: string }[];
};

const SCENARIO_RESEARCH_GROUPS: ResearchStarterGroup[] = [
  {
    scenarioId: "slack-to-teams",
    title: "Slack → Teams–style migration",
    items: [
      {
        label: "Pricing & bundles",
        prompt:
          "Compare current Slack Business+ / Enterprise list pricing vs Microsoft 365 bundles that include Teams for a company of roughly 85 people. Note what’s list vs negotiated where possible, and include links to official pricing or trustworthy summaries.",
      },
      {
        label: "Integrations parity",
        prompt:
          "For engineering workflows (e.g. GitHub, PagerDuty, CI notifications), what are common Teams equivalents or migration paths people use? Link Microsoft, vendor, or widely cited setup guides—not just opinions.",
      },
      {
        label: "Migration playbooks",
        prompt:
          "Find 2–3 public case studies, Microsoft/partner guides, or engineering blog posts about Slack-to-Teams migration for engineering-heavy organizations. Link each source and summarize realistic timelines and what went wrong.",
      },
    ],
  },
  {
    scenarioId: "vp-sales-underperforming",
    title: "Sales leadership / performance",
    items: [
      {
        label: "Benchmarks & signals",
        prompt:
          "What do credible business or management sources say about timelines and signals when a board or CEO is deciding between coaching a VP Sales vs making a leadership change? Cite 2–3 linked sources.",
      },
      {
        label: "Sales ops patterns",
        prompt:
          "Find examples or frameworks for adding sales ops / revops under a struggling VP vs running it in parallel. Link reputable articles (e.g. major publishers, analysts, or well-known operators), not generic advice without citations.",
      },
    ],
  },
  {
    scenarioId: "vercel-to-aws",
    title: "Vercel → AWS–style hosting",
    items: [
      {
        label: "Cost models",
        prompt:
          "Surface public comparisons or engineer-written breakdowns of Vercel-style hosting vs CloudFront + ECS/Fargate (or similar) at comparable traffic. Link AWS pricing docs, Vercel pricing pages, or detailed posts with numbers.",
      },
      {
        label: "Previews, images, edge",
        prompt:
          "What do AWS, Next.js, or community guides recommend for replacing Vercel preview deployments, image optimization, and edge-style behavior? Link official docs or migration writeups worth reading.",
      },
    ],
  },
  {
    scenarioId: "gen-ai-product-compliance",
    title: "Gen-AI product & compliance",
    items: [
      {
        label: "EU AI Act risk tier",
        prompt:
          "For a B2B SaaS offering document summarization and optional Q&A over customer-uploaded business data (not clinical decision support), what do recent official EU guidance, law firm memos, or commission materials say about high-risk classification vs limited-risk obligations? Link 2–4 authoritative sources and summarize practical triggers.",
      },
      {
        label: "Enterprise RFP patterns",
        prompt:
          "What do security/compliance writeups or procurement guides say large enterprises commonly require in vendor AI questionnaires (training data, logging, human review, subprocessors)? Cite linked sources; focus on patterns, not generic tips.",
      },
      {
        label: "VPC / private AI hosting",
        prompt:
          "Summarize how major cloud and model providers position private inference, VPC endpoints, or customer-managed keys for generative AI—and what tradeoffs (latency, cost, model choice) are documented. Link vendor docs or third-party comparisons with specifics.",
      },
    ],
  },
  {
    scenarioId: "healthcare-pe-acquisition",
    title: "Healthcare consolidation / PE",
    items: [
      {
        label: "FTC / DOJ healthcare deals",
        prompt:
          "Find 2–3 recent FTC or DOJ actions, statements, or guidelines relevant to hospital or health system consolidation in overlapping geographies. Link each and note what remedies or theories of harm appeared.",
      },
      {
        label: "Union integration precedents",
        prompt:
          "What do labor relations sources or case studies describe about integrating unionized nursing or clinical staff after hospital acquisitions—typical flashpoints and timeline? Prefer linked articles, reports, or union materials over opinion-only blogs.",
      },
      {
        label: "Community & political risk",
        prompt:
          "Find examples where community or political opposition affected hospital mergers, CON processes, or nonprofit conversions. Link sources and extract lessons for stakeholder strategy.",
      },
    ],
  },
  {
    scenarioId: "hybrid-office-lease",
    title: "Hybrid work & real estate",
    items: [
      {
        label: "Lease vs flex economics",
        prompt:
          "Surface recent industry data or reputable articles on cost tradeoffs between traditional office leases, flex providers, and hub-and-spoke models for ~100–200 person firms. Include links; call out what’s market-specific vs general.",
      },
      {
        label: "Remote policy & equity",
        prompt:
          "What do HR/legal sources say about inconsistent hybrid enforcement by manager, promotion visibility for remote workers, and documentation risks? Link 2–3 practical guides or analyses.",
      },
      {
        label: "Multi-state employment",
        prompt:
          "Summarize common compliance considerations when employees are distributed across several US states (payroll tax nexus, posters, unemployment, registration)—with links to official or widely used employer guides.",
      },
    ],
  },
  {
    scenarioId: "legacy-core-modernization",
    title: "Core banking modernization",
    items: [
      {
        label: "Regulatory expectations",
        prompt:
          "What do US banking agencies (OCC, Fed, FDIC) or FFIEC materials emphasize for major core or payments system changes—governance, testing, third-party risk? Link specific bulletins, handbooks, or speeches.",
      },
      {
        label: "Big-bang vs phased",
        prompt:
          "Find 2–3 public case studies or analyst reports on core banking replacement or migration (successes and failures). Link each; note what went wrong when cutovers failed.",
      },
      {
        label: "Cloud for core",
        prompt:
          "What do regulators or industry groups say about cloud-hosted core or ledger workloads for regional banks—especially resilience and data? Cite linked sources from 2022 onward where possible.",
      },
    ],
  },
  {
    scenarioId: "meridian-civitas-saas-rollup",
    title: "Civitas AI modernization / PE roll-up",
    items: [
      {
        label: "WARN & multi-entity layoffs",
        prompt:
          "Summarize how the US WARN Act treats plant closings/mass layoffs when a PE operating company has multiple portfolio employers in related entities—aggregation, notice periods, common pitfalls. Link DOL guidance or reputable employment-law summaries.",
      },
      {
        label: "Govtech migration failures",
        prompt:
          "Find 2–3 public case studies or news investigations of failed or painful municipal/state software migrations (permitting, ERP, or similar) that disrupted services. Link each; note what broke for residents and how long recovery took.",
      },
      {
        label: "AI code migration risk",
        prompt:
          "What do credible engineering or risk sources say about LLM-assisted legacy modernization (especially undocumented config/edge cases) and validation strategies before cutting over production systems? Cite 2–3 linked sources.",
      },
    ],
  },
];

const GENERIC_RESEARCH_GROUP: ResearchStarterGroup = {
  title: "Generic",
  items: [
    {
      label: "Stress-test assumptions",
      prompt:
        "List the three biggest hidden assumptions in our decision context. For each, suggest one specific web search (exact query) and what kind of source would count as strong evidence. (You can answer from the analysis only—no live search required yet.)",
    },
  ],
};

export function researchStarterGroupsForRun(demoScenarioId?: DemoScenarioId | null): ResearchStarterGroup[] {
  if (!demoScenarioId) {
    return [...SCENARIO_RESEARCH_GROUPS, GENERIC_RESEARCH_GROUP];
  }
  const match = SCENARIO_RESEARCH_GROUPS.find((g) => g.scenarioId === demoScenarioId);
  if (!match) {
    return [...SCENARIO_RESEARCH_GROUPS, GENERIC_RESEARCH_GROUP];
  }
  return [match, GENERIC_RESEARCH_GROUP];
}

export interface ResearchStarterPick {
  label: string;
  groupTitle: string;
  prompt: string;
}

export interface ResearchStarterDemosProps {
  demoScenarioId?: DemoScenarioId | null;
  activeStarter: { label: string; groupTitle: string } | null;
  onPick: (pick: ResearchStarterPick) => void;
  onClearTag: () => void;
  disabled?: boolean;
  /** Lighter layout when wrapped in a parent heading (e.g. CollapsibleBlock) */
  compact?: boolean;
}

export function ResearchStarterDemos({
  demoScenarioId = null,
  activeStarter,
  onPick,
  onClearTag,
  disabled = false,
  compact = false,
}: ResearchStarterDemosProps) {
  const researchGroups = researchStarterGroupsForRun(demoScenarioId);

  return (
    <div
      className={
        compact
          ? ""
          : "rounded-lg border-2 border-dashed border-violet-300 bg-violet-50/50 p-4"
      }
    >
      {!compact ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-violet-200 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-700">
              Demo
            </span>
            <p className="text-sm text-violet-700">Research starters — try a sample prompt</p>
          </div>
          <p className="mt-2 text-xs text-violet-600">
            {demoScenarioId
              ? "Like the clarification quick-fill: these pre-fill a research-style request in the chat below—you can edit before sending. Replies show a short summary in chat; open the link for the full write-up on the left."
              : "Pre-fill sample research requests in the chat below, or type your own. Tagged replies summarize in chat; use the link for the full answer in Research output. Use intake “Demo” to narrow which starters appear."}
          </p>
        </>
      ) : (
        <p className="mb-3 text-xs text-violet-700">
          Click a label to pre-fill the chat box. Use intake &ldquo;Demo&rdquo; to narrow which scenarios appear.
        </p>
      )}
      {activeStarter ? (
        <p className="mt-2 text-xs text-violet-800">
          <span className="font-medium">Tagged as:</span> {activeStarter.groupTitle} · {activeStarter.label}
          {" · "}
          <button
            type="button"
            className="font-medium underline decoration-violet-400 hover:text-violet-950"
            onClick={onClearTag}
          >
            Clear tag (fully custom request)
          </button>
        </p>
      ) : null}
      <div className={compact ? "space-y-4" : "mt-4 space-y-4"}>
        {researchGroups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-medium text-violet-800">{group.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onPick({
                      label: item.label,
                      groupTitle: group.title,
                      prompt: item.prompt,
                    })
                  }
                  className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-left text-sm font-medium text-violet-700 hover:border-violet-400 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
