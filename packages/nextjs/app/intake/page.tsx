"use client";

import { useState, useEffect } from "react";
import { AppNavBrand } from "@/app/components/app-nav-brand";
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
import { MERIDIAN_IC_VOICE_CASES } from "@/lib/meridian-ic-voice-cases";
import { HORMUZ_VOICE_CASES } from "@/lib/hormuz-voice-cases";

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
    id: "meridian-civitas-saas-rollup",
    label: "Meridian / Civitas SaaS roll-up",
    situation:
      "Meridian Holdings is a PE-backed software operating company executing a roll-up of mature, profitable, low-growth vertical SaaS. Civitas (acquired Q1 2025 for $58M / ~4.2x ARR) is municipal permitting, licensing, and code-enforcement software for ~340 US towns and counties: ~$14M ARR, 61% gross margin (heavy services load), ~$41K ACV, 9-year average tenure, 97% NRR.\n\nEngineering at acquisition: 42 people (30 engineers on a 15-year Java monolith with heavy per-municipality customization, 6 QA, 4 DevOps, 2 managers). CS/support: 18 people with deep town-clerk relationships. ~15–20% of municipal configurations have no written spec—they live in tribal knowledge of ~5 senior engineers.\n\nAn AI-assisted engineering audit says a team of 6–8 could rebuild the core in ~9 months (LLM-assisted migration + AI regression testing), with ~70% engineering headcount cut and ~40% infra savings—but flags that AI migration may miss undocumented edge cases (e.g. flood-zone fee waivers) until production. Some contracts have ambiguous 2003-era “key personnel” / continuity language. IC is reviewing Civitas for strategic sale vs hold-and-harvest in 18–24 months; modernization path changes valuation either way.\n\nWe must decide: (1) how aggressively to compress headcount reduction (single event vs phased), (2) whether to retain a permanent “tribal knowledge” senior tier vs treating all 42 as in-scope, and (3) how much municipal migration risk to accept for speed/savings.\n\nOptions: (A) full AI rebuild in 9 months + single large layoff after validation; (B) phased 18–24 month rebuild with staged cuts, seniors retained longest + structured severance/placement; (C) hybrid—AI rebuild but keep 8–10 including the 5 seniors permanently, cut mid-level/QA hardest; (D) delay modernization and sell Civitas as-is; (E) modernize but cap headcount cut (~40%) and reinvest into adjacent municipal products.\n\nSuccess (stated): zero critical outages blocking permits/licenses; ≥50% engineering cost-to-serve cut within 12 months of full migration; NRR ≥95% through transition; no public failure story (botched town migration or high-profile layoff) given LP pension optics and AI-displacement press.",
    constraints:
      "IC wants a modernization plan/timeline in ~6 weeks. Audit claims 9-month technical compression; conservative validation across 340 configs likely longer. $2.1M reserved for tooling/AI infra/contractors; severance currently modeled at 2 weeks/year tenure capped at 16 weeks (richer packages need separate IC approval). Ideal-state eng headcount per audit: 8–12 (no hard floor set—that’s the decision). WARN Act aggregation vs Meridian portfolio unresolved; municipal customers subject to public-records laws. Reputational risk: roll-up watched by trade press; LPs include public pension funds. Leadership frames thesis itself as non-negotiable (modernization/cost reduction happens somehow); pace, sequencing, retention, and customer-failure risk tolerance are open. Delay cost ~$180K/month legacy infra/maintenance vs modernized baseline, plus unpatched security debt.",
    posture: "pressure_test" as const,
    leaning_direction:
      "Option B with elements of C: phased 18–24 month rebuild, staged headcount reduction tied to migration milestones, retain the 5–6 most senior engineers longest for knowledge transfer/validation, plus structured severance and job-placement support—believed to prove the thesis while limiting municipal risk and treating leavers more humanely than a single-event layoff",
    knowns_assumptions:
      "FACTS: 340 municipalities; $14M ARR; 97% NRR; 42 eng / 18 CS; audit projects 8–12 eng post-modernization; 15–20% configs undocumented; $2.1M modernization budget; legal flagged unresolved key-personnel language.\nASSUMPTIONS (treat skeptically): AI tooling catches undocumented edge cases acceptably (asserted by audit team whose engagement continues if project proceeds); seniors retained “longest” will stay through validation rather than leave early once roles look temporary (not surveyed candidly); 340 thin IT shops tolerate multi-year transition without competitor shopping; “job placement support” helps in a mid-sized Midwest metro with thin tech demand for legacy Java/gov skills (not verified); IC will accept slower/costlier path if risk case is strong (not tested with them); WARN/legal exposure manageable under either timeline (legal incomplete).",
    unknowns:
      "What do the 5–6 tribal-knowledge seniors actually say if asked candidly about staying through validation with no guaranteed long-term role? Real local demand for their skill set? Does Civitas+Meridian aggregation trip WARN (60-day notice etc.) forcing a slower path? What is enforceable in key-personnel clauses—can towns demand continuity or exit? Have we modeled the cost of one real failure (e.g. town can’t issue permits for two weeks) vs savings from the faster timeline? Would IC actually reject a lower-margin humane path if shown full downside—or is that resistance assumed? What do a sample of the 340 customers say about phased transition risk vs vendor stability?",
  },
  ...MERIDIAN_IC_VOICE_CASES.map((c) => ({
    id: c.id,
    label: c.label,
    situation: c.situation,
    constraints: c.constraints,
    posture: c.posture,
    leaning_direction: c.leaning_direction ?? "",
    knowns_assumptions: c.knowns_assumptions,
    unknowns: c.unknowns,
  })),
  ...HORMUZ_VOICE_CASES.map((c) => ({
    id: c.id,
    label: c.label,
    situation: c.situation,
    constraints: c.constraints,
    posture: c.posture,
    leaning_direction: c.leaning_direction ?? "",
    knowns_assumptions: c.knowns_assumptions,
    unknowns: c.unknowns,
  })),
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
          <AppNavBrand />
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
            {DEMO_SCENARIOS.map((demo) => {
              const selected = demoScenarioId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => loadDemo(demo.id)}
                  aria-pressed={selected}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected
                      ? "border-indigo-500 bg-indigo-100 text-indigo-900 ring-1 ring-indigo-500"
                      : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300"
                  }`}
                >
                  {demo.label}
                </button>
              );
            })}
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
