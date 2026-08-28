"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  AuthorshipBatchSummary,
  AuthorshipInfluenceShift,
  AuthorshipMoralCell,
  AuthorshipRollupMatrix,
} from "@/lib/authorship-harness-summary";
import { AUTHORSHIP_SUMMARY_MODES } from "@/lib/authorship-harness-summary";
import {
  AUDIT_DIMENSION_LABELS,
  AUDIT_VALUE_LABELS,
  AUDIT_VALUE_TONE,
  UNIFIED_BRIEF_AUDIT_DIMENSIONS,
  type AuditValueTone,
  type UnifiedBriefAuditDimension,
} from "@/lib/unified-brief-audit/rubric";
import { influenceLabel } from "@/lib/unified-brief-influence-matrix";
import { UNIFIED_BRIEF_SYNTHESIZERS } from "@/lib/unified-briefs";
import type { ContributionInfluence, UnifiedBriefAuthorshipMode } from "@/types/decision";

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

const RATED_LABEL: Record<string, string> = {
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

const HEATMAP_CELL: Record<ContributionInfluence, string> = {
  high: "bg-indigo-600 text-white",
  medium: "bg-indigo-400 text-white",
  low: "bg-indigo-200 text-indigo-950",
  minimal: "bg-zinc-100 text-zinc-600 border border-zinc-200",
};

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

function RollupHeatmap({ matrix }: { matrix: AuthorshipRollupMatrix }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-1 text-left">
        <thead>
          <tr>
            <th className="px-2 py-1 text-[11px] font-medium text-zinc-500">Author → rated</th>
            {matrix.rated.map((rated) => (
              <th
                key={rated}
                className="px-1 py-1 text-center text-[11px] font-medium text-zinc-600 whitespace-nowrap"
              >
                {RATED_LABEL[rated] ?? rated}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.raters.map((rater) => (
            <tr key={rater}>
              <th className="px-2 py-1 text-left text-xs font-semibold text-zinc-800 whitespace-nowrap">
                {SYNTH_LABEL[rater]}
              </th>
              {matrix.rated.map((rated) => {
                const cell = matrix.cells[rater]?.[rated];
                if (!cell) {
                  return (
                    <td key={rated} className="p-0">
                      <div className="flex min-h-[3rem] min-w-[4.5rem] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 text-[11px] text-zinc-400">
                        —
                      </div>
                    </td>
                  );
                }
                return (
                  <td key={rated} className="p-0">
                    <div
                      title={`Mean ${cell.mean} across ${cell.n} case cell(s)`}
                      className={`flex min-h-[3rem] min-w-[4.5rem] flex-col items-center justify-center rounded-md px-2 py-1.5 text-center ${HEATMAP_CELL[cell.influence]}`}
                    >
                      <span className="text-xs font-semibold leading-tight">
                        {influenceLabel(cell.influence)}
                      </span>
                      <span className="mt-0.5 text-[10px] opacity-90">
                        {cell.mean.toFixed(1)} · n={cell.n}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuthorshipHarnessDashboard({
  batches,
  compactHeader = false,
}: {
  batches: AuthorshipBatchSummary[];
  expectedSynthesizers?: number;
  compactHeader?: boolean;
}) {
  const [batchId, setBatchId] = useState(batches[0]?.batch_id ?? "");
  const [rollupMode, setRollupMode] = useState<UnifiedBriefAuthorshipMode>("open");
  const [moralMode, setMoralMode] = useState<UnifiedBriefAuthorshipMode | "all">("open");
  const [selected, setSelected] = useState<{ demoLabel: string; cell: AuthorshipMoralCell } | null>(
    null
  );

  const batch = useMemo(
    () => batches.find((b) => b.batch_id === batchId) ?? batches[0] ?? null,
    [batches, batchId]
  );

  const rollup = useMemo(() => {
    if (!batch?.rollup_matrices?.length) return null;
    return (
      batch.rollup_matrices.find((m) => m.mode === rollupMode) ?? batch.rollup_matrices[0] ?? null
    );
  }, [batch, rollupMode]);

  const demosByShifts = useMemo(() => {
    if (!batch) return [];
    return [...batch.demos].sort(
      (a, b) => b.influence_shift_count - a.influence_shift_count || a.demo_label.localeCompare(b.demo_label)
    );
  }, [batch]);

  if (batches.length === 0 || !batch) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Multi-demo authorship</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-600">
          No authorship study batches yet. Run the five-case study, then return here for
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
            Study findings
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Multi-demo authorship
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
            How to read this: contribution heatmaps and moral audits across Standard / Blind /
            Reassigned Unified Briefs. Compare modes to see whether credit and moral posture shift
            when brand labels change.
          </p>
        </header>
      ) : (
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
          How to read this: contribution heatmaps and moral audits across Standard / Blind /
          Reassigned modes. Compare modes to see whether credit tracks ideas or brand labels.
        </p>
      )}

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
        <p className="text-xs text-zinc-500">
          {batch.decision_count} cases · {batch.total_influence_shifts ?? 0} branding shifts ·{" "}
          {batch.total_audits} audits
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Cross-case influence rollup</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-zinc-500">
              Mean weight each Unified Brief author gave each think-tank member, averaged across
              cases that have that cell. Same scale as the per-case heatmaps (high → minimal).
            </p>
          </div>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Rollup authorship mode">
            {AUTHORSHIP_SUMMARY_MODES.map((mode) => {
              const available = batch.rollup_matrices?.some((m) => m.mode === mode);
              const active = rollupMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={!available}
                  onClick={() => setRollupMode(mode)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    active
                      ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                      : available
                        ? "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                        : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400"
                  }`}
                >
                  {MODE_LABEL[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {!rollup ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No contribution matrices to roll up yet.
          </p>
        ) : (
          <>
            <p className="text-[11px] text-zinc-500">
              Averaged over {rollup.case_count} case
              {rollup.case_count === 1 ? "" : "s"} · cell shows mean score and how many cases
              contributed
            </p>
            <RollupHeatmap matrix={rollup} />
            <div className="flex flex-wrap gap-2 pt-1">
              {(["high", "medium", "low", "minimal"] as ContributionInfluence[]).map((level) => (
                <span
                  key={level}
                  className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${HEATMAP_CELL[level]}`}
                >
                  {influenceLabel(level)}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Cases by shift volume</h2>
        <p className="text-xs text-zinc-500">
          How many Standard → Blind / Standard → Reassigned weight changes each case produced (|Δ| ≥
          1).
        </p>
        <ol className="space-y-2">
          {demosByShifts.map((d, i) => (
            <li
              key={d.decision_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">
                  <span className="mr-2 tabular-nums text-zinc-400">{i + 1}.</span>
                  {d.demo_label}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-700">
                  {d.influence_shift_count} shifts
                </span>
                <Link
                  href={`/run/best-of-worlds?decision_id=${encodeURIComponent(d.decision_id)}`}
                  className="text-xs font-medium text-teal-800 hover:text-teal-950"
                >
                  Heatmaps →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Branding credit shifts by case</h2>
        <p className="text-xs text-zinc-500">
          Open → Blind / Open → Reassigned influence deltas from each case’s contribution matrices.
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
                  No shifts (same weights across modes, or missing contribution matrices).
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {d.top_shifts.map((s: AuthorshipInfluenceShift, i: number) => (
                    <li key={`${d.decision_id}-${i}`} className="text-xs leading-snug text-zinc-700">
                      <span className="mr-1.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-medium text-zinc-600">
                        {s.badge}
                      </span>
                      {s.title}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/run/best-of-worlds?decision_id=${encodeURIComponent(d.decision_id)}`}
                className="mt-3 inline-block text-xs font-medium text-teal-800 hover:text-teal-950"
              >
                Open heatmaps →
              </Link>
            </article>
          ))}
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
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5">
                    <h3 className="text-sm font-semibold text-zinc-900">{d.demo_label}</h3>
                    <Link
                      href={`/run/best-of-worlds?decision_id=${encodeURIComponent(d.decision_id)}`}
                      className="text-xs font-medium text-teal-800 hover:text-teal-950"
                    >
                      Unified Brief →
                    </Link>
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
