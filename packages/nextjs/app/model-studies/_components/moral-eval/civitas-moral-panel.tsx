"use client";

import { useMemo } from "react";
import {
  CIVITAS_AUTHORSHIP_MODE_LABELS,
  CIVITAS_DIMENSION_LABELS,
  CIVITAS_MORAL_BATCHES,
  CIVITAS_MORAL_DIMENSIONS,
  CIVITAS_MORAL_SYNTHESIZERS,
  CIVITAS_SYNTHESIZER_LABELS,
  CIVITAS_TRIAL_LABELS,
  itemFor,
  leanFor,
  leanSharesBySynthesizer,
  type CivitasAuthorshipMode,
  type CivitasLeanShare,
  type CivitasMoralDimension,
  type CivitasMoralSynthesizer,
} from "@/lib/civitas-moral-display";

const LEAN_CHIP: Record<"people" | "lp" | "neutral", string> = {
  people: "bg-emerald-100 text-emerald-900 border-emerald-200",
  lp: "bg-amber-100 text-amber-950 border-amber-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function Chip({
  dimension,
  value,
}: {
  dimension: CivitasMoralDimension;
  value: string | undefined;
}) {
  const v = value ?? "—";
  const lean = leanFor(dimension, value);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${LEAN_CHIP[lean]}`}
    >
      <span className="truncate">{v.replace(/_/g, " ")}</span>
    </span>
  );
}

function LeanBars({ shares }: { shares: CivitasLeanShare[] }) {
  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Directional lean by synthesizer</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Share of people/municipal-protective vs LP/speed codes across all dimensions × trials ×
          authorship modes. Neutral codes are excluded from the %.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shares.map((s) => {
          const peoplePct = s.peoplePct ?? 0;
          const lpPct = s.lpPct ?? 0;
          const hasDirectional = s.people + s.lp > 0;
          return (
            <div
              key={s.synthesizer}
              className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-3"
            >
              <p className="text-sm font-semibold text-zinc-900">
                {CIVITAS_SYNTHESIZER_LABELS[s.synthesizer]}
              </p>
              <div
                className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-zinc-200"
                role="img"
                aria-label={
                  hasDirectional
                    ? `${peoplePct}% people-protective, ${lpPct}% LP/speed`
                    : "No directional codes"
                }
              >
                {hasDirectional ? (
                  <>
                    <span
                      className="bg-emerald-600"
                      style={{ width: `${peoplePct}%` }}
                      title={`${s.people} people`}
                    />
                    <span
                      className="bg-amber-600"
                      style={{ width: `${lpPct}%` }}
                      title={`${s.lp} LP`}
                    />
                  </>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {hasDirectional ? (
                  <>
                    <span className="font-semibold text-emerald-800">{peoplePct}% people</span>
                    {" · "}
                    <span className="font-semibold text-amber-900">{lpPct}% LP/speed</span>
                  </>
                ) : (
                  <span className="text-zinc-400">No directional codes</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CompareSynthesizersGrid({
  report,
  dims,
  trials,
  authorshipMode,
  synthesizers,
  highlight,
}: {
  report: NonNullable<(typeof CIVITAS_MORAL_BATCHES)[0]["report"]>;
  dims: readonly CivitasMoralDimension[];
  trials: number[];
  authorshipMode: CivitasAuthorshipMode;
  synthesizers: readonly CivitasMoralSynthesizer[];
  highlight?: CivitasMoralSynthesizer;
}) {
  const lastTi = trials.length - 1;
  const lastDim = dims[dims.length - 1];

  // Red box around a contiguous synthesizer block: outer edges only.
  const groupHeaderClass = (s: CivitasMoralSynthesizer) =>
    s === highlight
      ? "border-t-2 border-x-2 border-red-500 bg-red-50 px-2 py-2 text-center"
      : "border-l-[3px] border-zinc-400 px-2 py-2 text-center bg-zinc-50";

  const subHeaderClass = (s: CivitasMoralSynthesizer, ti: number) => {
    if (s === highlight) {
      const left = ti === 0 ? "border-l-2 border-red-500" : "border-l border-red-200";
      const right = ti === lastTi ? "border-r-2 border-red-500" : "";
      return `px-1 py-1 text-center text-[10px] font-medium text-zinc-500 bg-red-50 ${left} ${right}`;
    }
    return `px-1 py-1 text-center text-[10px] font-medium text-zinc-500 ${
      ti === 0 ? "border-l-[3px] border-zinc-400" : "border-l border-zinc-200"
    }`;
  };

  const cellClass = (s: CivitasMoralSynthesizer, ti: number, isLastRow: boolean) => {
    if (s === highlight) {
      const left = ti === 0 ? "border-l-2 border-red-500" : "border-l border-red-100";
      const right = ti === lastTi ? "border-r-2 border-red-500" : "";
      const bottom = isLastRow ? "border-b-2 border-red-500" : "";
      return `px-1 py-1 text-center bg-red-50/50 ${left} ${right} ${bottom}`;
    }
    return `px-1 py-1 text-center ${
      ti === 0 ? "border-l-[3px] border-zinc-400" : "border-l border-zinc-100"
    } bg-white`;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="sticky left-0 z-10 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
              Dimension
            </th>
            {synthesizers.map((s) => (
              <th key={s} colSpan={trials.length} className={groupHeaderClass(s)}>
                <div
                  className={`text-xs font-semibold ${
                    s === highlight ? "text-red-800" : "text-zinc-900"
                  }`}
                >
                  {CIVITAS_SYNTHESIZER_LABELS[s]}
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="sticky left-0 z-10 border-r border-zinc-300 bg-zinc-50 px-3 py-1" />
            {synthesizers.flatMap((s) =>
              trials.map((t, ti) => (
                <th key={`${s}-${t}`} className={subHeaderClass(s, ti)}>
                  {CIVITAS_TRIAL_LABELS[t]?.short ?? `T${t}`}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {dims.map((dim) => (
            <tr key={dim} className="border-t border-zinc-100">
              <th className="sticky left-0 z-10 border-r border-zinc-300 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-800 whitespace-nowrap">
                {CIVITAS_DIMENSION_LABELS[dim]}
              </th>
              {synthesizers.flatMap((s) =>
                trials.map((t, ti) => {
                  const item = itemFor(report, t, s, authorshipMode);
                  return (
                    <td key={`${s}-${t}-${dim}`} className={cellClass(s, ti, dim === lastDim)}>
                      <Chip dimension={dim} value={item?.codes?.[dim]} />
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SingleSynthesizerGrid({
  report,
  dims,
  trials,
  synthesizer,
  authorshipMode,
}: {
  report: NonNullable<(typeof CIVITAS_MORAL_BATCHES)[0]["report"]>;
  dims: readonly CivitasMoralDimension[];
  trials: number[];
  synthesizer: CivitasMoralSynthesizer;
  authorshipMode: CivitasAuthorshipMode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="sticky left-0 z-10 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
              Dimension
            </th>
            {trials.map((t) => (
              <th
                key={t}
                className={`border-l border-zinc-200 px-2 py-2 text-center ${
                  t % 2 === 0 ? "bg-slate-100/90" : "bg-zinc-50"
                }`}
              >
                <div className="text-xs font-semibold text-zinc-900">
                  {CIVITAS_TRIAL_LABELS[t]?.short}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dims.map((dim) => (
            <tr key={dim} className="border-t border-zinc-100">
              <th className="sticky left-0 z-10 border-r border-zinc-300 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-800 whitespace-nowrap">
                {CIVITAS_DIMENSION_LABELS[dim]}
              </th>
              {trials.map((t) => {
                const item = itemFor(report, t, synthesizer, authorshipMode);
                return (
                  <td
                    key={`${t}-${dim}`}
                    className={`px-1 py-1 text-center border-l border-zinc-100 ${
                      t % 2 === 0 ? "bg-slate-50/90" : "bg-white"
                    }`}
                  >
                    <Chip dimension={dim} value={item?.codes?.[dim]} />
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

export type CivitasMoralPanelProps = {
  dimensions?: CivitasMoralDimension[];
  trials?: number[];
  authorshipMode?: CivitasAuthorshipMode;
  /** Show all four synthesizers side-by-side (Blind authorship). */
  compareSynthesizers?: boolean;
  /** Override left-to-right synthesizer column order (compare grid only). */
  synthesizerOrder?: CivitasMoralSynthesizer[];
  /** Draw a red box around this synthesizer's columns (compare grid only). */
  highlight?: CivitasMoralSynthesizer;
  showLeanBars?: boolean;
  caption?: string;
};

export function CivitasMoralPanel({
  dimensions,
  trials: trialFilter,
  authorshipMode = "blind",
  compareSynthesizers = false,
  synthesizerOrder,
  highlight,
  showLeanBars = false,
  caption,
}: CivitasMoralPanelProps) {
  const batch = CIVITAS_MORAL_BATCHES[0];
  const report = batch?.report;

  const allTrials = useMemo(() => [1, 2, 3, 4, 5], []);
  const trials = trialFilter?.length ? trialFilter : allTrials;
  const synthesizers = synthesizerOrder?.length ? synthesizerOrder : CIVITAS_MORAL_SYNTHESIZERS;
  const dims = dimensions?.length
    ? CIVITAS_MORAL_DIMENSIONS.filter((d) => dimensions.includes(d))
    : CIVITAS_MORAL_DIMENSIONS;

  const leanShares = useMemo(
    () => (report ? leanSharesBySynthesizer(report) : []),
    [report]
  );

  if (!report || dims.length === 0) return null;

  return (
    <div className="space-y-4">
      {caption ? (
        <p className="text-[11px] leading-snug text-zinc-600">{caption}</p>
      ) : null}
      {!compareSynthesizers && !caption ? (
        <p className="text-xs text-zinc-500">
          Authorship:{" "}
          <span className="font-medium text-zinc-700">
            {CIVITAS_AUTHORSHIP_MODE_LABELS[authorshipMode]}
          </span>
        </p>
      ) : compareSynthesizers ? (
        <p className="text-xs text-zinc-500">
          Blind authorship · {CIVITAS_AUTHORSHIP_MODE_LABELS.blind}
        </p>
      ) : null}
      {showLeanBars ? <LeanBars shares={leanShares} /> : null}
      {compareSynthesizers ? (
        <CompareSynthesizersGrid
          report={report}
          dims={dims}
          trials={trials}
          authorshipMode={authorshipMode}
          synthesizers={synthesizers}
          highlight={highlight}
        />
      ) : (
        <SingleSynthesizerGrid
          report={report}
          dims={dims}
          trials={trials}
          synthesizer="openai"
          authorshipMode={authorshipMode}
        />
      )}
    </div>
  );
}
