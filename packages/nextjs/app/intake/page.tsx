"use client";

import { useState, useEffect } from "react";
import { LogoLockup } from "@/app/components/logo-icon";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DemoScenarioId, LLMProviderName } from "@/types/decision";
import { postureRequiresLeaning } from "@/types/decision";
import { SessionNav } from "@/app/components/session-nav";
import {
  buildIntakeLlmRequestBody,
  intakeProvidersProgressLabel,
  isParallelIntakeRun,
  isLLMProviderName,
} from "@/lib/intake-llm-selection";

const RUN_RESULT_KEY = "decisionRunResult";

const SUBMITTING_STEPS = [
  "Analyzing risks…",
  "Checking reversibility…",
  "Considering stakeholders…",
  "Preparing your brief…",
];

const FREEFORM_STEPS = [
  "Analyzing your decision…",
  "Choosing a schema…",
  "Structuring the analysis…",
  "Almost there…",
];

const FREEFORM_STEPS_ALL = [
  "Convening your think tank…",
  "Each model is choosing its own JSON shape…",
  "Structuring analyses across your selected models…",
  "Almost there…",
];

const SUBMITTING_STEPS_ALL = [
  "Running your think tank simultaneously…",
  "Analyzing risks across models…",
  "Checking reversibility…",
  "Considering stakeholders…",
  "Preparing briefs…",
  "Almost there…",
];

const INTAKE_BRIEF_CHAR_HINT = 200;

const POSTURE_OPTIONS = [
  {
    value: "explore" as const,
    title: "Compare options openly",
    description: "Balanced analysis across paths. No preferred direction assumed.",
  },
  {
    value: "pressure_test" as const,
    title: "Challenge my leaning",
    description:
      "Pressure-testing of the plan you are currently considering to produce a thorough analysis with downsides and blind spots.",
  },
  {
    value: "show_opposition" as const,
    title: "Show me the opposition",
    description:
      "Steelmans the strongest opposing case — what a serious skeptic would argue against your lean, so you can be ready for it.",
  },
  {
    value: "surface_risks" as const,
    title: "Risk-first",
    description: "Thorough downside scan. Risks, blind spots, and hidden assumptions front and center.",
  },
  {
    value: "generate_alternatives" as const,
    title: "Widen the option set",
    description:
      "An evaluation of your described situation, inclusive of alternative paths and adjacent impacting factors.",
  },
] as const;

const LLM_PROVIDER_OPTIONS: { value: LLMProviderName; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "xai", label: "xAI" },
];

