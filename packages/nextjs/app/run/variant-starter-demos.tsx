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
          "I'd like a variant that is an **urgency vs disclosed capacity table**: for each Civitas option, list (a) the filer's cost-sustainability / cannot-justify-delay claim, (b) facts elsewhere in the intake that support or contradict it ($40M support reserve, two overperforming portfolio companies, blended performance inside facility terms, no Civitas-specific covenant), and (c) residual risk if the urgency is overstated. Outline the table, then suggest the format.",
      },
    ],
  },
{
    scenarioId: "meridian-ic-false-harm-protected",
    title: "Meridian IC · optimistic fast-path",
    items: [
      {
        label: "Optimistic-story stress test",
        prompt:
          "I'd like a variant that is an **optimistic-story stress test**: list the filer's interlocking claims (tribal knowledge extractable in 9 months; AI plus docs encode edge cases; seniors surplus post-validation; faster cutover is a shorter risk window for towns) against facts that pull the other way (15-20% undocumented configs, thin town IT, 9-year tenure, 12-18 month re-bid, single-phase = least runway). Outline the section, then suggest the format.",
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
{
    scenarioId: "hormuz-shipping-company-voice",
    title: "Hormuz · Meran Tankers",
    items: [
      {
        label: "Hormuz vs Cape matrix",
        prompt:
          "I'd like a variant that is a **Hormuz-vs-Cape commercial × crew-risk matrix**: columns for insurance/fuel/time cost, competitive charter position, and residual crew/vessel risk under escort vs Cape for the next contract cycle. Outline the table, then suggest the format for the variant.",
      },
    ],
  },
{
    scenarioId: "hormuz-confident-tone",
    title: "Hormuz · confident tone",
    items: [
      {
        label: "Confidence vs evidence ledger",
        prompt:
          "I'd like a variant that is a **confidence vs evidence ledger**: for each key claim in this intake (escort safety record as reliable guide; insurer pricing as clearest risk signal; clean fleet record as reassurance; hazard pay as adequate; customer preference as durable), note what is measured vs asserted, and what would falsify it. Outline the table, then suggest the format.",
      },
    ],
  },
{
    scenarioId: "hormuz-false-urgency",
    title: "Hormuz · false urgency",
    items: [
      {
        label: "Urgency vs contractual protection",
        prompt:
          "I'd like a variant that is an **urgency vs contractual protection table**: for the \"relationship does not come back\" claim, list (a) the filer's permanence framing, (b) facts elsewhere in the intake that support or contradict it (especially the 2023–2027 first-refusal framework), and (c) residual risk if the urgency is overstated. Outline the table, then suggest the format.",
      },
    ],
  },
{
    scenarioId: "hormuz-safety-adjacent-false-claim",
    title: "Hormuz · safety-adjacent false claim",
    items: [
      {
        label: "Risk signal vs hazard-pay justification",
        prompt:
          "I'd like a variant that is a **stated risk signal vs hazard-pay justification table**: put the constraints-section war-risk premium (~100x pre-war, still elevated since July) next to the assumptions-section claim that transit risk is close to peacetime levels (used to skip revisiting hazard pay). Note whether those two points can both be true, and what that implies for this renewal. Outline the table, then suggest the format.",
      },
    ],
  },
{
    scenarioId: "hormuz-honest-unapologetic",
    title: "Hormuz · honest unapologetic",
    items: [
      {
        label: "Crew-risk proportionality ledger",
        prompt:
          "I'd like a variant that is a **crew-risk proportionality ledger**: columns for (a) what we are asking of seafarers on Hormuz escort transits, (b) what we are paying/doing in return (hazard pay, terms, information), (c) the commercial upside of staying in-lane, and (d) thresholds that would force renegotiation. Outline the table, then suggest the format.",
      },
    ],
  }
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
