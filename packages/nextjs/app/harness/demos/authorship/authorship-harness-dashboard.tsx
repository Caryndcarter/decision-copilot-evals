"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AuthorshipBatchSummary, AuthorshipMoralCell } from "@/lib/authorship-harness-summary";
import { AUTHORSHIP_SUMMARY_MODES } from "@/lib/authorship-harness-summary";
import {
  AUDIT_DIMENSION_LABELS,
  AUDIT_VALUE_LABELS,
  AUDIT_VALUE_TONE,
  UNIFIED_BRIEF_AUDIT_DIMENSIONS,
  type AuditValueTone,
  type UnifiedBriefAuditDimension,
} from "@/lib/unified-brief-audit/rubric";
import { UNIFIED_BRIEF_SYNTHESIZERS } from "@/lib/unified-briefs";
import type { UnifiedBriefAuthorshipMode } from "@/types/decision";

const MODE_LABEL: Record<(typeof AUTHORSHIP_SUMMARY_MODES)[number], string> = {
  open: "Standard",
  blind: "Blind",
  reassigned: "Reassigned",
};

const SYNTH_LABEL: Record<(typeof UNIFIED_BRIEF_SYNTHESIZERS)[number], string> = {
  openai: "ChatGPT",
  anthropic: "Fable",
  gemini: "Gemini",
  xai: "Grok",
};

const TONE_CHIP: Record<AuditValueTone, string> = {
  positive: "bg-emerald-100 text-emerald-900 border-emerald-200",
  caution: "bg-amber-100 text-amber-950 border-amber-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
  muted: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

function coverageCell(briefs: number, contribs: number, audits: number, expectedSynth: number) {
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
      title={`${briefs}/${expectedSynth} briefs · ${contribs}/${expectedSynth} contributions · ${audits}/${expectedSynth} moral audits`}
    >
      {briefs}/{contribs}
      {audits > 0 ? <span className="text-zinc-400"> · {audits}a</span> : null}
    </span>
  );
}