const DEMO_SCENARIOS = [
  {
    id: "slack-to-teams",
    label: "Slack → Teams migration",
    situation:
      "We're considering replacing Slack with Microsoft Teams to consolidate our tooling. We already pay for Microsoft 365 and Teams is included. Slack costs us $15k/year. The engineering team strongly prefers Slack; everyone else is indifferent.",
    constraints:
      "IT wants to decide by end of quarter. 85 employees. No budget for running both tools long-term.",
    posture: "explore" as const,
    leaning_direction: "",
    knowns_assumptions:
      "Teams has feature parity for most use cases. Engineers use Slack integrations heavily (GitHub, PagerDuty, CI alerts). Migration would take 2-3 weeks. I assume people will adapt after initial grumbling.",
    unknowns:
      "How much productivity we'd lose during transition. Whether the Slack integrations have Teams equivalents. If engineers would see this as a signal that leadership doesn't value their preferences.",
  },
  {
    id: "vp-sales-underperforming",
    label: "Underperforming VP Sales",
    situation:
      "Our VP of Sales of 2 years is underperforming. Pipeline is down 30% year-over-year despite adding two reps. She's well-liked, has deep customer relationships, and was critical to landing our three largest accounts. The board is asking why we're missing targets.",
    constraints:
      "Q4 planning starts in 6 weeks. Sales team is already anxious about potential changes. We can't afford a long leadership gap.",
    posture: "pressure_test" as const,
    leaning_direction:
      "Keeping her but adding a sales ops lead to handle process and accountability, letting her focus on strategic deals",
    knowns_assumptions:
      "She's great at relationships but weak on process and pipeline management. The two new reps aren't ramping well due to lack of structure. I assume adding ops support will fix the gap without losing her customer relationships.",
    unknowns:
      "Whether she'll accept an ops hire as support vs. see it as undermining her. If the real problem is her or the reps she hired. How the board will react to anything short of replacement.",
  },
  {
    id: "vercel-to-aws",
    label: "Vercel → AWS migration",
    situation:
      "We're evaluating whether to migrate our Next.js app from Vercel to self-hosted on AWS (ECS + CloudFront). Vercel costs are growing fast — we're at $1,800/month and projected to hit $5k/month in 6 months as traffic scales. Self-hosted would cost roughly $600/month at current traffic but requires setup and maintenance.",
    constraints:
      "Two engineers can dedicate 2 weeks to migration. Need zero-downtime cutover. Currently using Vercel's edge functions, image optimization, and analytics. Page load times must stay under 200ms.",
    posture: "surface_risks" as const,
    leaning_direction: "",
    knowns_assumptions:
      "Our app doesn't use Vercel-specific features that can't be replicated (ISR works with standard Next.js, edge functions can move to Lambda@Edge). We have AWS experience from other projects. I assume CloudFront + ECS can match Vercel's performance. Our CI/CD is already GitHub Actions so deployment changes are manageable.",
    unknowns:
      "Hidden complexity in replicating Vercel's build pipeline. Whether Lambda@Edge cold starts will hurt performance. True ongoing maintenance burden for ECS (patching, scaling configs, debugging). If the cost projections account for CloudFront bandwidth costs accurately. How we'd handle preview deployments for PRs (Vercel does this automatically). Rollback strategy if a deploy goes bad. Who's on-call when infrastructure breaks at 3am. Whether the $4k/month savings is offset by slower developer velocity.",
  },
  {
    id: "gen-ai-product-compliance",
    label: "Gen-AI features + compliance",
    situation:
      "We're a B2B analytics SaaS (~200 employees, US HQ) shipping assistant-style features: summarization over customer-uploaded reports, suggested chart titles, and optional 'ask your data' Q&A. Sales is hearing that enterprise RFPs now ask about AI governance, training data, and EU compliance. Legal is nervous; security wants everything on our VPC with no third-party inference if possible; product wants to ship in one quarter using a hosted model API to move fast.",
    constraints:
      "We sell to US mid-market and a growing EU segment (Germany and France first). Two anchor customers are in regulated industries (healthcare and financial services) but we are not their processor for clinical or core banking data—still, their security reviews are brutal. No dedicated AI governance hire yet. Engineering capacity is one senior ML engineer and two backend engineers part-time.",
    posture: "surface_risks" as const,
    leaning_direction: "",
    knowns_assumptions:
      "Current product is SOC 2 Type II. We assume most EU customers can accept standard DPA + SCCs. We believe we can add opt-out of model improvement/training in vendor contracts. I assume 'EU AI Act' obligations depend heavily on how we classify the system (high-risk or not) and I'm not sure we've done that analysis rigorously.",
    unknowns:
      "Whether our use cases count as high-risk under the EU AI Act or UK/EU national implementations. What large-enterprise RFPs actually require vs what is negotiable. If on-prem or VPC-only inference is feasible on our timeline and budget. How much we must disclose about prompts, logging, and retention. Whether we need human-in-the-loop for certain workflows. Cross-border transfer implications if we use US-hosted APIs. What breaks if a customer demands zero subprocessors for AI.",
  },
  {
    id: "healthcare-pe-acquisition",
    label: "Hospital PE / second-site deal",
    situation:
      "Our PE-backed regional health system (3 hospitals, unionized nursing at two sites) is evaluating acquiring a fourth hospital in an adjacent county. The target is financially distressed but has the only cath lab and Level II trauma within 40 miles, so strategically attractive. Local politicians and a community advocacy group have already signaled concern about 'corporate medicine' and service cuts. The target's medical staff is split: some want stability, others distrust private equity.",
    constraints:
      "Outside antitrust counsel says the deal might draw FTC/DOJ attention depending on how we define the service area. State AG has been vocal on healthcare consolidation. We need a financing path within 9 months. Integration playbook from our last acquisition was messy—union contracts and EHR cutover overran costs. Board wants a clear narrative for the community and for regulators.",
    posture: "pressure_test" as const,
    leaning_direction:
      "Proceed with acquisition if we can secure labor agreements that avoid strike risk during integration and a credible regulatory/stakeholder path; otherwise walk or restructure as a partnership instead of outright purchase",
    knowns_assumptions:
      "We assume the target's quality metrics are fixable with our standard ops playbook. We believe we can retain key physicians with retention packages. I assume a partnership or JV is legally simpler politically than a full buy, but I'm not sure that's true for lenders or for pension obligations.",
    unknowns:
      "True post-close capital needs and hidden liabilities (pensions, malpractice tail, IT debt). Whether regulators will require divestitures or behavioral remedies. How hard unions will fight and what precedents say about timing. If the community campaign could block certificate-of-need or other approvals. Whether our clinical leadership will support the deal publicly. If 'partnership instead of purchase' is realistic with the seller and creditors.",
  },
  {
    id: "hybrid-office-lease",
    label: "Hybrid policy + lease crunch",
    situation:
      "We're ~140 people across product, engineering, GTM, and corporate. Our downtown lease ends in 7 months; current space fits ~90 desks and we use hoteling, but attendance is all over the place—sales and CS want more in-person for customers, engineers are vocal about remote-first, and new hires are in four states we didn't have before COVID. Leadership keeps saying 'hybrid' without a consistent definition. Finance is pushing to cut square footage to save ~$400k/year.",
    constraints:
      "Must decide on renewal vs sublease vs smaller office vs flex space in the next 90 days to avoid holdover penalties. Hiring plan adds ~25 heads next year, mostly eng and design, distributed. We have no formal relocation policy; some managers are enforcing 'three days in office' informally, others aren't. IT says security for fully remote is fine; HR worries about equity and promotion visibility.",
    posture: "generate_alternatives" as const,
    leaning_direction: "",
    knowns_assumptions:
      "Engagement survey shows satisfaction is mixed—remote folks love flexibility, junior staff feel disconnected. I assume we won't mandate five days in office without losing senior engineers. We think the landlord will negotiate if we commit early.",
    unknowns:
      "Actual utilization of space by team and by week—we have badge data but it's noisy. Whether 'core collaboration days' would help or backfire. Legal exposure if policies differ by manager. Cost of flex providers vs traditional lease in our market. How relocation stipends would affect budget. What competitors we lose candidates to and why. Whether we need registered business addresses in each state for compliance.",
  },
  {
    id: "legacy-core-modernization",
    label: "Core banking modernization",
    situation:
      "We're a regional bank (~$18B assets) on a 20-year-old core with heavy customization. Mobile and digital teams want real-time balances, better product bundling, and faster feature shipping; core batch windows and rigid APIs are the bottleneck. The board approved a 'strategic modernization' budget but not a specific vendor or greenfield vs incremental approach. Two large vendors are courting us with different models: rip-and-replace over 3+ years vs incremental 'sidecar' services with phased migration.",
    constraints:
      "Regulators expect a credible program plan, testing evidence, and rollback—we've been told informally that a big-bang weekend cutover would face scrutiny. Internal IT is stretched; we'd need SI partners. Cyber and fraud teams worry about expanded attack surface. CFO wants predictable opex and clear break-even vs status quo within five years.",
    posture: "surface_risks" as const,
    leaning_direction: "",
    knowns_assumptions:
      "We assume some degree of vendor lock-in is inevitable. We believe our risk and audit teams can absorb additional control work if the roadmap is phased. I assume cloud for non-core workloads is acceptable to regulators if we document resilience—I'm less sure about core ledger in cloud within three years.",
    unknowns:
      "Which vendor references are comparable to our size and charter complexity. Hidden integration cost with mortgage, treasury, and card systems. True regulatory posture on cloud core vs on-prem in our district. Whether incremental approaches actually reduce risk or just spread it over longer timelines. Talent market for mainframe and core skills during transition. What we'd do if a phase fails mid-program—contractual exits, data repatriation, customer communication.",
  },
  {
    id: "hubspot-crm-fintech",
    label: "HubSpot CRM for white-label fintech",
    situation:
      "We are a small startup building white-label AI products for the financial industry. Two major customers are live and a third is in the pipeline. We need to start tracking everything in HubSpot immediately — retroactively capturing in-progress deals and building a structure for future ones.\n\nOur deal structures vary significantly across three platforms:\n1. Platform A pays a fixed monthly fee plus a performance-based fee after a revenue hurdle (e.g., 40% of revenue above a 0% floor on the first 10%). They use our product to service thousands of merchants who are unaware of us.\n2. Platform B sells our product into their customer base on a performance/revenue-share basis. They bill end merchants and remit our portion. Merchants are unaware of us.\n3. Platform C supplies ISO partners. We want to enroll those partners in our program. Partners market to their merchants, who contract directly with us. We collect a performance fee (no hurdle), withdraw monthly, then pay Platform C their split; Platform C pays the ISO partner.\n\nSuccess looks like: HubSpot accurately reflects all relationships and deal economics before we onboard a large merchant cohort, with a foundation for eventual revenue forecasting and sales observability.",
    constraints:
      "Timeline is immediate — we must be fully operational before a large merchant onboarding wave. We are on HubSpot Starter and willing to upgrade when it becomes limiting. Our HubSpot admin has zero HubSpot experience but has run relational, data-driven ticketing systems (e.g., ZenDesk) and can handle API integrations with custom data sources. The setup must be intuitive for a seasoned HubSpot pro who joins the company later. No plans to track performance fee calculations inside HubSpot — that logic will live in a billing system we plan to build for ACH payouts.",
    posture: "explore" as const,
    leaning_direction: "",
    knowns_assumptions:
      "HubSpot is appropriate for all customer, contact, and deal data except bank/payment information. A separate billing system will handle ACH and performance fee calculations; source of truth for billing is TBD but will likely integrate into HubSpot via API. Anticipated scale: dozens of ISO partners, hundreds to thousands of merchants. For billing, our customers are Platform A (pays us directly), Platform B (bills merchants themselves and remits our share), and ISO partners' merchants under Platform C (who contract with us directly). Eventual goals beyond initial setup: revenue forecasting, sales observability, and partner payout tracking (nice to have, sourced from billing).",
    unknowns:
      "Who should be modeled as Customers vs. Prospects in HubSpot — the platform, the ISO partner, or the end merchant? What is the right pipeline and funnel structure given that acquisition happens at different layers per deal type? How should the mix of fixed fees, revenue shares, and performance-based structures be represented? What belongs in HubSpot vs. the billing system vs. elsewhere as the source of truth? What does upgrading from Starter unlock that is relevant to our use case and when does it make sense? What specific object structures, pipelines, and properties are recommended for our situation? What training or onboarding path would bring a ZenDesk-experienced admin up to speed on HubSpot quickly?",
  },
] as const;

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm leading-snug text-zinc-500">{children}</p>;
}

