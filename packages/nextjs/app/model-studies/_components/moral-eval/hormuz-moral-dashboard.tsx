"use client";

import { useMemo, useState } from "react";
import {
  HORMUZ_CASE_LABELS,
  HORMUZ_DIMENSION_LABELS,
  HORMUZ_MORAL_BATCHES,
  HORMUZ_MORAL_DIMENSIONS,
  HORMUZ_MORAL_PROVIDERS,
  HORMUZ_PROVIDER_LABELS,
  itemFor,
  leanFor,
  leanSharesByProvider,
  providerLabel,
  type HormuzLeanShare,
  type HormuzMoralBatch,
  type HormuzMoralDimension,
  type HormuzMoralItem,
} from "@/lib/hormuz-moral-display";

const LEAN_CHIP: Record<"crew" | "commercial" | "neutral", string> = {
  crew: "bg-emerald-100 text-emerald-900 border-emerald-200",
  commercial: "bg-amber-100 text-amber-950 border-amber-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function Chip({
  dimension,
  value,
  quote,
  onClick,
}: {
  dimension: HormuzMoralDimension;
  value: string | undefined;
  quote?: string;
  onClick?: () => void;
}) {
  const v = value ?? "—";
  const lean = leanFor(dimension, value);
  const className = `inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${LEAN_CHIP[lean]}${onClick ? " hover:ring-1 hover:ring-indigo-300" : ""}`;

  if (!onClick) {
    return (
      <span title={quote || undefined} className={className}>
        <span className="truncate">{v.replace(/_/g, " ")}</span>
      </span>
    );
  }

  return (
    <button type="button" title={quote || undefined} onClick={onClick} className={className}>
      <span className="truncate">{v.replace(/_/g, " ")}</span>
    </button>
  );
}

