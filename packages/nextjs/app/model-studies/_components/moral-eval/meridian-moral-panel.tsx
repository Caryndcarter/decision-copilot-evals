"use client";

import { useMemo } from "react";
import {
  MERIDIAN_CASE_LABELS,
  MERIDIAN_DIMENSION_LABELS,
  MERIDIAN_MORAL_BATCHES,
  MERIDIAN_MORAL_DIMENSIONS,
  MERIDIAN_MORAL_PROVIDERS,
  MERIDIAN_PROVIDER_LABELS,
  itemFor,
  leanFor,
  leanSharesByProvider,
  type MeridianLeanShare,
  type MeridianMoralDimension,
} from "@/lib/meridian-ic-moral-display";

const LEAN_CHIP: Record<"people" | "lp" | "neutral", string> = {
  people: "bg-emerald-100 text-emerald-900 border-emerald-200",
  lp: "bg-amber-100 text-amber-950 border-amber-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function Chip({
  dimension,
  value,
}: {
  dimension: MeridianMoralDimension;
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

function LeanBars({ shares }: { shares: MeridianLeanShare[] }) {
  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Directional lean by model</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Share of people/customer-protective vs LP/PE-protective codes across all dimensions × cases.
          Neutral codes (silent, unclear, balanced, filer alignment, etc.) are excluded from the %.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shares.map((s) => {
          const peoplePct = s.peoplePct ?? 0;
          const lpPct = s.lpPct ?? 0;
          const hasDirectional = s.people + s.lp > 0;
          return (
            <div key={s.provider} className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-3">
              <p className="text-sm font-semibold text-zinc-900">
                {MERIDIAN_PROVIDER_LABELS[s.provider]}
              </p>
              <div
                className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-zinc-200"
                role="img"
                aria-label={
                  hasDirectional
                    ? `${peoplePct}% people/customer, ${lpPct}% LP/PE`
                    : "No directional codes"
                }
              >
                {hasDirectional ? (
                  <>
                    <span
                      className="bg-emerald-600"
                      style={{ width: `${peoplePct}%` }}
                      title={`${s.people} people/customer`}
                    />
                    <span
                      className="bg-amber-600"
                      style={{ width: `${lpPct}%` }}
                      title={`${s.lp} LP/PE`}
                    />
                  </>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {hasDirectional ? (
                  <>
                    <span className="font-semibold text-emerald-800">{peoplePct}% people/customer</span>
                    {" · "}
                    <span className="font-semibold text-amber-900">{lpPct}% LP/PE</span>
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

export type MeridianMoralPanelProps = {
  dimensions?: MeridianMoralDimension[];
  cases?: number[];
  showLeanBars?: boolean;
  caption?: string;
};

export function MeridianMoralPanel({
  dimensions,
  cases: caseFilter,
  showLeanBars = false,
  caption,
}: MeridianMoralPanelProps) {
  const batch = MERIDIAN_MORAL_BATCHES[0];
  const report = batch?.report;

  const allCases = useMemo(() => [1, 2, 3, 4, 5], []);
  const cases = caseFilter?.length ? caseFilter : allCases;
  const dims = dimensions?.length
    ? MERIDIAN_MORAL_DIMENSIONS.filter((d) => dimensions.includes(d))
    : MERIDIAN_MORAL_DIMENSIONS;

  const leanShares = useMemo(() => (report ? leanSharesByProvider(report) : []), [report]);

  if (!report || dims.length === 0) return null;

  return (
    <div className="space-y-4">
      {caption ? (
        <p className="text-[11px] leading-snug text-zinc-600">{caption}</p>
      ) : null}
      {showLeanBars ? <LeanBars shares={leanShares} /> : null}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="sticky left-0 z-10 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                Dimension
              </th>
              {cases.map((c) => (
                <th
                  key={c}
                  colSpan={4}
                  className={`border-l-[3px] border-zinc-400 px-2 py-2 text-center ${
                    c % 2 === 0 ? "bg-slate-100/90" : "bg-zinc-50"
                  }`}
                >
                  <div className="text-xs font-semibold text-zinc-900">
                    {MERIDIAN_CASE_LABELS[c]?.short}
                  </div>
                  <div className="text-[10px] font-normal text-zinc-500">
                    {MERIDIAN_CASE_LABELS[c]?.sub}
                  </div>
                </th>
              ))}
            </tr>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="sticky left-0 z-10 border-r border-zinc-300 bg-zinc-50 px-3 py-1" />
              {cases.flatMap((c) =>
                MERIDIAN_MORAL_PROVIDERS.map((p, pi) => (
                  <th
                    key={`${c}-${p}`}
                    className={`px-1 py-1 text-center text-[10px] font-medium text-zinc-500 ${
                      pi === 0 ? "border-l-[3px] border-zinc-400" : "border-l border-zinc-200"
                    } ${c % 2 === 0 ? "bg-slate-100/90" : "bg-zinc-50"}`}
                  >
                    {MERIDIAN_PROVIDER_LABELS[p]}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {dims.map((dim) => (
              <tr key={dim} className="border-t border-zinc-100">
                <th className="sticky left-0 z-10 border-r border-zinc-300 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-800 whitespace-nowrap">
                  {MERIDIAN_DIMENSION_LABELS[dim]}
                </th>
                {cases.flatMap((c) =>
                  MERIDIAN_MORAL_PROVIDERS.map((p, pi) => {
                    const item = itemFor(report, c, p);
                    return (
                      <td
                        key={`${c}-${p}-${dim}`}
                        className={`px-1 py-1 text-center ${
                          pi === 0 ? "border-l-[3px] border-zinc-400" : "border-l border-zinc-100"
                        } ${c % 2 === 0 ? "bg-slate-50/90" : "bg-white"}`}
                      >
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
    </div>
  );
}
