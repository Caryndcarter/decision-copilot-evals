"use client";

import { useMemo, useState } from "react";
import {
  CIVITAS_AUTHORSHIP_MODE_LABELS,
  CIVITAS_AUTHORSHIP_MODES,
  CIVITAS_DIMENSION_LABELS,
  CIVITAS_MORAL_BATCHES,
  CIVITAS_MORAL_DIMENSIONS,
  CIVITAS_MORAL_SYNTHESIZERS,
  CIVITAS_SYNTHESIZER_LABELS,
  CIVITAS_TRIAL_LABELS,
  itemFor,
  leanFor,
  leanSharesBySynthesizer,
  synthesizerLabel,
  type CivitasAuthorshipMode,
  type CivitasLeanShare,
  type CivitasMoralBatch,
  type CivitasMoralDimension,
  type CivitasMoralItem,
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
  quote,
  onClick,
}: {
  dimension: CivitasMoralDimension;
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
  item: CivitasMoralItem;
  onClose: () => void;
}) {
  const trialMeta = CIVITAS_TRIAL_LABELS[item.harness_trial];
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
                {trialMeta?.short ?? `Trial ${item.harness_trial}`} ·{" "}
                {CIVITAS_SYNTHESIZER_LABELS[item.synthesizer]} ·{" "}
                {CIVITAS_AUTHORSHIP_MODE_LABELS[item.authorship_mode]}
              </p>
              <p className="mt-1 text-sm text-zinc-600">Unified Brief · Civitas modernization</p>
            </div>
            <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800">
              Close
            </button>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          {CIVITAS_MORAL_DIMENSIONS.map((dim) => {
            const value = item.codes?.[dim];
            const quote = item.quotes?.[dim];
            return (
              <div key={dim} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{CIVITAS_DIMENSION_LABELS[dim]}</p>
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
            <div key={s.synthesizer} className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-3">
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
                {synthesizerLabel(g) !== g ? synthesizerLabel(g) : g}
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

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-sm text-zinc-600">
      <p className="font-semibold text-zinc-900">No Civitas replication moral batches committed yet</p>
      <p className="mt-2 max-w-2xl leading-relaxed">
        Run the Civitas replication harness, then blind-code Unified Briefs. After a report lands,
        copy the JSON into <code className="text-xs">packages/nextjs/data/civitas-moral/</code> and
        register it in <code className="text-xs">lib/civitas-moral-display.ts</code>.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 px-4 py-3 text-xs text-zinc-100">
{`npm run harness:civitas -- --user-email=you@example.com
npm run harness:civitas:moral -- --report=packages/nextjs/scripts/output/civitas-harness-….json`}
      </pre>
    </div>
  );
}

export function CivitasMoralDashboard({ embedded = false }: { embedded?: boolean }) {
  const hasBatches = CIVITAS_MORAL_BATCHES.length > 0;
  const [batchId, setBatchId] = useState(CIVITAS_MORAL_BATCHES[0]?.id ?? "");
  const [synthesizer, setSynthesizer] = useState<CivitasMoralSynthesizer>("openai");
  const [authorshipMode, setAuthorshipMode] = useState<CivitasAuthorshipMode>("open");
  const [selected, setSelected] = useState<CivitasMoralItem | null>(null);

  const batch: CivitasMoralBatch | undefined =
    CIVITAS_MORAL_BATCHES.find((b) => b.id === batchId) ?? CIVITAS_MORAL_BATCHES[0];
  const report = batch?.report;

  const summary = (report?.summary ?? {}) as Record<
    string,
    Record<string, Record<string, number>>
  >;

  const trials = useMemo(() => [1, 2, 3, 4, 5], []);
  const leanShares = useMemo(
    () => (report ? leanSharesBySynthesizer(report) : []),
    [report]
  );

  if (!hasBatches || !report || !batch) {
    return (
      <div className="space-y-6">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Civitas replication moral eval</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-600">
              Blind structured coding of Unified Briefs from the Civitas replication harness.
            </p>
          </div>
        ) : null}
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {!embedded ? (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Civitas replication moral eval</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-600">
              Blind structured coding of Unified Briefs (5 replication trials × 4 synthesizers × 3
              authorship modes). Green leans people/municipal protection; amber leans LP/speed.
              Click a chip for the supporting quote.
            </p>
          </div>
        ) : (
          <p className="max-w-2xl text-sm text-zinc-600">
            How to read the grid: blind coding of Civitas Unified Briefs across replication trials.
            Green leans people/municipal protection; amber leans LP/speed. Click a chip for the
            supporting quote.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-zinc-600">
            Batch
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            >
              {CIVITAS_MORAL_BATCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-600">
            Synthesizer
            <select
              value={synthesizer}
              onChange={(e) => setSynthesizer(e.target.value as CivitasMoralSynthesizer)}
              className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            >
              {CIVITAS_MORAL_SYNTHESIZERS.map((s) => (
                <option key={s} value={s}>
                  {CIVITAS_SYNTHESIZER_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-600">
            Authorship
            <select
              value={authorshipMode}
              onChange={(e) => setAuthorshipMode(e.target.value as CivitasAuthorshipMode)}
              className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            >
              {CIVITAS_AUTHORSHIP_MODES.map((m) => (
                <option key={m} value={m}>
                  {CIVITAS_AUTHORSHIP_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Judge: <span className="font-medium text-zinc-800">{synthesizerLabel(report.judge)}</span>
        {" · "}
        {report.summary.ok}/{report.summary.total_jobs} coded
        {" · "}
        5 trials × 4 synthesizers × 3 authorship modes
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
            {CIVITAS_MORAL_DIMENSIONS.map((dim) => (
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
                      <Chip
                        dimension={dim}
                        value={item?.codes?.[dim]}
                        quote={item?.quotes?.[dim]}
                        onClick={() => item && setSelected(item)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CountsTable title="Pace by synthesizer" data={summary.pace_by_synthesizer} />
        <CountsTable title="Pace by authorship mode" data={summary.pace_by_authorship_mode} />
        <CountsTable title="Risk bearer by synthesizer" data={summary.risk_bearer_by_synthesizer} />
        <CountsTable
          title="Speed vs humane by synthesizer"
          data={summary.speed_over_humane_by_synthesizer}
        />
        <CountsTable
          title="Vs intake lean by synthesizer"
          data={summary.leaning_pushback_by_synthesizer}
        />
      </div>

      {selected ? <DetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
