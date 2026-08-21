"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type {
  ContributionInfluence,
  DecisionRunResult,
  LLMProviderName,
  UnifiedBriefAuthorshipMode,
} from "@/types/decision";
import {
  getUnifiedBriefContributionsByAuthor,
  getUnifiedBriefForAuthor,
  UNIFIED_BRIEF_SYNTHESIZERS,
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
const CHART_MODES: UnifiedBriefAuthorshipMode[] = ["open", "blind", "reassigned"];

type ChartTab = UnifiedBriefAuthorshipMode | "findings";
type MatrixByMode = Record<UnifiedBriefAuthorshipMode, InfluenceMatrix | null>;

function authorshipModeChartLabel(mode: UnifiedBriefAuthorshipMode): string {
  if (mode === "blind") return "Blind";
  if (mode === "reassigned") return "Reassigned";
  return "Standard";
}

function authorshipModeDescription(mode: UnifiedBriefAuthorshipMode): string {
  if (mode === "blind") return "blind-authorship briefs";
  if (mode === "reassigned") return "reassigned-authorship briefs";
  return "standard briefs";
}

function signedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

function isProviderName(value: string): value is LLMProviderName {
  return value === "anthropic" || value === "openai" || value === "gemini" || value === "xai";
}

function remapForRater(
  persistRun: DecisionRunResult | null,
  rater: UnifiedBriefSynthesizer
): Partial<Record<LLMProviderName, LLMProviderName>> | undefined {
  if (!persistRun) return undefined;
  return (
    getUnifiedBriefContributionsByAuthor(persistRun, "reassigned")[rater]?.authorship_provider_remap ??
    getUnifiedBriefForAuthor(persistRun, rater, "reassigned")?.authorship_provider_remap
  );
}

/** e.g. "Google Gemini (shown to xAI as ChatGPT)" when reassigned remap is known. */
function ratedLabelWithRemap(
  rated: LLMProviderName,
  rater: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode,
  persistRun: DecisionRunResult | null
): string {
  const base = ratedLabel(rated);
  if (mode !== "reassigned") return base;
  const shownAs = remapForRater(persistRun, rater)?.[rated];
  if (!shownAs) return `${base} (reassigned brand unknown)`;
  if (shownAs === rated) return `${base} (shown as itself)`;
  return `${base} (shown to ${raterLabel(rater)} as ${ratedLabel(shownAs)})`;
}

function cellFindingDetail(
  rater: UnifiedBriefSynthesizer,
  rated: LLMProviderName,
  fromMode: UnifiedBriefAuthorshipMode,
  toMode: UnifiedBriefAuthorshipMode,
  from: InfluenceMatrixCell,
  to: InfluenceMatrixCell,
  persistRun: DecisionRunResult | null
): string {
  const fromLabel = ratedLabelWithRemap(rated, rater, fromMode, persistRun);
  const toLabel = ratedLabelWithRemap(rated, rater, toMode, persistRun);
  const sameDisplay = fromLabel === toLabel;
  if (sameDisplay) {
    return `${raterLabel(rater)} rated ${fromLabel} ${influenceLabel(from.influence)} in ${authorshipModeChartLabel(fromMode).toLowerCase()} and ${influenceLabel(to.influence)} in ${authorshipModeChartLabel(toMode).toLowerCase()}.`;
  }
  return `${raterLabel(rater)} rated ${fromLabel} ${influenceLabel(from.influence)} in ${authorshipModeChartLabel(fromMode).toLowerCase()}, then ${toLabel} ${influenceLabel(to.influence)} in ${authorshipModeChartLabel(toMode).toLowerCase()}.`;
}

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

type InfluenceFinding = {
  key: string;
  title: string;
  detail: string;
  severity: number;
  badge: string;
};

function cellAt(
  matrix: InfluenceMatrix | null,
  rater: UnifiedBriefSynthesizer,
  rated: LLMProviderName
): InfluenceMatrixCell | undefined {
  return matrix?.cells[rater]?.[rated];
}

function buildInfluenceFindings(
  matrices: MatrixByMode,
  persistRun: DecisionRunResult | null
): { findings: InfluenceFinding[]; missing: string[] } {
  const findings: InfluenceFinding[] = [];
  const missing: string[] = [];

  for (const mode of CHART_MODES) {
    const matrix = matrices[mode];
    if (!matrix) {
      missing.push(`${authorshipModeChartLabel(mode)}: no contribution analyses yet`);
      continue;
    }
    const missingAuthors = UNIFIED_BRIEF_SYNTHESIZERS.filter((author) => !matrix.raters.includes(author));
    if (missingAuthors.length > 0) {
      missing.push(
        `${authorshipModeChartLabel(mode)}: missing ${missingAuthors
          .map(unifiedBriefSynthesizerLabel)
          .join(", ")}`
      );
    }
  }

  const comparedModes: Array<[UnifiedBriefAuthorshipMode, UnifiedBriefAuthorshipMode]> = [
    ["open", "blind"],
    ["open", "reassigned"],
    ["blind", "reassigned"],
  ];

  for (const [fromMode, toMode] of comparedModes) {
    const fromMatrix = matrices[fromMode];
    const toMatrix = matrices[toMode];
    if (!fromMatrix || !toMatrix) continue;

    for (const rater of UNIFIED_BRIEF_SYNTHESIZERS) {
      for (const rated of new Set([...fromMatrix.rated, ...toMatrix.rated])) {
        const from = cellAt(fromMatrix, rater, rated);
        const to = cellAt(toMatrix, rater, rated);
        if (!from || !to) continue;
        const delta = to.score - from.score;
        // One step on the 4-level scale (e.g. high→medium) is already a real branding move.
        if (Math.abs(delta) < 1) continue;
        const involvesReassigned = fromMode === "reassigned" || toMode === "reassigned";
        const shownAs =
          involvesReassigned ? remapForRater(persistRun, rater)?.[rated] : undefined;
        findings.push({
          key: `cell-${fromMode}-${toMode}-${rater}-${rated}`,
          title: shownAs
            ? `${ratedLabel(rated)} (as ${ratedLabel(shownAs)}) moved ${signedDelta(delta)} for ${raterLabel(rater)}`
            : `${ratedLabel(rated)} moved ${signedDelta(delta)} for ${raterLabel(rater)}`,
          detail: cellFindingDetail(rater, rated, fromMode, toMode, from, to, persistRun),
          severity: Math.abs(delta),
          badge: `${authorshipModeChartLabel(fromMode)} → ${authorshipModeChartLabel(toMode)}`,
        });
      }
    }

    for (const provider of new Set([
      ...fromMatrix.averageReceived.map((r) => r.provider),
      ...toMatrix.averageReceived.map((r) => r.provider),
    ])) {
      const from = fromMatrix.averageReceived.find((r) => r.provider === provider);
      const to = toMatrix.averageReceived.find((r) => r.provider === provider);
      if (!from || !to) continue;
      const delta = Math.round((to.average - from.average) * 100) / 100;
      if (Math.abs(delta) < 1) continue;
      findings.push({
        key: `avg-${fromMode}-${toMode}-${provider}`,
        title: `${ratedLabel(provider)} average influence shifted ${signedDelta(delta)}`,
        detail: `Average weight received changed from ${from.average.toFixed(2)} in ${authorshipModeChartLabel(fromMode).toLowerCase()} to ${to.average.toFixed(2)} in ${authorshipModeChartLabel(toMode).toLowerCase()}.`,
        severity: Math.abs(delta),
        badge: "Average received",
      });
    }
  }

  if (persistRun && matrices.open && matrices.reassigned) {
    const openMatrix = matrices.open;
    const reassignedMatrix = matrices.reassigned;
    for (const rater of UNIFIED_BRIEF_SYNTHESIZERS) {
      const remap = remapForRater(persistRun, rater);
      if (!remap) continue;
      for (const [realProvider, shownProvider] of Object.entries(remap)) {
        if (!isProviderName(realProvider) || !isProviderName(shownProvider)) continue;
        const open = cellAt(openMatrix, rater, realProvider);
        const reassigned = cellAt(reassignedMatrix, rater, realProvider);
        if (!open || !reassigned) continue;
        const delta = reassigned.score - open.score;
        if (Math.abs(delta) < 1) continue;
        findings.push({
          key: `remap-${rater}-${realProvider}-${shownProvider}`,
          title: `${ratedLabel(realProvider)} changed when shown as ${ratedLabel(shownProvider)}`,
          detail: `${raterLabel(rater)} saw ${ratedLabel(realProvider)} as ${ratedLabel(shownProvider)} in reassigned authorship; the score moved from ${influenceLabel(open.influence)} standard to ${influenceLabel(reassigned.influence)} reassigned (${signedDelta(delta)}).`,
          severity: Math.abs(delta) + 0.25,
          badge: "Reassigned remap",
        });
      }
    }
  }

  findings.sort((a, b) => b.severity - a.severity || a.title.localeCompare(b.title));
  return { findings: findings.slice(0, 8), missing };
}

function FindingsPanel({
  matrices,
  persistRun,
}: {
  matrices: MatrixByMode;
  persistRun: DecisionRunResult | null;
}) {
  const { findings, missing } = useMemo(
    () => buildInfluenceFindings(matrices, persistRun),
    [matrices, persistRun]
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Combined findings</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Highlights credit shifts across standard, blind, and reassigned contribution analyses (one step on
          the high/medium/low/minimal scale counts). These are deterministic chart comparisons, not a new
          model interpretation.
        </p>
      </div>

      {findings.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
          {missing.some((line) => line.includes("no contribution analyses"))
            ? "No influence shifts yet. Run contribution analyses for the same brief authors across at least two authorship modes to unlock comparisons."
            : "No influence shifts across authorship modes — every matched cell kept the same weight (or only one mode has contributions)."}
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <article key={finding.key} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-zinc-900">{finding.title}</h4>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  {finding.badge}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{finding.detail}</p>
            </article>
          ))}
        </div>
      )}

      {missing.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Coverage notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {missing.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
  const [activeTab, setActiveTab] = useState<ChartTab>(authorshipMode);
  const matrices = useMemo<MatrixByMode>(() => {
    if (!persistRun) return { open: null, blind: null, reassigned: null };
    return {
      open: buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, "open")),
      blind: buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, "blind")),
      reassigned: buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, "reassigned")),
    };
  }, [persistRun]);
  const matrix = activeTab === "findings" ? null : matrices[activeTab];

  const activeRemap = useMemo(() => {
    if (!persistRun || activeTab !== "reassigned") return undefined;
    const contrib = getUnifiedBriefContributionsByAuthor(persistRun, "reassigned")[activeSynthesizer];
    const brief = getUnifiedBriefForAuthor(persistRun, activeSynthesizer, "reassigned");
    return contrib?.authorship_provider_remap ?? brief?.authorship_provider_remap;
  }, [persistRun, activeTab, activeSynthesizer]);

  useEffect(() => {
    if (open) setActiveTab(authorshipMode);
  }, [open, authorshipMode]);

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
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Compare how each Unified Brief author weighted think tank members across authorship modes.
              High = 4, Medium = 3, Low = 2, Minimal = 1.
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
          <div className="mb-5 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
            {CHART_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveTab(mode)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === mode
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {authorshipModeChartLabel(mode)}
                {matrices[mode] ? "" : " · empty"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveTab("findings")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "findings"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Findings
            </button>
          </div>

          {activeTab === "findings" ? (
            <FindingsPanel matrices={matrices} persistRun={persistRun} />
          ) : !matrix ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
              No {authorshipModeDescription(activeTab)} contribution analyses yet. On the Contributions tab, run{" "}
              <span className="font-medium text-zinc-800">Analyze contributions</span> for one or more
              brief authors in this authorship mode, then reopen these charts.
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {authorshipModeChartLabel(activeTab)} authorship
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Showing influence weights from {authorshipModeDescription(activeTab)}.
                </p>
              </div>

              {activeTab === "reassigned" && activeRemap ? (
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
