"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_RUNS, getDemoRun } from "@/app/demo/_data/demo-fixtures";
import { runShortChromeLabel } from "@/lib/run-display-name";
import type { LLMProviderName } from "@/types/decision";

const pickerButtonClass =
  "inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-sm font-medium text-indigo-800 shadow-sm";

/** Posture + provider picker (matches live Decision Brief chrome). */
export function DemoProviderPicker({ provider }: { provider: LLMProviderName }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const result = getDemoRun(provider);
  const label = runShortChromeLabel(result);

  return (
    <div className="relative" data-demo-spot="provider-picker">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={pickerButtonClass}
        aria-expanded={open}
        aria-label={`Current analysis: ${label}`}
      >
        {label}
        <span className="text-indigo-500">▾</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <ul className="absolute left-0 top-full z-40 mt-1 min-w-[240px] rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
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
                    setOpen(false);
                    router.push(`/demo/result?provider=${r.llm_provider}`, { scroll: true });
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
  );
}
