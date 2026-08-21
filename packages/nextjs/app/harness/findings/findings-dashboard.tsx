"use client";

import { useState } from "react";
import { AuthorshipHarnessDashboard } from "@/app/harness/demos/authorship/authorship-harness-dashboard";
import { MeridianMoralDashboard } from "@/app/harness/meridian-ic/moral/meridian-moral-dashboard";
import type { AuthorshipBatchSummary } from "@/lib/authorship-harness-summary";

export type FindingsStudy = "meridian-ic-moral" | "multi-demo-authorship";

const STUDIES: { id: FindingsStudy; label: string; blurb: string }[] = [
  {
    id: "meridian-ic-moral",
    label: "Meridian IC moral",
    blurb: "Committed IC voice batches — provider Decision Briefs, 14 Civitas-specific dims",
  },
  {
    id: "multi-demo-authorship",
    label: "Multi-demo authorship",
    blurb: "Live five-case batches — branding + generic moral audits on Unified Briefs",
  },
];

export function HarnessFindingsDashboard({
  authorshipBatches,
  initialStudy = "multi-demo-authorship",
}: {
  authorshipBatches: AuthorshipBatchSummary[];
  initialStudy?: FindingsStudy;
}) {
  const [study, setStudy] = useState<FindingsStudy>(initialStudy);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-800">
          Research harness
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Harness findings</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
          Switch among harness studies. Meridian IC uses committed moral snapshots; multi-demo
          authorship pulls live batches (coverage, influence shifts, and moral lean when audited).
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Harness study">
        {STUDIES.map((s) => {
          const active = study === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStudy(s.id)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                active
                  ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
              }`}
            >
              <span className="block text-sm font-semibold">{s.label}</span>
              <span className="mt-0.5 block max-w-[18rem] text-[11px] leading-snug opacity-80">
                {s.blurb}
              </span>
            </button>
          );
        })}
      </div>

      {study === "meridian-ic-moral" ? (
        <MeridianMoralDashboard embedded />
      ) : (
        <AuthorshipHarnessDashboard batches={authorshipBatches} compactHeader />
      )}
    </div>
  );
}
