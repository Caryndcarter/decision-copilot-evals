"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_INTAKE, DEMO_SCENARIO_LABEL } from "@/app/demo/_data/vp-sales-fixtures";

const SUBMITTING_STEPS = [
  "Running your think tank simultaneously…",
  "Analyzing risks across models…",
  "Checking reversibility…",
  "Considering stakeholders…",
  "Preparing briefs…",
  "Almost there…",
];

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-relaxed text-zinc-500">{children}</p>;
}

export default function DemoIntakePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStepIndex(0);
    for (let i = 0; i < SUBMITTING_STEPS.length; i++) {
      setStepIndex(i);
      await new Promise((r) => setTimeout(r, 650));
    }
    router.push("/demo/clarify");
  }

  if (submitting) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        <p className="mt-6 text-lg font-medium text-zinc-900">Running your think tank</p>
        <p className="mt-2 text-sm text-zinc-500">{SUBMITTING_STEPS[stepIndex]}</p>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Brief your think tank</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Describe the decision you&apos;re facing — what&apos;s on the table, what triggered it, who&apos;s
            involved, and what success looks like. This is the brief every model in your think tank will analyze.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Demo
            </span>
            <p className="text-sm font-medium text-indigo-700">Sample scenario: {DEMO_SCENARIO_LABEL}</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-7 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="situation" className="block text-sm font-medium text-zinc-800">
              What decision are you facing? <span className="text-red-500">*</span>
            </label>
            <FieldHelp>
              Include context: org size, stakeholders, what triggered this, options you&apos;re weighing, and what
              success looks like.
            </FieldHelp>
            <textarea
              id="situation"
              readOnly
              rows={8}
              value={DEMO_INTAKE.situation}
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900"
            />
          </div>

          <div>
            <label htmlFor="constraints" className="block text-sm font-medium text-zinc-800">
              What constraints are you facing related to this decision? <span className="text-red-500">*</span>
            </label>
            <FieldHelp>Timeline, budget, headcount, legal or regulatory limits, politics, non-negotiables.</FieldHelp>
            <textarea
              id="constraints"
              readOnly
              rows={5}
              value={DEMO_INTAKE.constraints}
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-zinc-800">
              How should we analyze this? <span className="text-red-500">*</span>
            </legend>
            <FieldHelp>Choose the lens that matches how you want the AI to examine your decision.</FieldHelp>
            <div className="mt-3">
              <div className="rounded-lg border border-indigo-500 bg-indigo-50/80 px-3 py-3 ring-1 ring-indigo-500">
                <span className="block text-sm font-semibold text-zinc-900">Challenge my leaning</span>
                <span className="mt-1 block text-xs leading-snug text-zinc-600">
                  Pressure-testing of the plan you are currently considering to produce a thorough analysis with
                  downsides and blind spots.
                </span>
              </div>
            </div>
          </fieldset>

          <div>
            <label htmlFor="leaning_direction" className="block text-sm font-medium text-zinc-800">
              Direction you want challenged <span className="text-red-500">*</span>
            </label>
            <FieldHelp>
              State the plan you&apos;re currently considering. The analysis will focus on downsides and blind spots.
            </FieldHelp>
            <input
              id="leaning_direction"
              readOnly
              value={DEMO_INTAKE.leaning_direction}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900"
            />
          </div>

          <div>
            <label htmlFor="knowns_assumptions" className="block text-sm font-medium text-zinc-800">
              Facts and assumptions presumed to be true
            </label>
            <textarea
              id="knowns_assumptions"
              readOnly
              rows={5}
              value={DEMO_INTAKE.knowns_assumptions ?? ""}
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900"
            />
          </div>

          <div>
            <label htmlFor="unknowns" className="block text-sm font-medium text-zinc-800">
              Open questions whose answers might change the recommendation
            </label>
            <textarea
              id="unknowns"
              readOnly
              rows={5}
              value={DEMO_INTAKE.unknowns ?? ""}
              className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900"
            />
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <p className="mb-4 text-sm text-zinc-600">
              Think tank: OpenAI, Anthropic, Google Gemini, xAI — all four models run in parallel.
            </p>
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto"
            >
              Run think tank
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
