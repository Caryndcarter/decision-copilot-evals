"use client";

import { useEffect, useId, useMemo } from "react";
import type {
  ContributionInfluence,
  DecisionRunResult,
  UnifiedBriefAuthorshipMode,
} from "@/types/decision";
import {
  getUnifiedBriefContributionsByAuthor,
  getUnifiedBriefForAuthor,
  unifiedBriefSynthesizerLabel,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import {
  buildInfluenceMatrix,
  influenceLabel,
  ratedLabel,
  raterLabel,
  type InfluenceMatrix,
  type InfluenceMatrixCell,
} from "@/lib/unified-brief-influence-matrix";
import { AuthorshipRemapLegend } from "./authorship-remap-legend";

/** Site-theme heatmap cells: indigo scale (not canvas host theme). */
const HEATMAP_CELL: Record<ContributionInfluence, string> = {
  high: "bg-indigo-600 text-white",
  medium: "bg-indigo-400 text-white",
  low: "bg-indigo-200 text-indigo-950",
  minimal: "bg-zinc-100 text-zinc-600 border border-zinc-200",
};

const MAX_SCORE = 4;

function HeatmapCell({ cell }: { cell: InfluenceMatrixCell | undefined }) {
  if (!cell) {
    return (
      <div className="flex min-h-[3.25rem] min-w-[5.5rem] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-2 py-2 text-center text-[11px] text-zinc-400">
        —
      </div>
    );
  }
  return (
    <div
      className={`flex min-h-[3.25rem] min-w-[5.5rem] flex-col items-center justify-center rounded-md px-2 py-2 text-center print-color-adjust-exact ${HEATMAP_CELL[cell.influence]}`}
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <span className="text-xs font-semibold leading-tight">{influenceLabel(cell.influence)}</span>
      <span className="mt-0.5 text-[10px] opacity-90">
        {cell.score}/{MAX_SCORE}
      </span>
    </div>
  );
}

function Heatmap({ matrix }: { matrix: InfluenceMatrix }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1.5">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Brief author → member
            </th>
            {matrix.rated.map((provider) => (
              <th
                key={provider}
                className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                {ratedLabel(provider)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.raters.map((rater) => (
            <tr key={rater}>
              <td className="whitespace-nowrap px-2 py-1 text-sm font-semibold text-zinc-900">
                {raterLabel(rater)}
              </td>
              {matrix.rated.map((rated) => (
                <td key={`${rater}-${rated}`}>
                  <HeatmapCell cell={matrix.cells[rater]?.[rated]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AverageBarChart({ matrix }: { matrix: InfluenceMatrix }) {
  const maxAvg = Math.max(...matrix.averageReceived.map((a) => a.average), 1);

  return (
    <div className="space-y-3">
      {matrix.averageReceived.map((row) => {
        const widthPct = Math.max(4, (row.average / MAX_SCORE) * 100);
        return (
          <div key={row.provider} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3">
            <span className="truncate text-sm font-medium text-zinc-800">{row.label}</span>
            <div className="h-8 overflow-hidden rounded-md bg-zinc-100">
              <div
                className="flex h-full items-center rounded-md bg-indigo-600 px-2 transition-[width] duration-300 print-color-adjust-exact"
                style={{
                  width: `${widthPct}%`,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
                title={`${row.average.toFixed(2)} / ${MAX_SCORE} across ${row.ratingCount} brief author${row.ratingCount === 1 ? "" : "s"}`}
              >
                {row.average >= maxAvg * 0.35 ? (
                  <span className="text-[11px] font-semibold text-white">{row.average.toFixed(2)}</span>
                ) : null}
              </div>
            </div>
            <span className="text-right text-xs tabular-nums text-zinc-500">
              {row.average.toFixed(2)}/{MAX_SCORE}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  const levels: ContributionInfluence[] = ["high", "medium", "low", "minimal"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Scale</span>
      {levels.map((level) => (
        <span
          key={level}
          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${HEATMAP_CELL[level]}`}
        >
          {influenceLabel(level)} ({level === "high" ? 4 : level === "medium" ? 3 : level === "low" ? 2 : 1})
        </span>
      ))}
    </div>
  );
}

/** Heatmap + average bars; used in overlay and print/PDF appendix. */
export function UnifiedBriefInfluenceChartsBody({ matrix }: { matrix: InfluenceMatrix }) {
  return (
    <div className="space-y-8 print:space-y-6">
      <Legend />

      {matrix.raters.length === 1 ? (
        <p className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-900 print:border-zinc-200 print:bg-zinc-50 print:text-zinc-800">
          Showing ratings from <span className="font-semibold">{raterLabel(matrix.raters[0])}</span> only.
          Analyze contributions for other brief authors to fill in the full matrix.
        </p>
      ) : null}

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Weight matrix</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Rows = brief author who assigned the weight. Columns = think tank member who received it.
          Stronger indigo = higher influence.
        </p>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 print:rounded-none print:border-zinc-300 print:p-2">
          <Heatmap matrix={matrix} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Average weight received</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Mean influence score (1–4) across brief authors who rated each member.
        </p>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 print:rounded-none print:border-zinc-300 print:p-2">
          <AverageBarChart matrix={matrix} />
        </div>
      </section>
    </div>
  );
}

export interface UnifiedBriefInfluenceChartsOverlayProps {
  open: boolean;
  onClose: () => void;
  persistRun: DecisionRunResult | null;
  /** Which authorship-mode contributions feed the matrix (open vs blind). */
  authorshipMode?: UnifiedBriefAuthorshipMode;
  /** When reassigned, show this author's brand remap once (not every synthesizer). */
  activeSynthesizer?: UnifiedBriefSynthesizer;
}

export function UnifiedBriefInfluenceChartsOverlay({
  open,
  onClose,
  persistRun,
  authorshipMode = "open",
  activeSynthesizer = "anthropic",
}: UnifiedBriefInfluenceChartsOverlayProps) {
  const titleId = useId();
  const matrix = useMemo(() => {
    if (!persistRun) return null;
    return buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, authorshipMode));
  }, [persistRun, authorshipMode]);

  const activeRemap = useMemo(() => {
    if (!persistRun || authorshipMode !== "reassigned") return undefined;
    const contrib = getUnifiedBriefContributionsByAuthor(persistRun, "reassigned")[activeSynthesizer];
    const brief = getUnifiedBriefForAuthor(persistRun, activeSynthesizer, "reassigned");
    return contrib?.authorship_provider_remap ?? brief?.authorship_provider_remap;
  }, [persistRun, authorshipMode, activeSynthesizer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-3 sm:p-6 print:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close influence charts"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              Influence charts
              {authorshipMode === "blind"
                ? " (blind authorship)"
                : authorshipMode === "reassigned"
                  ? " (reassigned authorship)"
                  : ""}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              How each Unified Brief author weighted think tank members in their contribution analysis
              {authorshipMode === "blind"
                ? " (blind-authorship briefs)"
                : authorshipMode === "reassigned"
                  ? " (reassigned-authorship briefs)"
                  : " (standard briefs)"}
              . High = 4, Medium = 3, Low = 2, Minimal = 1.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!matrix ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
              No contribution analyses yet. On the Contributions tab, run{" "}
              <span className="font-medium text-zinc-800">Analyze contributions</span> for one or more
              brief authors, then reopen these charts.
            </div>
          ) : (
            <div className="space-y-6">
              {authorshipMode === "reassigned" && activeRemap ? (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-600">
                    Charts use <span className="font-medium text-zinc-800">real</span> think-tank members.
                    Below is the brand remapping for{" "}
                    <span className="font-medium text-zinc-800">
                      {unifiedBriefSynthesizerLabel(activeSynthesizer)}
                    </span>
                    .
                  </p>
                  <AuthorshipRemapLegend
                    remap={activeRemap}
                    synthesizerLabel={unifiedBriefSynthesizerLabel(activeSynthesizer)}
                  />
                </div>
              ) : null}
              <UnifiedBriefInfluenceChartsBody matrix={matrix} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
