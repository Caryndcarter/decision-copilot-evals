"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CollapsibleBlock } from "@/app/run/collapsible-block";
import { runProviderLabel } from "@/lib/run-display-name";
import {
  LENS_LABEL,
  POSTURE_LABEL,
  PROVIDER_TAB_LABEL,
  TOUR_CLARIFICATIONS,
  TOUR_DISAGREEMENTS,
  TOUR_INTAKE,
  TOUR_RUNS,
  TOUR_UNIFIED_BRIEF,
  type TourProvider,
} from "@/app/tour/_data/tour-demo-data";

type Phase = "intake" | "running" | "clarify" | "result" | "compare" | "cta";

const PHASES: { id: Phase; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "clarify", label: "Clarify" },
  { id: "result", label: "Results" },
  { id: "compare", label: "Unified brief" },
  { id: "cta", label: "Next steps" },
];

const RUNNING_STEPS = [
  "Convening your think tank…",
  "Analyzing risks across models…",
  "Checking reversibility…",
  "Considering stakeholders…",
  "Preparing briefs…",
];

function PhaseRail({ phase }: { phase: Phase }) {
  const activeIndex =
    phase === "running"
      ? 0
      : PHASES.findIndex((p) => p.id === phase);

  return (
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-1 px-6 py-3">
        {PHASES.map((p, i) => {
          const done = activeIndex > i || (phase === "cta" && p.id !== "cta");
          const active =
            p.id === phase ||
            (phase === "running" && p.id === "intake") ||
            (phase === "compare" && p.id === "compare") ||
            (phase === "result" && p.id === "result");
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? "bg-indigo-100 text-indigo-800"
                  : done
                    ? "text-zinc-500"
                    : "text-zinc-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  active
                    ? "bg-indigo-600 text-white"
                    : done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {done && !active ? "✓" : i + 1}
              </span>
              {p.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-semibold">Frozen demo.</span> This is real UI with curated output — nothing is sent to
      models or saved to your account.
    </div>
  );
}

function IntakeScreen({ onRun }: { onRun: () => void }) {
  const postureLabel = POSTURE_LABEL[TOUR_INTAKE.posture] ?? TOUR_INTAKE.posture;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <DemoBanner />
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 mb-6">
        <p className="text-sm font-medium text-indigo-800">
          Sample scenario: <span className="font-semibold">Underperforming VP Sales</span>
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-800">What decision are you facing?</label>
          <textarea
            readOnly
            rows={5}
            value={TOUR_INTAKE.situation}
            className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800">Constraints</label>
          <textarea
            readOnly
            rows={3}
            value={TOUR_INTAKE.constraints}
            className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-800">How should we analyze this?</p>
          <p className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            {postureLabel}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-800">Your current leaning</label>
          <textarea
            readOnly
            rows={2}
            value={TOUR_INTAKE.leaning_direction}
            className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-800">Knowns & assumptions</label>
            <textarea
              readOnly
              rows={4}
              value={TOUR_INTAKE.knowns_assumptions}
              className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Unknowns</label>
            <textarea
              readOnly
              rows={4}
              value={TOUR_INTAKE.unknowns}
              className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
          <p className="text-sm text-zinc-500">Think tank: OpenAI, Anthropic, Gemini, xAI</p>
          <button
            type="button"
            onClick={onRun}
            className="ml-auto rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Run think tank
          </button>
        </div>
      </div>
    </div>
  );
}

function RunningScreen({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      <p className="mt-6 text-lg font-medium text-zinc-900">Running your think tank</p>
      <p className="mt-2 text-sm text-zinc-500">{RUNNING_STEPS[stepIndex] ?? RUNNING_STEPS.at(-1)}</p>
      <ul className="mx-auto mt-8 max-w-sm space-y-2 text-left text-sm text-zinc-600">
        {RUNNING_STEPS.map((step, i) => (
          <li key={step} className={i <= stepIndex ? "text-zinc-900" : "text-zinc-400"}>
            {i < stepIndex ? "✓ " : i === stepIndex ? "→ " : "· "}
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClarifyScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <DemoBanner />
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900">Follow-up questions</h2>
        <p className="mt-1 text-sm text-zinc-600">
          All four models asked clarifying questions before refreshing their analysis. In the real product,
          you answer once and every run updates.
        </p>
      </div>

      <div className="space-y-4">
        {TOUR_CLARIFICATIONS.map((item) => (
          <div key={item.question} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {LENS_LABEL[item.lens]} lens
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-900">{item.question}</p>
            <textarea
              readOnly
              rows={3}
              value={item.answer}
              className="mt-3 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Submit answers & view results
        </button>
      </div>
    </div>
  );
}

function ResultScreen({
  provider,
  onProviderChange,
  onContinue,
}: {
  provider: TourProvider;
  onProviderChange: (p: TourProvider) => void;
  onContinue: () => void;
}) {
  const run = TOUR_RUNS.find((r) => r.provider === provider)!;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <DemoBanner />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Individual model results</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Each model produces its own risk, reversibility, and people lenses plus a decision brief.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {TOUR_RUNS.map((r) => (
          <button
            key={r.provider}
            type="button"
            onClick={() => onProviderChange(r.provider)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              r.provider === provider
                ? "bg-indigo-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {PROVIDER_TAB_LABEL[r.provider]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <CollapsibleBlock title="Risk" defaultOpen>
          <p className="mb-2 text-xs text-zinc-500">Confidence: {run.lenses.risk.confidence}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
            {run.lenses.risk.top.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </CollapsibleBlock>

        <CollapsibleBlock title="Reversibility" defaultOpen={false}>
          <p className="text-xs font-medium text-zinc-600">Hard to undo</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-800">
            {run.lenses.reversibility.hard_to_undo.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-medium text-zinc-600">Safer first steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-800">
            {run.lenses.reversibility.safe_first.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </CollapsibleBlock>

        <CollapsibleBlock title="People" defaultOpen={false}>
          <ul className="space-y-3 text-sm text-zinc-800">
            {run.lenses.people.impacts.map((imp) => (
              <li key={imp.who}>
                <span className="font-medium">{imp.who}</span>
                <span className="text-zinc-500"> · {imp.sentiment}</span>
                <p className="text-zinc-600">{imp.note}</p>
              </li>
            ))}
          </ul>
        </CollapsibleBlock>

        <CollapsibleBlock title="Decision brief" defaultOpen>
          <h3 className="text-base font-semibold text-zinc-900">{run.brief.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">{run.brief.summary}</p>
          <p className="mt-3 text-sm font-medium text-zinc-900">Recommendation</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">{run.brief.recommendation}</p>
          <p className="mt-3 text-sm font-medium text-zinc-900">Next steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {run.brief.next_steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </CollapsibleBlock>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          See where models disagree →
        </button>
      </div>
    </div>
  );
}

function CompareScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <DemoBanner />
      <h2 className="text-xl font-bold text-zinc-900">Unified brief</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Decision Copilot synthesizes across models, surfaces disagreements, and attributes contributions.
      </p>

      <div className="mt-6 space-y-4">
        {TOUR_DISAGREEMENTS.map((d) => (
          <CollapsibleBlock key={d.label} title={d.label} defaultOpen>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4 font-medium">Model</th>
                    <th className="py-2 font-medium">Stance</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((row) => (
                    <tr key={row.provider} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-zinc-800">
                        {runProviderLabel(row.provider)}
                      </td>
                      <td className="py-2.5 text-zinc-700">{row.stance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleBlock>
        ))}

        <CollapsibleBlock title={TOUR_UNIFIED_BRIEF.title} defaultOpen>
          <p className="text-sm leading-relaxed text-zinc-700">{TOUR_UNIFIED_BRIEF.summary}</p>
          <p className="mt-4 text-sm font-medium text-zinc-900">Synthesized recommendation</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">{TOUR_UNIFIED_BRIEF.recommendation}</p>
          <p className="mt-4 text-sm font-medium text-zinc-900">Key considerations</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {TOUR_UNIFIED_BRIEF.key_considerations.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Contributions</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {TOUR_UNIFIED_BRIEF.contributions.map((c) => (
              <li key={c.provider}>
                <span className="font-medium">{runProviderLabel(c.provider)}</span> — {c.note}
              </li>
            ))}
          </ul>
        </CollapsibleBlock>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Finish tour
        </button>
      </div>
    </div>
  );
}

function CtaScreen() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h2 className="text-2xl font-bold text-zinc-900">Try it on your own decision</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-600">
        You just walked through intake, clarifying questions, four model briefs, and a unified synthesis. With an
        account, you run live models, edit briefs, chat with each analysis, and save decisions.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/request-access"
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Request access
        </Link>
        <Link
          href="/auth/signin"
          className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Sign in
        </Link>
        <Link href="/how-it-works" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          How it works →
        </Link>
      </div>
      <p className="mt-8 text-xs text-zinc-400">
        <Link href="/tour" className="underline hover:text-zinc-600">
          Restart tour
        </Link>
      </p>
    </div>
  );
}

export function TourDemo() {
  const [phase, setPhase] = useState<Phase>("intake");
  const [runningStep, setRunningStep] = useState(0);
  const [provider, setProvider] = useState<TourProvider>("openai");

  const startRun = useCallback(() => {
    setPhase("running");
    setRunningStep(0);
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    if (runningStep >= RUNNING_STEPS.length) {
      const t = window.setTimeout(() => setPhase("clarify"), 400);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => setRunningStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [phase, runningStep]);

  return (
    <div className="min-h-[60vh] bg-zinc-50">
      <PhaseRail phase={phase} />
      {phase === "intake" && <IntakeScreen onRun={startRun} />}
      {phase === "running" && <RunningScreen stepIndex={Math.min(runningStep, RUNNING_STEPS.length - 1)} />}
      {phase === "clarify" && <ClarifyScreen onContinue={() => setPhase("result")} />}
      {phase === "result" && (
        <ResultScreen
          provider={provider}
          onProviderChange={setProvider}
          onContinue={() => setPhase("compare")}
        />
      )}
      {phase === "compare" && <CompareScreen onContinue={() => setPhase("cta")} />}
      {phase === "cta" && <CtaScreen />}
    </div>
  );
}
