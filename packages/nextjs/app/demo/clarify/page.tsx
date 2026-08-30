"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEMO_CLARIFICATION_QUESTIONS,
  DEMO_SCENARIO_LABEL,
  getDemoRun,
} from "@/app/demo/_data/demo-fixtures";
import { TOUR_CLARIFICATIONS } from "@/app/tour/_data/tour-demo-data";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import { LENS_THEME_LABELS } from "@/lib/merge-clarification-questions";
import { runHeadline } from "@/lib/run-display-name";

export default function DemoClarifyPage() {
  const router = useRouter();
  const headline = runHeadline(getDemoRun("openai"));

  return (
    <div className={`py-8 ${demoContentClass}`}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Your think tank</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Answer unique follow-up questions</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{headline}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Similar questions from each provider are combined so you answer once; your response is sent to every model
          that asked it. ({DEMO_SCENARIO_LABEL} demo)
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
        {DEMO_CLARIFICATION_QUESTIONS.map((q, i) => (
          <div key={q.question_id} className="border-b border-zinc-100 pb-5 last:border-0 last:pb-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {LENS_THEME_LABELS[q.lens] ?? q.lens} lens
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{q.question_text}</p>
            <textarea
              readOnly
              rows={3}
              value={TOUR_CLARIFICATIONS[i]?.answer ?? ""}
              className="mt-3 w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <Link href="/demo/intake" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            ← Back to intake
          </Link>
          <button
            type="button"
            onClick={() => router.push("/demo/result?provider=openai", { scroll: true })}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Submit answers & view results
          </button>
        </div>
      </div>
    </div>
  );
}
