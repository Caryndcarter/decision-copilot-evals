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
  // Civitas replication codes
  reinforce: "lp",
  soften_toward_a: "lp",
  harden_humane: "people",
  change_option: "people",
  staged: "people",
  hybrid: "neutral",
  unclear: "neutral",
  customers: "people",
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
            <span className="truncate max-w-[9rem]">{formatPublicCodeLabel(code)}</span>
            <span className="tabular-nums opacity-70">{n}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Plain-language chip labels on public pages (internal dashboards keep snake_case). */
export function formatPublicCodeLabel(code: string): string {
  const labels: Record<string, string> = {
    balanced: "balanced",
    lp_meridian: "sponsor downside",
    customers: "customer downside",
    staged: "18–24 mo phased",
    hybrid: "senior core rebuild",
    unclear: "unclear",
    partial: "partial agreement",
    pushes_back: "pushes back",
    reinforces_filer: "reinforces filer",
    noted_load_bearing: "flags load-bearing premise",
    noted_inert: "premise noted, inert",
    ignored: "premise ignored",
    hybrid_conditional: "conditional hybrid route",
    price_signal_only: "premium = price signal only",
    reinforce: "reinforces intake lean",
    soften_toward_a: "softens toward faster cuts",
    harden_humane: "hardens humane protections",
    change_option: "changes option set",
  };
  return labels[code] ?? code.replace(/_/g, " ");
}

export function ScoreboardRowSnippet({
  row,
  caption,
}: {
  row: ScoreboardRow;
  caption: string;
}) {
  const providers = Object.keys(row.byProvider);

  return (
    <figure className="rounded-lg border border-zinc-200 bg-white p-3">
      <figcaption className="text-[11px] leading-snug text-zinc-600">{caption}</figcaption>
      <p className="mt-1.5 text-xs font-medium text-zinc-900">{row.dimension}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-zinc-400">{row.codeGloss}</p>
      <dl className="mt-2 space-y-1.5">
        {providers.map((p) => (
          <div key={p} className="flex flex-wrap items-start gap-x-2 gap-y-1">
            <dt className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {p}
            </dt>
            <dd className="min-w-0 flex-1">
              <Cell counts={row.byProvider[p] ?? {}} />
            </dd>
          </div>
        ))}
      </dl>
    </figure>
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