function AuditChip({
  dim,
  value,
  quote,
  onClick,
}: {
  dim: UnifiedBriefAuditDimension;
  value: string | undefined;
  quote?: string;
  onClick?: () => void;
}) {
  if (!value) {
    return <span className="text-[11px] text-zinc-300">—</span>;
  }
  const tone = AUDIT_VALUE_TONE[value] ?? "neutral";
  const label = AUDIT_VALUE_LABELS[value] ?? value.replace(/_/g, " ");
  return (
    <button
      type="button"
      title={quote || AUDIT_DIMENSION_LABELS[dim]}
      onClick={onClick}
      className={`inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${TONE_CHIP[tone]} hover:ring-1 hover:ring-teal-300`}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

function MoralDetailDrawer({
  demoLabel,
  cell,
  onClose,
}: {
  demoLabel: string;
  cell: AuthorshipMoralCell;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                {demoLabel} · {SYNTH_LABEL[cell.synthesizer]} · {MODE_LABEL[cell.mode]}
              </p>
              <p className="mt-1 text-sm text-zinc-600">Generic Unified Brief moral audit</p>
            </div>
            <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800">
              Close
            </button>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          {UNIFIED_BRIEF_AUDIT_DIMENSIONS.map((dim) => (
            <div key={dim} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900">{AUDIT_DIMENSION_LABELS[dim]}</p>
                <AuditChip dim={dim} value={cell.values[dim]} />
              </div>
              {cell.quotes[dim] ? (
                <blockquote className="mt-2 border-l-2 border-zinc-200 pl-3 text-sm italic text-zinc-600">
                  “{cell.quotes[dim]}”
                </blockquote>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function AuthorshipHarnessDashboard({
  batches,
  expectedSynthesizers = 4,
  compactHeader = false,
}: {
  batches: AuthorshipBatchSummary[];
  expectedSynthesizers?: number;
  /** When embedded in the findings hub */
  compactHeader?: boolean;
}) {
  const [batchId, setBatchId] = useState(batches[0]?.batch_id ?? "");
  const [moralMode, setMoralMode] = useState<UnifiedBriefAuthorshipMode | "all">("open");
  const [selected, setSelected] = useState<{ demoLabel: string; cell: AuthorshipMoralCell } | null>(
    null
  );

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
          cross-demo branding effects and moral lean.
        </p>
        <pre className="mx-auto mt-5 max-w-xl overflow-x-auto rounded-lg bg-zinc-900 px-4 py-3 text-left text-xs text-zinc-100">
          {`npm run harness:demos:authorship -- --user-email=you@example.com
npm run harness:demos:authorship:moral -- --user-email=you@example.com --batch-id=<uuid>`}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!compactHeader ? (
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
            Harness findings
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Multi-demo authorship
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
            Cross-case coverage, branding credit shifts, and generic moral audits (Standard / Blind /
            Reassigned Unified Briefs).
          </p>
        </header>
      ) : null}

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
            {batch.total_contributions}/{batch.expected_briefs} · Audits {batch.total_audits}/
            {batch.expected_briefs} · {batch.decision_count} demos
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Case × authorship coverage</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Cells show briefs/contributions (and audit count when present) out of {expectedSynthesizers}{" "}
            synthesizers.
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
                      {coverageCell(
                        d.modes[m].briefs,
                        d.modes[m].contributions,
                        d.modes[m].audits,
                        expectedSynthesizers
                      )}
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Moral lean (generic audit)</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Eight domain-agnostic dimensions on Unified Briefs. Emerald = pushback / honesty;
              amber = filer reinforcement or soft-pedaling. Click a chip for the quote.
            </p>
          </div>
          <label className="text-xs font-medium text-zinc-600">
            Authorship mode
            <select
              value={moralMode}
              onChange={(e) => setMoralMode(e.target.value as UnifiedBriefAuthorshipMode | "all")}
              className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            >
              <option value="open">Standard</option>
              <option value="blind">Blind</option>
              <option value="reassigned">Reassigned</option>
              <option value="all">All modes</option>
            </select>
          </label>
        </div>

        {batch.total_audits === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-600">
            No moral audits on this batch yet. After Unified Briefs exist, run:
            <pre className="mx-auto mt-3 max-w-2xl overflow-x-auto rounded-lg bg-zinc-900 px-3 py-2 text-left text-[11px] text-zinc-100">
              {`npm run harness:demos:authorship:moral -- --user-email=you@example.com --batch-id=${batch.batch_id}`}
            </pre>
          </div>
        ) : (
          <div className="space-y-4">
            {batch.demos.map((d) => {
              const cells = d.moral_cells.filter(
                (c) => moralMode === "all" || c.mode === moralMode
              );
              if (cells.length === 0) {
                return (
                  <div
                    key={`moral-empty-${d.decision_id}`}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500"
                  >
                    <span className="font-medium text-zinc-800">{d.demo_label}</span> — no audits
                    for this mode yet.
                  </div>
                );
              }
              return (
                <div
                  key={`moral-${d.decision_id}`}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
                >
                  <div className="border-b border-zinc-100 px-4 py-2.5">
                    <h3 className="text-sm font-semibold text-zinc-900">{d.demo_label}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Synthesizer</th>
                          {moralMode === "all" ? (
                            <th className="px-3 py-2 font-medium">Mode</th>
                          ) : null}
                          {UNIFIED_BRIEF_AUDIT_DIMENSIONS.map((dim) => (
                            <th key={dim} className="px-2 py-2 font-medium whitespace-nowrap">
                              {AUDIT_DIMENSION_LABELS[dim]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cells.map((cell) => (
                          <tr
                            key={`${d.decision_id}-${cell.synthesizer}-${cell.mode}`}
                            className="border-t border-zinc-100"
                          >
                            <td className="px-3 py-2 font-medium text-zinc-800 whitespace-nowrap">
                              {SYNTH_LABEL[cell.synthesizer]}
                            </td>
                            {moralMode === "all" ? (
                              <td className="px-3 py-2 text-zinc-600 whitespace-nowrap">
                                {MODE_LABEL[cell.mode]}
                              </td>
                            ) : null}
                            {UNIFIED_BRIEF_AUDIT_DIMENSIONS.map((dim) => (
                              <td key={dim} className="px-2 py-2">
                                <AuditChip
                                  dim={dim}
                                  value={cell.values[dim]}
                                  quote={cell.quotes[dim]}
                                  onClick={() => setSelected({ demoLabel: d.demo_label, cell })}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

      {selected ? (
        <MoralDetailDrawer
          demoLabel={selected.demoLabel}
          cell={selected.cell}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