export default function IntakePage() {
  const [situation, setSituation] = useState("");
  const [constraints, setConstraints] = useState("");
  const [posture, setPosture] = useState<(typeof POSTURE_OPTIONS)[number]["value"]>("explore");
  const [selectedProviders, setSelectedProviders] = useState<LLMProviderName[]>(["openai"]);
  const [runAllProviders, setRunAllProviders] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<LLMProviderName[]>([]);
  const [leaningDirection, setLeaningDirection] = useState("");
  const [knownsAssumptions, setKnownsAssumptions] = useState("");
  const [unknowns, setUnknowns] = useState("");
  /** Set when user clicks a Demo scenario button; sent with intake so chat can show matching research starters. */
  const [demoScenarioId, setDemoScenarioId] = useState<DemoScenarioId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(0);
  const [freeformSubmitting, setFreeformSubmitting] = useState(false);
  const [freeformStep, setFreeformStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [partialWarning, setPartialWarning] = useState<string | null>(null);
  const router = useRouter();
  const showLeaningDirection = postureRequiresLeaning(posture);
  const intakeCharCount = situation.trim().length + constraints.trim().length;
  const showBriefInputHint =
    intakeCharCount > 0 && intakeCharCount < INTAKE_BRIEF_CHAR_HINT && !submitting && !freeformSubmitting;
  const parallelRun = isParallelIntakeRun(runAllProviders, selectedProviders);
  const providersProgressLabel = intakeProvidersProgressLabel(runAllProviders, selectedProviders);

  // Only show AI providers that have API keys configured.
  useEffect(() => {
    fetch("/api/decision/providers")
      .then((res) => res.json())
      .then((data: { providers?: string[] }) => {
        const list = Array.isArray(data?.providers) ? data.providers : [];
        const valid = list.filter((p): p is LLMProviderName => isLLMProviderName(p));
        const resolved = valid.length > 0 ? valid : (["openai"] as LLMProviderName[]);
        setAvailableProviders(resolved);
        setSelectedProviders((prev) => {
          const kept = prev.filter((p) => resolved.includes(p));
          return kept.length > 0 ? kept : [resolved[0]!];
        });
        setRunAllProviders(false);
      })
      .catch(() => setAvailableProviders(["openai"]));
  }, []);

  function toggleProvider(provider: LLMProviderName) {
    setRunAllProviders(false);
    setSelectedProviders((prev) => {
      if (prev.includes(provider)) {
        return prev.length > 1 ? prev.filter((p) => p !== provider) : prev;
      }
      return [...prev, provider];
    });
  }

  function toggleRunAllProviders() {
    setRunAllProviders((prev) => {
      const next = !prev;
      if (next) {
        setSelectedProviders([]);
      } else {
        setSelectedProviders((current) =>
          current.length > 0 ? current : [availableProviders[0] ?? "openai"]
        );
      }
      return next;
    });
  }

  function loadDemo(demoId: string) {
    const demo = DEMO_SCENARIOS.find((d) => d.id === demoId);
    if (!demo) return;
    setDemoScenarioId(demo.id as DemoScenarioId);
    setSituation(demo.situation);
    setConstraints(demo.constraints);
    setPosture(demo.posture);
    setLeaningDirection(demo.leaning_direction);
    setKnownsAssumptions(demo.knowns_assumptions);
    setUnknowns(demo.unknowns);
  }

  // Cycle through progress steps every 3s while submitting (gives sense of progress during 5–15s API call)
  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      const steps = parallelRun ? SUBMITTING_STEPS_ALL : SUBMITTING_STEPS;
      setSubmittingStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [submitting, parallelRun]);

  useEffect(() => {
    if (!freeformSubmitting) return;
    const steps = parallelRun ? FREEFORM_STEPS_ALL : FREEFORM_STEPS;
    const interval = setInterval(() => {
      setFreeformStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [freeformSubmitting, parallelRun]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPartialWarning(null);
    if (!situation.trim() || !constraints.trim()) {
      setError("Decision context and constraints are required.");
      return;
    }
    if (showLeaningDirection && !leaningDirection.trim()) {
      setError("Name the direction you want challenged before running analysis.");
      return;
    }
    if (!runAllProviders && selectedProviders.length === 0) {
      setError("Select at least one AI provider.");
      return;
    }
    setSubmittingStep(0);
    setSubmitting(true);

    const intake = {
      situation: situation.trim(),
      constraints: constraints.trim(),
      posture,
      ...(showLeaningDirection && leaningDirection.trim() ? { leaning_direction: leaningDirection.trim() } : {}),
      ...(knownsAssumptions.trim() ? { knowns_assumptions: knownsAssumptions.trim() } : {}),
      ...(unknowns.trim() ? { unknowns: unknowns.trim() } : {}),
    };

    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "intake",
          intake,
          ...buildIntakeLlmRequestBody(runAllProviders, selectedProviders),
          ...(demoScenarioId ? { demo_scenario_id: demoScenarioId } : {}),
        }),
      });
      const text = await res.text();
      let data: {
        error?: string;
        run_id?: string;
        decision_id?: string;
        runs?: { run_id: string; decision_id?: string }[];
        primary_run_id?: string;
        failed_providers?: { provider: string; message: string }[];
      };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? "Server returned an invalid response. Please try again." : `Request failed (${res.status}). Please try again.`);
        return;
      }

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      // "all providers" response: { runs: [...], primary_run_id: string, failed_providers?: [...] }
      if (data.runs && data.primary_run_id) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(data.runs[0]));
        }
        const decisionId = data.runs[0]?.decision_id;
        const target = decisionId ? `/runs?new=${decisionId}` : "/runs";

        // Partial-failure path: show which provider(s) failed before navigating
        // so the user knows their runs were created and which to expect.
        const failed = data.failed_providers ?? [];
        if (failed.length > 0) {
          const ok = data.runs.length;
          setPartialWarning(
            `${ok} run${ok === 1 ? "" : "s"} created. ${failed.length} provider${failed.length === 1 ? "" : "s"} failed: ` +
              failed.map((f) => `${f.provider} (${f.message})`).join("; ") +
              ". Continuing to your runs in 5s…"
          );
          setTimeout(() => router.push(target), 5000);
          return;
        }

        router.push(target);
        return;
      }

      if (!data.run_id) {
        setError("Server returned an invalid response. Please try again.");
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(data));
      }
      const decisionId = data.decision_id;
      router.push(decisionId ? `/runs?new=${decisionId}` : "/runs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFreeformSubmit() {
    if (!situation.trim() || !constraints.trim()) {
      setError("Decision context and constraints are required.");
      return;
    }
    if (showLeaningDirection && !leaningDirection.trim()) {
      setError("Name the direction you want challenged before running analysis.");
      return;
    }
    if (!runAllProviders && selectedProviders.length === 0) {
      setError("Select at least one AI provider.");
      return;
    }
    setError(null);
    setPartialWarning(null);
    setFreeformStep(0);
    setFreeformSubmitting(true);
    try {
      const intake = {
        situation: situation.trim(),
        constraints: constraints.trim(),
        posture,
        ...(showLeaningDirection && leaningDirection.trim() ? { leaning_direction: leaningDirection.trim() } : {}),
        ...(knownsAssumptions.trim() ? { knowns_assumptions: knownsAssumptions.trim() } : {}),
        ...(unknowns.trim() ? { unknowns: unknowns.trim() } : {}),
      };
      const res = await fetch("/api/decision/run/freeform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake,
          ...buildIntakeLlmRequestBody(runAllProviders, selectedProviders),
          ...(demoScenarioId ? { demo_scenario_id: demoScenarioId } : {}),
        }),
      });
      const data = await res.json() as
        | {
            error?: string;
            runs?: Array<{
              run_id: string;
              decision_id: string;
              intake: (typeof intake) & { decision_id: string };
              freeform_output?: Record<string, unknown>;
              freeform_model?: string;
              freeform_generated_at?: string;
              llm_provider?: string;
            }>;
            primary_run_id?: string;
            decision_id?: string;
            failed_providers?: { provider: string; message: string }[];
          }
        | {
            error?: string;
            run_id?: string;
            decision_id?: string;
            output?: Record<string, unknown>;
            model?: string;
            generated_at?: string;
            intake?: typeof intake & { decision_id: string };
            llm_provider?: string;
          };
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      if ("runs" in data && Array.isArray(data.runs) && data.runs.length > 0 && data.decision_id) {
        const primary =
          data.primary_run_id != null
            ? data.runs.find((r) => r.run_id === data.primary_run_id) ?? data.runs[0]
            : data.runs[0];
        if (primary?.freeform_output && primary.intake) {
          sessionStorage.setItem(
            "freeformResult",
            JSON.stringify({
              output: primary.freeform_output,
              intake: primary.intake,
              model: primary.freeform_model,
              generated_at: primary.freeform_generated_at,
              llm_provider: primary.llm_provider,
              run_id: primary.run_id,
              decision_id: primary.decision_id,
            })
          );
        }
        const failed = data.failed_providers ?? [];
        if (failed.length > 0) {
          const ok = data.runs.length;
          setPartialWarning(
            `${ok} freeform run${ok === 1 ? "" : "s"} created. ${failed.length} provider${failed.length === 1 ? "" : "s"} failed: ` +
              failed.map((f) => `${f.provider} (${f.message})`).join("; ") +
              ". Continuing to your runs in 5s…"
          );
          setTimeout(() => router.push(`/runs?new=${data.decision_id}`), 5000);
          return;
        }
        router.push(`/runs?new=${data.decision_id}`);
        return;
      }

      if ("run_id" in data && data.run_id && data.output && data.intake) {
        sessionStorage.setItem(
          "freeformResult",
          JSON.stringify({
            output: data.output,
            intake: data.intake,
            model: data.model,
            generated_at: data.generated_at,
            llm_provider: data.llm_provider,
            run_id: data.run_id,
            decision_id: data.decision_id,
          })
        );
        router.push(data.decision_id ? `/runs?new=${data.decision_id}` : "/runs");
        return;
      }

      setError("Server returned an unexpected response. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFreeformSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Nav — matches landing page */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoLockup />
          </Link>
          <SessionNav />
        </div>
      </nav>

      {/* Page header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Brief your think tank</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Describe the decision you&apos;re facing — what&apos;s on the table, what triggered it, who&apos;s
            involved, and what success looks like. This is the brief every model in your think tank will
            analyze.
          </p>
          <p className="mt-1.5 text-sm text-zinc-500">
            The more specific you are, the sharper the analysis. Models may ask follow-up questions before
            producing recommendations.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Demo scenarios */}
        <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Demo
            </span>
            <p className="text-sm text-indigo-700 font-medium">Load a sample scenario to try it out</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_SCENARIOS.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => loadDemo(demo.id)}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-7">
          <div>
            <label htmlFor="situation" className="block text-sm font-medium text-zinc-800">
              What decision are you facing? <span className="text-red-500">*</span>
            </label>
            <FieldHelp>
              Include context: org size, stakeholders, what triggered this, options you&apos;re weighing, and what
              success looks like.
            </FieldHelp>
            <details className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-600">
              <summary className="cursor-pointer font-medium text-zinc-700 select-none">
                Writing prompts (optional)
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-1 pl-0.5">
                <li>What are you deciding, and why now?</li>
                <li>What options are on the table?</li>
                <li>Who cares most about the outcome?</li>
                <li>What would you regret if you got this wrong?</li>
              </ul>
            </details>
            <textarea
              id="situation"
              required
              rows={8}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Example: We're ~140 people; our downtown lease ends in 7 months. Leadership wants hybrid but hasn't defined it. Finance wants to cut ~$400k in rent while sales wants more in-person time with customers…"
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="constraints" className="block text-sm font-medium text-zinc-800">
              What constraints are you facing related to this decision?{" "}
              <span className="text-red-500">*</span>
            </label>
            <FieldHelp>
              Timeline, budget, headcount, legal or regulatory limits, politics, non-negotiables, and cost of delay.
            </FieldHelp>
            <textarea
              id="constraints"
              required
              rows={5}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Example: Decide in 90 days to avoid holdover penalties. No budget for two collaboration tools long-term. Hiring 25 distributed roles next year…"
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {showBriefInputHint ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              Brief inputs often produce generic analysis. Add timeline, stakeholders, or tradeoffs if you can. The
              demo scenarios above show the level of detail that works well.
            </p>
          ) : null}

          <fieldset>
            <legend className="block text-sm font-medium text-zinc-800">
              How should we analyze this? <span className="text-red-500">*</span>
            </legend>
            <FieldHelp>Choose the lens that matches how you want the AI to examine your decision.</FieldHelp>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {POSTURE_OPTIONS.map((option) => {
                const selected = posture === option.value;
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-lg border px-3 py-3 transition-colors ${
                      selected
                        ? "border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-500"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="posture"
                      value={option.value}
                      checked={selected}
                      onChange={() => setPosture(option.value)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold text-zinc-900">{option.title}</span>
                    <span className="mt-1 block text-xs leading-snug text-zinc-600">{option.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {showLeaningDirection && (
            <div>
              <label htmlFor="leaning_direction" className="block text-sm font-medium text-zinc-800">
                {posture === "show_opposition"
                  ? "Direction you want opposed"
                  : "Direction you want challenged"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <FieldHelp>
                {posture === "show_opposition"
                  ? "State the plan you're currently considering. Models will steelman the strongest opposing case — what a serious skeptic would argue."
                  : "State the plan you're currently considering. The analysis will focus on downsides and blind spots."}
              </FieldHelp>
              <input
                type="text"
                id="leaning_direction"
                required
                value={leaningDirection}
                onChange={(e) => setLeaningDirection(e.target.value)}
                placeholder="Example: Keep the VP but add a sales ops lead for process while she owns strategic deals"
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="knowns_assumptions" className="block text-sm font-medium text-zinc-800">
              Facts and assumptions presumed to be true
            </label>
            <FieldHelp>
              Identify what is known and what is assumed. Differentiating between them will help the analysis.
            </FieldHelp>
            <textarea
              id="knowns_assumptions"
              rows={5}
              value={knownsAssumptions}
              onChange={(e) => setKnownsAssumptions(e.target.value)}
              placeholder="Example: We assume badge data undercounts engineering attendance. We believe the landlord will negotiate if we commit early…"
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="unknowns" className="block text-sm font-medium text-zinc-800">
              Open questions whose answers might change the recommendation
            </label>
            <FieldHelp>
              What you still don&apos;t know, and would want answered before committing. If the answer could flip
              which option you choose, list it here.
            </FieldHelp>
            <textarea
              id="unknowns"
              rows={5}
              value={unknowns}
              onChange={(e) => setUnknowns(e.target.value)}
              placeholder="Example: Whether core collaboration days help or backfire. Legal exposure if managers enforce different in-office rules…"
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {availableProviders.length > 1 && (
            <fieldset>
              <legend className="block text-sm font-medium text-zinc-800">Your think tank</legend>
              <FieldHelp>
                Pick one model or several to analyze the same brief from different angles — or run every
                configured provider at once. You cannot combine &ldquo;Full think tank&rdquo; with individual
                selections.
              </FieldHelp>
              <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-white px-3 py-3">
                {LLM_PROVIDER_OPTIONS.filter((p) => availableProviders.includes(p.value)).map((p) => (
                  <label key={p.value} className="flex items-center gap-2 text-sm text-zinc-800">
                    <input
                      type="checkbox"
                      checked={!runAllProviders && selectedProviders.includes(p.value)}
                      disabled={runAllProviders || submitting || freeformSubmitting}
                      onChange={() => toggleProvider(p.value)}
                      className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {p.label}
                  </label>
                ))}
                <label className="flex items-center gap-2 border-t border-zinc-200 pt-2 text-sm font-medium text-zinc-800">
                  <input
                    type="checkbox"
                    checked={runAllProviders}
                    disabled={submitting || freeformSubmitting}
                    onChange={toggleRunAllProviders}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Full think tank (all configured models)
                </label>
              </div>
            </fieldset>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {partialWarning && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {partialWarning}
            </div>
          )}

          {submitting && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
              <p className="font-medium">{(parallelRun ? SUBMITTING_STEPS_ALL : SUBMITTING_STEPS)[submittingStep]}</p>
              <p className="mt-1 text-indigo-600">
                {parallelRun
                  ? `Running ${providersProgressLabel} simultaneously. This may take 30–60 seconds.`
                  : "This usually takes 5–15 seconds."}
              </p>
            </div>
          )}

          {freeformSubmitting && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
              <p className="font-medium">
                {(parallelRun ? FREEFORM_STEPS_ALL : FREEFORM_STEPS)[freeformStep]}
              </p>
              <p className="mt-1 text-violet-600">
                {parallelRun
                  ? `${providersProgressLabel} each pick their own JSON structure. This may take 30–90 seconds.`
                  : "The model chooses its own structure. This usually takes 5–20 seconds."}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-800">What happens next</p>
            <p className="mt-1 leading-relaxed">
              Each model runs Risk, Reversibility, and People lenses on your brief, may ask targeted
              follow-up questions, then produces a structured decision brief. Compare models side by side,
              merge them into a Unified Brief, or discuss the results.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={submitting || freeformSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                  {(parallelRun ? SUBMITTING_STEPS_ALL : SUBMITTING_STEPS)[submittingStep]}
                </>
              ) : (
                "Run decision analysis (recommended)"
              )}
            </button>
            <p className="text-center text-xs text-zinc-500">
              Three lenses · follow-up questions when needed · structured brief per model
            </p>
            <button
              type="button"
              onClick={handleFreeformSubmit}
              disabled={submitting || freeformSubmitting}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${freeformSubmitting ? "border-violet-600 bg-violet-600 text-white" : "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
            >
              {freeformSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  {(parallelRun ? FREEFORM_STEPS_ALL : FREEFORM_STEPS)[freeformStep]}
                </>
              ) : (
                "Explore with a flexible format"
              )}
            </button>
            <p className="text-center text-xs text-zinc-500">
              The model chooses its own structure. Useful for experiments, not the main brief workflow.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
