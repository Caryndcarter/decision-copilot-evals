"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DimensionGlossaryTable } from "./dimension-glossary-table";

export type StudyProcessCase = {
  id: string;
  name: string;
  methodology: string[];
  dimensionGlossary?: { code: string; gloss: string }[];
  resultsHref: string;
};

export type StudyProcessTab = {
  id: string;
  name: string;
  question: string;
  scores: string;
  process: { title: string; desc: string }[];
  cases: StudyProcessCase[];
};

/**
 * Toggle between the studies (Voice Influence, Authorship, Replication),
 * each with its own process — they genuinely differ, so there is no single
 * "shared process." Deep-linkable: /model-studies/how-it-works#authorship opens
 * that tab and scrolls to the section.
 */
export function StudyProcessTabs({ tabs }: { tabs: StudyProcessTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace("#", "");
      if (tabs.some((t) => t.id === hash)) {
        setActiveId(hash);
      }
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [tabs]);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  function selectTab(id: string) {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  if (!active) return null;

  return (
    <div>
      {/* Deep-link anchor targets (offset for the sticky site nav) */}
      <div className="relative">
        {tabs.map((t) => (
          <span key={t.id} id={t.id} className="absolute -top-28" aria-hidden />
        ))}
      </div>

      <div role="tablist" aria-label="Studies" className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const selected = t.id === active.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectTab(t.id)}
              className={
                selected
                  ? "rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20"
                  : "rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-indigo-300 hover:text-indigo-700"
              }
            >
              {t.name}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
          {active.scores}
        </p>
        <h3 className="mt-2 text-xl font-bold leading-snug tracking-tight text-zinc-900">
          {active.question}
        </h3>

        <ol className="mt-6 space-y-6">
          {active.process.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900">{step.title}</div>
                <div className="mt-0.5 text-sm leading-relaxed text-zinc-500">{step.desc}</div>
              </div>
            </li>
          ))}
        </ol>

        {active.cases.length > 0 && (
          <div className="mt-10">
            <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Cases in this study
            </h4>
            <div className="mt-4 space-y-6">
              {active.cases.map((c) => (
                <div key={c.id} className="border-l-2 border-zinc-200 pl-4">
                  <h5 className="text-sm font-semibold text-zinc-800">{c.name}</h5>
                  <ul className="mt-2 space-y-2">
                    {c.methodology.map((m) => (
                      <li key={m} className="flex gap-3 text-sm leading-relaxed text-zinc-600">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                  {c.dimensionGlossary && c.dimensionGlossary.length > 0 && (
                    <div className="mt-3">
                      <DimensionGlossaryTable entries={c.dimensionGlossary} />
                    </div>
                  )}
                  <Link
                    href={c.resultsHref}
                    className="mt-2 inline-block text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
                  >
                    See {c.name} on Results →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
