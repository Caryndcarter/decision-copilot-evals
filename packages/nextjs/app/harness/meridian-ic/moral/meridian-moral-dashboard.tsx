"use client";

import { useMemo, useState } from "react";
import {
  MERIDIAN_CASE_LABELS,
  MERIDIAN_DIMENSION_LABELS,
  MERIDIAN_MORAL_BATCHES,
  MERIDIAN_MORAL_DIMENSIONS,
  MERIDIAN_MORAL_PROVIDERS,
  MERIDIAN_PROVIDER_LABELS,
  itemFor,
  leanFor,
  providerLabel,
  type MeridianMoralBatch,
  type MeridianMoralDimension,
  type MeridianMoralItem,
  type MeridianMoralProvider,
} from "@/lib/meridian-ic-moral-display";

const LEAN_CHIP: Record<"people" | "lp" | "neutral", string> = {
  people: "bg-emerald-100 text-emerald-900 border-emerald-200",
  lp: "bg-amber-100 text-amber-950 border-amber-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function Chip({
  dimension,
  value,
  quote,
  onClick,
}: {
  dimension: MeridianMoralDimension;
  value: string | undefined;
  quote?: string;
  onClick?: () => void;
}) {
  const v = value ?? "—";
  const lean = leanFor(dimension, value);
  return (
    <button
      type="button"
      title={quote || undefined}
      onClick={onClick}
      className={`inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${LEAN_CHIP[lean]} hover:ring-1 hover:ring-indigo-300`}
    >
      <span className="truncate">{v.replace(/_/g, " ")}</span>
    </button>
  );
}

function DetailDrawer({
  item,
  onClose,
}: {
  item: MeridianMoralItem;
  onClose: () => void;
}) {
  const caseMeta = MERIDIAN_CASE_LABELS[item.case_index];
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
                {caseMeta?.short ?? `C${item.case_index}`} · {MERIDIAN_PROVIDER_LABELS[item.source_provider]}
              </p>
              <p className="mt-1 text-sm text-zinc-600">{caseMeta?.sub}</p>
            </div>
            <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800">
              Close
            </button>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          {MERIDIAN_MORAL_DIMENSIONS.map((dim) => {
            const value = item.codes?.[dim];
            const quote = item.quotes?.[dim];
            return (
              <div key={dim} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{MERIDIAN_DIMENSION_LABELS[dim]}</p>
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

export function MeridianMoralDashboard({ embedded = false }: { embedded?: boolean }) {
  const [batchId, setBatchId] = useState(MERIDIAN_MORAL_BATCHES[0]!.id);
  const [selected, setSelected] = useState<MeridianMoralItem | null>(null);

  const batch: MeridianMoralBatch =
    MERIDIAN_MORAL_BATCHES.find((b) => b.id === batchId) ?? MERIDIAN_MORAL_BATCHES[0]!;
  const report = batch.report;

  const summary = report.summary as Record<string, Record<string, Record<string, number>>>;

  const cases = useMemo(() => [1, 2, 3, 4, 5], []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Meridian IC moral eval</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-600">
              Blind structured coding of each provider&apos;s standard Decision Brief (5 cases × 4
              models). Green leans people/municipal protection; amber leans LP/speed; gray is mixed,
              silent, or n/a. Click a chip for the supporting quote.
            </p>
          </div>
        ) : (
          <p className="max-w-2xl text-sm text-zinc-600">
            Blind structured coding of each provider&apos;s standard Decision Brief. Green leans
            people/municipal protection; amber leans LP/speed. Click a chip for the quote.
          </p>
        )}
        <label className="text-sm text-zinc-600">
          Batch
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            {MERIDIAN_MORAL_BATCHES.map((b) => (
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
        cases {batch.casesVersion}
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                Dimension
              </th>
              {cases.map((c) => (
                <th key={c} colSpan={4} className="border-l border-zinc-200 px-2 py-2 text-center">
                  <div className="text-xs font-semibold text-zinc-900">{MERIDIAN_CASE_LABELS[c]?.short}</div>
                  <div className="text-[10px] font-normal text-zinc-500">{MERIDIAN_CASE_LABELS[c]?.sub}</div>
                </th>
              ))}
            </tr>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-1" />
              {cases.flatMap((c) =>
                MERIDIAN_MORAL_PROVIDERS.map((p) => (
                  <th
                    key={`${c}-${p}`}
                    className="border-l border-zinc-100 px-1 py-1 text-center text-[10px] font-medium text-zinc-500"
                  >
                    {MERIDIAN_PROVIDER_LABELS[p]}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {MERIDIAN_MORAL_DIMENSIONS.map((dim) => (
              <tr key={dim} className="border-t border-zinc-100">
                <th className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-800 whitespace-nowrap">
                  {MERIDIAN_DIMENSION_LABELS[dim]}
                </th>
                {cases.flatMap((c) =>
                  MERIDIAN_MORAL_PROVIDERS.map((p) => {
                    const item = itemFor(report, c, p);
                    return (
                      <td key={`${c}-${p}-${dim}`} className="border-l border-zinc-50 px-1 py-1 text-center">
                        <Chip
                          dimension={dim}
                          value={item?.codes?.[dim]}
                          quote={item?.quotes?.[dim]}
                          onClick={() => item && setSelected(item)}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <CountsTable title="Pace by provider" data={summary.pace_by_provider} />
        <CountsTable title="Pace by case" data={summary.pace_by_case} />
        <CountsTable title="Filer alignment by provider" data={summary.filer_alignment_by_provider} />
        <CountsTable title="Filer alignment by case" data={summary.filer_alignment_by_case} />
        <CountsTable title="Premise audit by case" data={summary.premise_audit_by_case} />
        <CountsTable title="Tradeoff honesty by provider" data={summary.tradeoff_honesty_by_provider} />
      </div>

      {selected ? <DetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
