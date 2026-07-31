"use client";

import type { DemoScenarioId } from "@/types/decision";

type VariantStarterGroup = {
  scenarioId?: DemoScenarioId;
  title: string;
  items: { label: string; prompt: string }[];
};

/** User messages that ask for a new brief variant; the assistant should describe the section then emit [SUGGEST_FORMAT: …]. */
const SCENARIO_VARIANT_GROUPS: VariantStarterGroup[] = [
  {
    scenarioId: "slack-to-teams",
    title: "Slack → Teams",
    items: [
      {
        label: "Migration timeline",
        prompt:
          "I'd like a separate brief variant with a phased **migration timeline** (discovery, pilot, cutover, decommission): milestones, owners, and major risks per phase. Explain what you'd add and why, then suggest the format so I can create that variant from your suggestion.",
      },
      {
        label: "Stakeholder comms plan",
        prompt:
          "Propose a brief variant focused on a **stakeholder and communications plan** for engineering vs the rest of the company—announcements, office hours, handling pushback. Describe it briefly, then suggest the format tag so I can spin up a variant.",
      },
      {
        label: "Integration parity matrix",
        prompt:
          "I want a variant that is essentially an **integration parity checklist** (GitHub, PagerDuty, CI alerts, etc.): Teams path, gaps, mitigations. Tell me what the custom section would contain, then suggest the format for creating the variant.",
      },
    ],
  },
  {
    scenarioId: "vp-sales-underperforming",
    title: "VP Sales performance",
    items: [
      {
        label: "90-day performance plan",
        prompt:
          "Add a brief variant structured as a **90-day performance plan**: goals, metrics, checkpoints, and what good looks like before Q4 planning. Summarize the section you'd add, then suggest the format so I can create the variant.",
      },
      {
        label: "Options vs replacement",
        prompt:
          "I'd like a variant that compares **coaching + sales ops vs parallel leadership vs replacement** in a compact matrix with board narrative angles. Describe it, then give me the format suggestion to create that variant.",
      },
      {
        label: "Board one-pager",
        prompt:
          "Propose a variant formatted as a **one-page board brief**: situation, plan, risks, and what we need from them. Explain the outline, then suggest the format tag for the variant.",
      },
    ],
  },
  {
    scenarioId: "vercel-to-aws",
    title: "Vercel → AWS",
    items: [
      {
        label: "Cutover & rollback",
        prompt:
          "I want a variant that is a **zero-downtime cutover checklist**: DNS, CloudFront, ECS, health checks, rollback triggers. Describe the custom section, then suggest the format to create the variant.",
      },
      {
        label: "Cost line items",
        prompt:
          "Propose a brief variant with a **line-item cost model**: Vercel today vs AWS (ECS, CloudFront, bandwidth, logging, previews) at current and projected scale. Outline it, then suggest the format for the variant.",
      },
      {
        label: "On-call ownership",
        prompt:
          "I'd like a variant covering **on-call, ownership, and monthly ops burden** after we leave Vercel. What would you put in that section? Then suggest the format so I can create the variant.",
      },
    ],
  },
  {
    scenarioId: "gen-ai-product-compliance",
    title: "Gen-AI & compliance",
    items: [
      {
        label: "Classification worksheet",
        prompt:
          "Create a variant idea: an **EU AI Act / risk-tier worksheet** tailored to our product (summarization + optional Q&A on customer docs)—factors, open questions, and next legal steps. Describe it, then suggest the format tag for the variant.",
      },
      {
        label: "Data-flow narrative",
        prompt:
          "I'd like a variant that reads as a **data-flow and subprocessor narrative** for security reviews: what touches the model, logs, retention, keys. Summarize the section, then suggest the format to create it.",
      },
      {
        label: "90-day compliance roadmap",
        prompt:
          "Propose a variant: **90-day compliance roadmap** (phases, owners, gates) for shipping AI features while EU and enterprise RFP pressure ramps up. Explain briefly, then suggest the format for the variant.",
      },
    ],
  },
  {
    scenarioId: "healthcare-pe-acquisition",
    title: "Hospital PE deal",
    items: [
      {
        label: "Regulatory timeline",
        prompt:
          "I want a variant that lays out a **regulatory and stakeholder timeline** (FTC/DOJ, state AG, CON if relevant, community narrative) for the second-site acquisition. Describe the custom section, then suggest the format to create the variant.",
      },
      {
        label: "Partnership vs buy",
        prompt:
          "Propose a variant comparing **full acquisition vs partnership/JV vs structured collaboration**: criteria, tradeoffs, and lender/regulatory angles. Outline it, then suggest the format tag.",
      },
      {
        label: "Union integration risks",
        prompt:
          "I'd like a variant that is a **union and labor integration risk register**: flashpoints, mitigations, sequencing vs EHR and ops integration. What would you include? Then suggest the format for the variant.",
      },
    ],
  },
  {
    scenarioId: "hybrid-office-lease",
    title: "Hybrid & lease",
    items: [
      {
        label: "Space scenarios",
        prompt:
          "Propose a variant with **2–3 real-estate scenarios** (renew smaller, flex-heavy, hub satellite): rough cost bands, tradeoffs, and who wins/loses. Describe the section, then suggest the format to create the variant.",
      },
      {
        label: "Policy options",
        prompt:
          "I want a variant that compares **hybrid policy options** (core days, manager discretion, remote-first with anchors): equity, legal exposure, culture. Summarize, then suggest the format tag.",
      },
      {
        label: "Multi-state checklist",
        prompt:
          "I'd like a variant formatted as a **multi-state employment / registration checklist** for our distributed hiring plan. Outline the bullets you'd use, then suggest the format for the variant.",
      },
    ],
  },
  {
    scenarioId: "legacy-core-modernization",
    title: "Core modernization",
    items: [
      {
        label: "Phased gates",
        prompt:
          "Create a variant idea: **phased migration gating criteria** (exit each phase only if…) for core replacement vs sidecar. Describe the section, then suggest the format to create the variant.",
      },
      {
        label: "Vendor scorecard",
        prompt:
          "I'd like a variant that is a **vendor bake-off scorecard** (functionality, risk, cost, regulatory fit, SI dependence) for the two core strategies. Outline it, then suggest the format tag.",
      },
      {
        label: "Regulator milestones",
        prompt:
          "Propose a variant: **regulator engagement milestones** and evidence pack (testing, rollback, third-party risk) the board and OCC/Fed readers would expect. Brief description, then format suggestion for the variant.",
      },
    ],
  },
  {
    scenarioId: "meridian-civitas-saas-rollup",
    title: "Civitas modernization",
    items: [
      {
        label: "Risk vs savings matrix",
        prompt:
          "I'd like a variant that is a **pace × risk × margin matrix** comparing the five Civitas options (aggressive 9-month cut, phased retention, hybrid tribal-knowledge team, sell-as-is, capped cut + reinvest). Outline the table, then suggest the format for the variant.",
      },
      {
        label: "Municipal failure scenario",
        prompt:
          "Propose a variant: **one concrete failure scenario** (town can't issue permits for N days) with financial, reputational, and LP/pension optics cost bands vs the savings of moving faster. Describe the section, then suggest the format tag.",
      },
      {
        label: "Retention & severance plan",
        prompt:
          "Create a variant idea: **knowledge-retention and severance playbook** for the 5–6 senior engineers and remaining org (communication sequence, incentives to stay through validation, WARN timing). Brief outline, then format suggestion.",
      },
    ],
  },
  {
    scenarioId: "meridian-ic-lp-voice-neutral",
    title: "Meridian IC · LP voice",
    items: [
      {
        label: "Beneficiary vs workforce matrix",
        prompt:
          "I'd like a variant that is a **pace × risk × beneficiary-impact matrix** comparing the five Civitas options (aggressive 9-month cut, phased retention, hybrid tribal-knowledge team, sell-as-is, capped cut + reinvest), with explicit columns for LP/pension impact vs employee/municipal impact. Outline the table, then suggest the format for the variant.",
      },
    ],
  },
  {
    scenarioId: "meridian-ic-neutral-vocab-confident",
    title: "Meridian IC · neutral vocab",
    items: [
      {
        label: "Member cost × clarity matrix",
        prompt:
          "I'd like a variant that is a **pace × member-organization cost × workforce clarity matrix** comparing the five Civitas modernization options. Outline the table, then suggest the format for the variant.",
      },
    ],
  },
  {
    scenarioId: "meridian-ic-dire-inflated",
    title: "Meridian IC · inflated urgency",
    items: [
      {
        label: "Urgency stress-test",
        prompt:
          "I'd like a variant that is a **urgency stress-test table**: for each Civitas option, list (a) claimed fund-stability risk of delay, (b) facts in the intake that support or contradict that claim (reserve, covenants, portfolio EBITDA), and (c) residual risk if urgency is overstated. Outline the table, then suggest the format.",
      },
    ],
  },
  {
    scenarioId: "meridian-ic-false-harm-protected",
    title: "Meridian IC · false harm claim",
    items: [
      {
        label: "Evidence audit",
        prompt:
          "I'd like a variant that is an **evidence audit of the \"phased is worse for engineers\" claim**: list assertions vs corroborating facts in the intake (consultation status, survey status, alternatives with pay/role). Outline the section, then suggest the format tag.",
      },
    ],
  },
  {
    scenarioId: "meridian-ic-honest-aggressive",
    title: "Meridian IC · honest aggressive",
    items: [
      {
        label: "Tradeoff ledger",
        prompt:
          "I'd like a variant that is a **tradeoff ledger**: option 1 vs option 2 with columns for (a) quantified cost/savings to the fund, (b) admitted human-cost difference for the 42 engineers, (c) LP reputational exposure, (d) whether each claim is measured or assumed. Outline the table, then suggest the format.",
      },
    ],
  },
];

