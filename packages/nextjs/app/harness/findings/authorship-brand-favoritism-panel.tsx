import { AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT as SNAP } from "@/lib/authorship-brand-favoritism";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function AuthorshipBrandFavoritismPanel() {
  const labeled = ["openai", "anthropic", "gemini", "xai"] as const;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
          Committed snapshot
        </p>
        <h3 className="mt-1 text-base font-semibold text-zinc-900">{SNAP.title}</h3>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600">
          {SNAP.decisions} Unified Brief decisions × four authors. Peer credit excludes self-ratings.
          Reassigned cells use the stored brand remap (real member → label the author saw).{" "}
          {SNAP.rater_note}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Stat
            label="Grok · Revealed high"
            value={`${SNAP.grok_peer_high.revealed.high}/${SNAP.grok_peer_high.revealed.n}`}
            hint={`mean ${SNAP.grok_peer_high.revealed.mean}`}
          />
          <Stat
            label="Grok · Blind high"
            value={`${SNAP.grok_peer_high.blind.high}/${SNAP.grok_peer_high.blind.n}`}
            hint={`mean ${SNAP.grok_peer_high.blind.mean}`}
          />
          <Stat
            label="Grok · Reassigned high"
            value={`${SNAP.grok_peer_high.reassigned.high}/${SNAP.grok_peer_high.reassigned.n}`}
            hint={`mean ${SNAP.grok_peer_high.reassigned.mean}`}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">Credit for work labeled as…</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Reassigned only — each cell is some model&apos;s real work wearing that brand (
            {SNAP.remap_cells} ratings)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Shown as</th>
                <th className="px-4 py-2 font-medium">High ratings</th>
                <th className="px-4 py-2 font-medium">Mean (1–4)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {labeled.map((key) => {
                const row = SNAP.credit_when_labeled[key];
                const isGrok = key === "xai";
                return (
                  <tr key={key} className={isGrok ? "bg-rose-50/70" : undefined}>
                    <td className="px-4 py-3 font-medium text-zinc-800">{row.label}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {row.high}/{row.n}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">{row.mean}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">Grok&apos;s work wearing someone else&apos;s name</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Same real Grok contributions, remapped. ChatGPT as rater of Grok is the rivalry row
            below.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Grok shown as</th>
                <th className="px-4 py-2 font-medium">High ratings</th>
                <th className="px-4 py-2 font-medium">Mean</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(["openai", "anthropic", "gemini"] as const).map((key) => {
                const row = SNAP.grok_work_shown_as[key];
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 font-medium text-zinc-800">{row.label}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {row.high}/{row.n}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">{row.mean}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
          ChatGPT rating Grok: Revealed {SNAP.chatgpt_rates_grok.revealed.mean} (
          {SNAP.chatgpt_rates_grok.revealed.high}/{SNAP.chatgpt_rates_grok.revealed.n} high) · Blind{" "}
          {SNAP.chatgpt_rates_grok.blind.mean} ({SNAP.chatgpt_rates_grok.blind.high}/
          {SNAP.chatgpt_rates_grok.blind.n}) · Reassigned {SNAP.chatgpt_rates_grok.reassigned.mean} (
          {SNAP.chatgpt_rates_grok.reassigned.high}/{SNAP.chatgpt_rates_grok.reassigned.n}).
        </div>
      </section>
    </div>
  );
}