function DetailDrawer({
  item,
  onClose,
}: {
  item: HormuzMoralItem;
  onClose: () => void;
}) {
  const caseMeta = HORMUZ_CASE_LABELS[item.case_index];
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                {caseMeta?.short ?? `C${item.case_index}`} ·{" "}
                {HORMUZ_PROVIDER_LABELS[item.source_provider]}
              </p>
              <p className="mt-1 text-sm text-zinc-600">{caseMeta?.sub}</p>
            </div>
            <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800">
              Close
            </button>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          {HORMUZ_MORAL_DIMENSIONS.map((dim) => {
            const value = item.codes?.[dim];
            const quote = item.quotes?.[dim];
            return (
              <div key={dim} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{HORMUZ_DIMENSION_LABELS[dim]}</p>
                  <Chip dimension={dim} value={value} />
                </div>
                {quote ? (
                  <blockquote className="mt-2 border-l-2 border-zinc-200 pl-3 text-sm italic text-zinc-600">
                    “{quote}”
                  </blockquote>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function LeanBars({ shares }: { shares: HormuzLeanShare[] }) {
  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Directional lean by model</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Share of crew-protective vs commercial-continuity codes across all dimensions × cases.
          Neutral codes (silent, unclear, balanced, filer alignment, etc.) are excluded from the %.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shares.map((s) => {
          const crewPct = s.crewPct ?? 0;
          const commercialPct = s.commercialPct ?? 0;
          const hasDirectional = s.crew + s.commercial > 0;
          return (
            <div key={s.provider} className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-3">
              <p className="text-sm font-semibold text-zinc-900">
                {HORMUZ_PROVIDER_LABELS[s.provider]}
              </p>
              <div
                className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-zinc-200"
                role="img"
                aria-label={
                  hasDirectional
                    ? `${crewPct}% crew, ${commercialPct}% commercial`
                    : "No directional codes"
                }
              >
                {hasDirectional ? (
                  <>
                    <span
                      className="bg-emerald-600"
                      style={{ width: `${crewPct}%` }}
                      title={`${s.crew} crew`}
                    />
                    <span
                      className="bg-amber-600"
                      style={{ width: `${commercialPct}%` }}
                      title={`${s.commercial} commercial`}
                    />
                  </>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {hasDirectional ? (
                  <>
                    <span className="font-semibold text-emerald-800">{crewPct}% crew</span>
                    {" · "}
                    <span className="font-semibold text-amber-900">{commercialPct}% commercial</span>
                  </>
                ) : (
                  <span className="text-zinc-400">No directional codes</span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {s.crew} vs {s.commercial} directional
                {s.neutral > 0 ? ` · ${s.neutral} neutral` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CountsTable({
  title,
  data,
}: {
  title: string;
  data: Record<string, Record<string, number>> | undefined;
}) {
  if (!data || Object.keys(data).length === 0) return null;
  const groups = Object.keys(data).sort();
  const values = [...new Set(groups.flatMap((g) => Object.keys(data[g] ?? {})))].sort();
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <p className="border-b border-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-800">{title}</p>
      <table className="min-w-full text-left text-xs">
        <thead className="bg-zinc-50 text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Group</th>
            {values.map((v) => (
              <th key={v} className="px-3 py-2 font-medium whitespace-nowrap">
                {v.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g} className="border-t border-zinc-100">
              <td className="px-3 py-2 font-medium text-zinc-800 whitespace-nowrap">
                {providerLabel(g) !== g ? providerLabel(g) : g}
              </td>
              {values.map((v) => (
                <td key={v} className="px-3 py-2 tabular-nums text-zinc-600">
                  {data[g]?.[v] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Copied from harness Findings — do not edit the harness original; edit here for Model Studies. */
export function HormuzMoralDashboard({
  embedded = false,
  gridOnly = false,
  dimensions,
  cases: caseFilter,
}: {
  embedded?: boolean;
  /** Dimension × cases grid only — no lean bars, counts, or chrome. */
  gridOnly?: boolean;
  dimensions?: HormuzMoralDimension[];
  cases?: number[];
}) {
  const hasBatches = HORMUZ_MORAL_BATCHES.length > 0;
  const [batchId, setBatchId] = useState(HORMUZ_MORAL_BATCHES[0]?.id ?? "");
  const [selected, setSelected] = useState<HormuzMoralItem | null>(null);

  const batch: HormuzMoralBatch | undefined =
    HORMUZ_MORAL_BATCHES.find((b) => b.id === batchId) ?? HORMUZ_MORAL_BATCHES[0];
  const report = batch?.report;

  const summary = (report?.summary ?? {}) as Record<
    string,
    Record<string, Record<string, number>>
  >;

  const allCases = useMemo(() => [1, 2, 3, 4, 5], []);
  const cases = caseFilter?.length ? caseFilter : allCases;
  const dims = dimensions?.length
    ? HORMUZ_MORAL_DIMENSIONS.filter((d) => dimensions.includes(d))
    : HORMUZ_MORAL_DIMENSIONS;
  const leanShares = useMemo(
    () => (report ? leanSharesByProvider(report) : []),
    [report]
  );

  if (!hasBatches || !report || !batch || dims.length === 0) {
    return null;
  }

  const equalCaseWidths = caseFilter !== undefined && caseFilter.length > 0;
  const dimColRem = 14;
  const providerColRem = 8;
  const tableWidthRem =
    dimColRem + cases.length * HORMUZ_MORAL_PROVIDERS.length * providerColRem;
  const stickyDimStyle = equalCaseWidths
    ? { width: `${dimColRem}rem`, minWidth: `${dimColRem}rem`, maxWidth: `${dimColRem}rem` }
    : undefined;
  const stickyDimRowLabelClass = equalCaseWidths
    ? "whitespace-normal leading-snug align-top"
    : "whitespace-nowrap";

  const dimensionGrid = (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table
        className={`border-collapse text-left ${equalCaseWidths ? "table-fixed" : "min-w-full"}`}
        style={equalCaseWidths ? { width: `${tableWidthRem}rem` } : undefined}
      >
        {equalCaseWidths ? (
          <colgroup>
            <col style={{ width: `${dimColRem}rem` }} />
            {cases.flatMap((c) =>
              HORMUZ_MORAL_PROVIDERS.map((p) => (
                <col key={`${c}-${p}`} style={{ width: `${providerColRem}rem` }} />
              ))
            )}
          </colgroup>
        ) : null}
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th
              className="sticky left-0 z-20 border-r border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600"
              style={stickyDimStyle}
            >
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
                  {HORMUZ_CASE_LABELS[c]?.short}
                </div>
                <div className="text-[10px] font-normal text-zinc-500">
                  {HORMUZ_CASE_LABELS[c]?.sub}
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th
              className="sticky left-0 z-20 border-r border-zinc-300 bg-zinc-50 px-3 py-1"
              style={stickyDimStyle}
            />
            {cases.flatMap((c) =>
              HORMUZ_MORAL_PROVIDERS.map((p, pi) => (
                <th
                  key={`${c}-${p}`}
                  className={`px-1 py-1 text-center text-[10px] font-medium text-zinc-500 ${
                    pi === 0 ? "border-l-[3px] border-zinc-400" : "border-l border-zinc-200"
                  } ${c % 2 === 0 ? "bg-slate-100/90" : "bg-zinc-50"}`}
                >
                  {HORMUZ_PROVIDER_LABELS[p]}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {dims.map((dim) => (
            <tr key={dim} className="border-t border-zinc-100">
              <th
                className={`sticky left-0 z-20 border-r border-zinc-300 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-800 ${stickyDimRowLabelClass}`}
                style={stickyDimStyle}
              >
                {HORMUZ_DIMENSION_LABELS[dim]}
              </th>
              {cases.flatMap((c) =>
                HORMUZ_MORAL_PROVIDERS.map((p, pi) => {
                  const item = itemFor(report, c, p);
                  return (
                    <td
                      key={`${c}-${p}-${dim}`}
                      className={`px-1 py-1 text-center ${
                        pi === 0 ? "border-l-[3px] border-zinc-400" : "border-l border-zinc-100"
                      } ${c % 2 === 0 ? "bg-slate-50/90" : "bg-white"}`}
                    >
                      <Chip
                        dimension={dim}
                        value={item?.codes?.[dim]}
                        quote={item?.quotes?.[dim]}
                        onClick={
                          gridOnly ? undefined : () => item && setSelected(item)
                        }
                      />
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

  if (gridOnly) {
    return dimensionGrid;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Meran Tankers moral eval</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-600">
              Blind structured coding of each provider&apos;s standard Decision Brief (5 cases × 4
              models). Green leans crew/people protection; amber leans commercial continuity; gray
              is mixed, silent, or n/a. Click a chip for the supporting quote.
            </p>
          </div>
        ) : (
          <p className="max-w-2xl text-sm text-zinc-600">
            How to read the grid: blind coding of Meran Tankers Decision Briefs. Green leans crew
            protection; amber leans commercial continuity. Click a chip for the supporting quote.
          </p>
        )}
        <label className="text-sm text-zinc-600">
          Batch
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            {HORMUZ_MORAL_BATCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-zinc-500">
        Judge: <span className="font-medium text-zinc-800">{providerLabel(report.judge)}</span>
        {" · "}
        {report.summary.ok}/{report.summary.total_jobs} coded
        {" · "}
        {new Date(report.generated_at).toLocaleString()}
      </p>

      {report.notes && report.notes.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600">
          {report.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <LeanBars shares={leanShares} />

      {dimensionGrid}

      <div className="grid gap-4 lg:grid-cols-2">
        <CountsTable title="Route by provider" data={summary.route_choice_by_provider} />
        <CountsTable title="Route by case" data={summary.route_choice_by_case} />
        <CountsTable
          title="Filer alignment by provider"
          data={summary.filer_alignment_by_provider}
        />
        <CountsTable title="Filer alignment by case" data={summary.filer_alignment_by_case} />
        <CountsTable title="Crew recenter by case" data={summary.crew_recenter_by_case} />
        <CountsTable
          title="Survivorship check by case"
          data={summary.survivorship_check_by_case}
        />
        <CountsTable title="Premise audit by case" data={summary.premise_audit_by_case} />
        <CountsTable
          title="Tradeoff honesty by provider"
          data={summary.tradeoff_honesty_by_provider}
        />
      </div>

      {selected ? <DetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
