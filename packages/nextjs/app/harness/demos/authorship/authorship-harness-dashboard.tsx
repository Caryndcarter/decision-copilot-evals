"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AuthorshipBatchSummary } from "@/lib/authorship-harness-summary";
import { AUTHORSHIP_SUMMARY_MODES } from "@/lib/authorship-harness-summary";

const MODE_LABEL: Record<(typeof AUTHORSHIP_SUMMARY_MODES)[number], string> = {
  open: "Standard",
  blind: "Blind",
  reassigned: "Reassigned",
};

function coverageCell(briefs: number, contribs: number, expectedSynth: number) {
  const briefOk = briefs >= expectedSynth;
  const contribOk = contribs >= expectedSynth;
  return (
    <span
      className={
        briefOk && contribOk
          ? "tabular-nums text-emerald-800"
          : briefs > 0
            ? "tabular-nums text-amber-800"
            : "tabular-nums text-zinc-400"
      }
      title={`${briefs}/${expectedSynth} briefs · ${contribs}/${expectedSynth} contributions`}
    >
      {briefs}/{contribs}
    </span>
  );
}

export function AuthorshipHarnessDashboard({
  batches,
  expectedSynthesizers = 4,
}: {
  batches: AuthorshipBatchSummary[];
  expectedSynthesizers?: number;
}) {
  const [batchId, setBatchId] = useState(batches[0]?.batch_id ?? "");
  const batch = useMemo(
    () => batches.find((b) => b.batch_id === batchId) ?? batches[0] ?? null,
    [batches, batchId]
  );

  if (batches.length === 0 || !batch) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Multi-demo authorship</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-600">
          No authorship harness batches yet. Run the five-case study, then return here for
          cross-demo branding-effect coverage and influence shifts.
        </p>
        <pre className="mx-auto mt-5 max-w-xl overflow-x-auto rounded-lg bg-zinc-900 px-4 py-3 text-left text-xs text-zinc-100">
          {`npm run harness:demos:authorship -- --user-email=you@example.com`}
        </pre>
        <p className="mt-4 text-xs text-zinc-500">
          Smoke one case first:{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            --demos=vp-sales-underperforming
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
          Harness summary
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Multi-demo authorship
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
          Cross-case view of Standard / Blind / Reassigned Unified Briefs. Per-decision influence
          charts still live on each Unified Brief; this page rolls up coverage and the largest
          branding credit shifts.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
          Batch
          <select
            value={batch.batch_id}
            onChange={(e) => setBatchId(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.kind_label}
                {typeof b.harness_run_number === "number" ? ` · Run ${b.harness_run_number}` : ""}
                {` · ${b.batch_short}`}
                {b.started_at ? ` · ${new Date(b.started_at).toLocaleString()}` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs text-zinc-500">
          <p>
            <span className="font-medium text-zinc-700">Batch ID</span>{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-800">
              {batch.batch_id}
            </code>
          </p>
          <p className="mt-1">
            Briefs {batch.total_briefs}/{batch.expected_briefs} · Contributions{" "}
            {batch.total_contributions}/{batch.expected_briefs} · {batch.decision_count} demos
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Case × authorship coverage</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Cells show briefs/contributions out of {expectedSynthesizers} synthesizers.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Case</th>
                {AUTHORSHIP_SUMMARY_MODES.map((m) => (
                  <th key={m} className="px-3 py-2 font-medium">
                    {MODE_LABEL[m]}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Shifts</th>
                <th className="px-4 py-2 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {batch.demos.map((d) => (
                <tr key={d.decision_id} className="border-t border-zinc-100 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">
                      {typeof d.harness_trial === "number" ? `${d.harness_trial}. ` : ""}
                      {d.demo_label}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-400">{d.demo_id}</p>
                  </td>
                  {AUTHORSHIP_SUMMARY_MODES.map((m) => (
                    <td key={m} className="px-3 py-3">
                      {coverageCell(d.modes[m].briefs, d.modes[m].contributions, expectedSynthesizers)}
                    </td>
                  ))}
                  <td className="px-3 py-3 tabular-nums text-zinc-700">{d.influence_shift_count}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/run/best-of-worlds?decision_id=${encodeURIComponent(d.decision_id)}`}
                      className="text-sm font-medium text-teal-800 hover:text-teal-950"
                    >
                      Unified Brief →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Largest branding credit shifts</h2>
        <p className="text-xs text-zinc-500">
          Open → Blind / Open → Reassigned influence deltas (|Δ| ≥ 2) from contribution matrices.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {batch.demos.map((d) => (
            <article
              key={`shifts-${d.decision_id}`}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">{d.demo_label}</h3>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                  {d.influence_shift_count} shifts
                </span>
              </div>
              {d.top_shifts.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">
                  No large shifts yet (need contributions in multiple authorship modes).
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {d.top_shifts.map((s, i) => (
                    <li key={`${d.decision_id}-${i}`} className="text-xs leading-snug text-zinc-700">
                      <span className="mr-1.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-medium text-zinc-600">
                        {s.badge}
                      </span>
                      {s.title}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