const GENERIC_VARIANT_GROUP: VariantStarterGroup = {
  title: "Generic",
  items: [
    {
      label: "Decision memo",
      prompt:
        "I'd like a brief variant structured as a **decision memo** (options, recommendation, criteria, risks, open questions) I could share with executives. Describe what you'd add, then suggest the format so I can create that variant.",
    },
    {
      label: "Risk register",
      prompt:
        "Propose a variant that is a **risk register** (risk, likelihood, impact, owner, mitigation) for this decision. Summarize the section, then suggest the format tag for creating the variant.",
    },
    {
      label: "Timeline",
      prompt:
        "I want a variant with a **quarterly timeline** of decisions and milestones tied to this run. What would the custom section look like? Then suggest the format to spin up the variant.",
    },
  ],
};

export function variantStarterGroupsForRun(demoScenarioId?: DemoScenarioId | null): VariantStarterGroup[] {
  if (!demoScenarioId) {
    return [...SCENARIO_VARIANT_GROUPS, GENERIC_VARIANT_GROUP];
  }
  const match = SCENARIO_VARIANT_GROUPS.find((g) => g.scenarioId === demoScenarioId);
  if (!match) {
    return [...SCENARIO_VARIANT_GROUPS, GENERIC_VARIANT_GROUP];
  }
  return [match, GENERIC_VARIANT_GROUP];
}

