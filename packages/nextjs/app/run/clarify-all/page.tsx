"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import type { DecisionRunResult } from "@/types/decision";
import {
  canCombineClarifications,
  getAwaitingClarificationRuns,
} from "@/lib/merge-clarification-questions";
import { runHeadline } from "@/lib/run-display-name";
import { CombinedClarificationForm } from "../combined-clarification-form";

function ClarifyAllContent() {
  const searchParams = useSearchParams();
  const decisionId = searchParams.get("decision_id")?.trim() ?? "";
  const [runs, setRuns] = useState<DecisionRunResult[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!decisionId) {
      setLoadError("Missing decision_id.");
      setRuns([]);
      return;
    }
    setLoadError(null);
    setRuns(null);
    fetch(`/api/decision/run?decision_id=${encodeURIComponent(decisionId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to load runs (${res.status})`);
        }
        const list = (data.runs ?? []) as DecisionRunResult[];
        setRuns(list);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load runs");
        setRuns([]);
      });
  }, [decisionId]);

  if (!decisionId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-zinc-600">No decision specified.</p>
        <Link href="/runs" className="mt-4 inline-block text-indigo-600 underline">
          Back to My Decisions
        </Link>
      </div>
    );
  }

  if (runs === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-zinc-600">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-red-700">{loadError}</p>
        <Link href="/runs" className="mt-4 inline-block text-indigo-600 underline">
          Back to My Decisions
        </Link>
      </div>
    );
  }

  const awaiting = getAwaitingClarificationRuns(runs);
  const combinable = canCombineClarifications(runs);
  const headline = runs[0] ? runHeadline(runs[0]) : "Decision";

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">Answers submitted</h2>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            All provider runs have been updated with your answers. Open any individual run to see the same
            answers in Follow-up questions and the refreshed analysis and brief.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/runs?new=${encodeURIComponent(decisionId)}`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              View all runs
            </Link>
            {runs[0] && (
              <Link
                href={`/run/chat?run_id=${encodeURIComponent(runs[0].run_id)}`}
                className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              >
                Open first run
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!combinable || awaiting.length < 2) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-zinc-600">
          {awaiting.length === 0
            ? "No runs are waiting for clarification answers."
            : "Combined clarification is available when two or more provider runs are awaiting answers for the same posture."}
        </p>
        <Link href="/runs" className="mt-4 inline-block text-indigo-600 underline">
          Back to My Decisions
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Your think tank</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 tracking-tight">
            Answer unique follow-up questions
          </h1>
        <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{headline}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Gemini combines similar questions from each provider so you answer once; your response is sent to
          every model that asked it. Or answer per provider from{" "}
          <Link href={`/runs?new=${encodeURIComponent(decisionId)}`} className="text-indigo-600 underline">
            My Decisions
          </Link>
          .
        </p>
      </div>
      <div className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
        <CombinedClarificationForm
          runs={awaiting}
          decisionId={decisionId}
          onComplete={(updated) => {
            setRuns(updated);
            setDone(true);
          }}
        />
      </div>
    </div>
  );
}

export default function ClarifyAllPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <AppNavBrand />
          <SessionNav />
        </div>
      </nav>
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-6 py-12">
            <p className="text-zinc-600">Loading…</p>
          </div>
        }
      >
        <ClarifyAllContent />
      </Suspense>
    </main>
  );
}
