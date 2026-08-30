"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_RUNS, getDemoRun } from "@/app/demo/_data/demo-fixtures";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import type { LLMProviderName } from "@/types/decision";
import { runShortChromeLabel } from "@/lib/run-display-name";

type DemoBriefToolbarProps = {
  view: "single" | "unified";
  provider: LLMProviderName;
};

const viewToggleClass = {
  active: "inline-flex items-center rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-sm font-medium text-indigo-800 shadow-sm",
  inactive:
    "inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50",
};

export function DemoBriefToolbar({ view, provider }: DemoBriefToolbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const result = getDemoRun(provider);

  return (
    <header className="border-b border-zinc-200 bg-white shadow-sm">
      <div className={`flex flex-wrap items-center justify-between gap-4 py-3 ${demoContentClass}`}>
        <h1 className="text-base font-semibold text-zinc-900">
          {view === "single" ? (
            <>
              Decision Brief{" "}
              <span className="font-normal text-zinc-500">— {runShortChromeLabel(result)}</span>
            </>
          ) : (
            "Unified Brief"
          )}
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
          {view === "single" ? (
            <Link href={`/demo/unified?provider=${provider}`} className={viewToggleClass.inactive}>
              Unified Brief
            </Link>
          ) : (
            <span className={viewToggleClass.active} aria-current="page">
              Unified Brief
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
