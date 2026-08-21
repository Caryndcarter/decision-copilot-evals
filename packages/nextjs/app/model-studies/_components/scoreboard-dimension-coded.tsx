import type { ScoreboardRow } from "@/lib/findings-registry";

/**
 * Small, local lean map — intentionally not shared with the internal dashboards.
 * This file only ever sees the curated code values a study author put in the
 * registry, never raw per-item data, so it stays decoupled from anything that
 * carries quotes.
 */
const TONE: Record<string, "people" | "lp" | "neutral"> = {
  pushes_back: "people",
  partial: "neutral",
  reinforces_filer: "lp",
  noted_load_bearing: "people",
  noted_inert: "neutral",
  ignored: "lp",
  balanced: "neutral",
  lp_meridian: "lp",
  hybrid_conditional: "neutral",
  price_signal_only: "people",
};

const TONE_CLASS: Record<"people" | "lp" | "neutral", string> = {
  people: "bg-emerald-50 text-emerald-800 border-emerald-200",
  lp: "bg-amber-50 text-amber-900 border-amber-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function Cell({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return <span className="text-zinc-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([code, n]) => {
        const tone = TONE[code] ?? "neutral";
        return (
          <span
            key={code}
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${TONE_CLASS[tone]}`}
          >
            <span className="truncate max-w-[9rem]">{code.replace(/_/g, " ")}</span>
            <span className="tabular-nums opacity-70">{n}</span>
          </span>
        );
      })}
    </div>
  );
}

export function DimensionScoreboard({ rows }: { rows: ScoreboardRow[] }) {
  if (rows.length === 0) return null;
  const providers = Array.from(new Set(rows.flatMap((r) => Object.keys(r.byProvider))));

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Dimension
            </th>
            {providers.map((p) => (
              <th
                key={p}
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension} className="border-b border-zinc-100 last:border-0">
              <th scope="row" className="px-4 py-3 text-left align-top">
                <div className="text-sm font-medium text-zinc-900">{row.dimension}</div>
                <div className="mt-0.5 max-w-[14rem] text-[11px] leading-snug text-zinc-400">
                  {row.codeGloss}
                </div>
              </th>
              {providers.map((p) => (
                <td key={p} className="px-4 py-3 align-top">
                  <Cell counts={row.byProvider[p] ?? {}} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
