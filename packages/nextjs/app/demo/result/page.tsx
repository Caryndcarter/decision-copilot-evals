"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ResultContent } from "@/app/run/result-content";
import {
  DEMO_PROVIDERS,
  DEMO_RUNS,
  getDemoRun,
} from "@/app/demo/_data/vp-sales-fixtures";
import type { LLMProviderName } from "@/types/decision";
import { runHeadline, runPostureLabel, runProviderLabel, runShortChromeLabel } from "@/lib/run-display-name";

function parseProvider(value: string | null): LLMProviderName {
  if (value && DEMO_PROVIDERS.includes(value as LLMProviderName)) {
    return value as LLMProviderName;
  }
  return "openai";
}

function DemoResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = parseProvider(searchParams.get("provider"));
  const result = useMemo(() => getDemoRun(provider), [provider]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <h1 className="text-base font-semibold text-zinc-900">
            Decision Brief <span className="font-normal text-zinc-500">— {runShortChromeLabel(result)}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                aria-expanded={dropdownOpen}
              >
                {runShortChromeLabel(result)}
                <span className="text-zinc-400">▾</span>
              </button>
              {dropdownOpen ? (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setDropdownOpen(false)} />
                  <ul className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
                    <li className="border-b border-slate-100 px-3 py-2 text-xs text-zinc-500">
                      Your think tank on this decision
                    </li>
                    {DEMO_RUNS.map((r) => (
                      <li key={r.run_id}>
                        <button
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm ${
                            r.llm_provider === provider
                              ? "bg-indigo-50 font-medium text-indigo-800"
                              : "text-zinc-700 hover:bg-zinc-50"
                          }`}
                          onClick={() => {
                            setDropdownOpen(false);
                            router.push(`/demo/result?provider=${r.llm_provider}`);
                          }}
                        >
                          {runShortChromeLabel(r)}
                          {r.llm_provider === provider ? " (current)" : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
            <Link
              href="/demo/unified"
              className="inline-flex items-center rounded-lg border border-sky-600/80 bg-sky-950/40 px-3 py-1.5 text-sm font-medium text-sky-100 hover:bg-sky-900/60"
            >
              Unified Brief
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Decision context</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">{runHeadline(result)}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {runPostureLabel(result.intake.posture)} · {runProviderLabel(result.llm_provider)}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6">
        <ResultContent result={result} />
      </div>

      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-6 py-6">
        <Link href="/demo/clarify" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Clarifying questions
        </Link>
        <Link
          href="/request-access"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Request access to run your own
        </Link>
      </div>
    </>
  );
}

export default function DemoResultPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-zinc-600">Loading…</p>
        </div>
      }
    >
      <DemoResultContent />
    </Suspense>
  );
}