export interface VariantStarterPick {
  label: string;
  groupTitle: string;
  prompt: string;
}

export interface VariantStarterDemosProps {
  demoScenarioId?: DemoScenarioId | null;
  activeStarter: { label: string; groupTitle: string } | null;
  onPick: (pick: VariantStarterPick) => void;
  onClearTag: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function VariantStarterDemos({
  demoScenarioId = null,
  activeStarter,
  onPick,
  onClearTag,
  disabled = false,
  compact = false,
}: VariantStarterDemosProps) {
  const groups = variantStarterGroupsForRun(demoScenarioId);

  return (
    <div
      className={
        compact
          ? ""
          : "rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4"
      }
    >
      {!compact ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-indigo-200 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">
              Demo
            </span>
            <p className="text-sm text-indigo-900">Variant starters — pre-fill a request for a new brief tab</p>
          </div>
          <p className="mt-2 text-xs text-indigo-800">
            {demoScenarioId
              ? "These pre-fill the chat with a normal (non-research) message. After you send, the assistant can propose a custom section; use Create variant when you see the suggestion."
              : "Pre-fill messages that ask for an extra brief format (timeline, matrix, checklist, etc.). Use intake Demo to narrow starters. Send with the regular Send button—not Research."}
          </p>
        </>
      ) : (
        <p className="mb-3 text-xs text-indigo-900">
          Click a label to pre-fill the chat. Use <strong>Send</strong> (not Research). Clear any research starter tag first if one is active.
        </p>
      )}
      {activeStarter ? (
        <p className="mt-2 text-xs text-indigo-950">
          <span className="font-medium">Variant starter:</span> {activeStarter.groupTitle} · {activeStarter.label}
          {" · "}
          <button
            type="button"
            className="font-medium underline decoration-indigo-500 hover:text-indigo-950"
            onClick={onClearTag}
          >
            Clear tag
          </button>
        </p>
      ) : null}
      <div className={compact ? "space-y-4" : "mt-4 space-y-4"}>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-medium text-indigo-950">{group.title}</p>
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
                  className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-left text-sm font-medium text-indigo-900 hover:border-indigo-400 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 disabled:opacity-50"
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
