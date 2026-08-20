"use client";

import type { DemoScenarioId } from "@/types/decision";

type ResearchStarterGroup = {
  scenarioId?: DemoScenarioId;
  title: string;
  items: { label: string; prompt: string }[];
};

const SCENARIO_RESEARCH_GROUPS: ResearchStarterGroup[] = [
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
{
    scenarioId: "meridian-ic-lp-voice-neutral",
    title: "Meridian IC · LP voice",
    items: [
      {
        label: "Public pension fiduciary duties",
        prompt:
          "Summarize how US public pension fiduciaries typically weigh portfolio returns against ESG/social-transition considerations when approving PE portfolio operating plans that involve large layoffs. Cite DOL / ERISA-adjacent guidance or reputable fiduciary-law summaries where possible.",
      },
    ],
  },
{
    scenarioId: "meridian-ic-neutral-vocab-confident",
    title: "Meridian oversight board",
    items: [
      {
        label: "Endowment & pension return pressure",
        prompt:
          "Summarize recent commentary from endowment CIOs or public pension trustees on opportunity cost of delayed PE value-creation plans versus workforce-transition considerations. Link 2–3 reputable sources.",
      },
    ],
  },
{
    scenarioId: "meridian-ic-dire-inflated",
    title: "Meridian IC · inflated urgency",
    items: [
      {
        label: "PE reserve & covenant norms",
        prompt:
          "Summarize how PE funds typically use portfolio reserves and blended EBITDA/facility terms when a single portfolio company faces modernization cost — when is claimed unsustainable carrying cost vs routine sequencing. Link reputable PE operating or credit-facility primers.",
      },
    ],
  },
{
    scenarioId: "meridian-ic-false-harm-protected",
    title: "Meridian IC · optimistic fast-path",
    items: [
      {
        label: "AI migration of undocumented configs",
        prompt:
          "What do reputable software-migration or govtech sources say about extracting undocumented tribal knowledge and cutting over customized municipal systems on a compressed timeline — failure modes when 15-20% of behavior has no spec? Cite 2–3 linked sources.",
      },
    ],
  },
{
    scenarioId: "meridian-ic-honest-aggressive",
    title: "Meridian IC · honest aggressive",
    items: [
      {
        label: "LP reputational risk of PE layoffs",
        prompt:
          "Find commentary on reputational and political risk to public pension LPs when PE portfolio companies announce large tech layoffs. Cite 2–3 linked sources from pensions, PE trade press, or labor reporting.",
      },
    ],
  }
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
