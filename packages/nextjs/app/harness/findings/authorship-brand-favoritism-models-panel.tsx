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

function lift(n: number) {
  return `${n > 0 ? "+" : ""}${n}`;
}

export function AuthorshipBrandFavoritismModelsPanel() {
  const tk = SNAP.think_tank;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
          Model-id wording · same snapshot
        </p>
        <h3 className="mt-1 text-base font-semibold text-zinc-900">
          What label was slapped on whose Grok work
        </h3>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600">
          Constrained Civitas think-tank: {tk.constrained.xai}, {tk.constrained.openai},{" "}
          {tk.constrained.anthropic}, {tk.constrained.gemini}. Adequate-budget (Sol) think-tank:{" "}
          {tk.adequate.xai}, {tk.adequate.openai}, {tk.adequate.anthropic}, {tk.adequate.gemini}.
          Reassigned never left Grok labeled Grok — every remap sent it to one of the other three
          brands.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Stat
            label="grok-4.5 / 4.3 · Revealed high"
            value={`${SNAP.grok_peer_high.revealed.high}/${SNAP.grok_peer_high.revealed.n}`}
            hint={`mean ${SNAP.grok_peer_high.revealed.mean}`}
          />
          <Stat
            label="grok-4.5 / 4.3 · Blind high"
            value={`${SNAP.grok_peer_high.blind.high}/${SNAP.grok_peer_high.blind.n}`}
            hint={`mean ${SNAP.grok_peer_high.blind.mean}`}
          />
          <Stat
            label="grok-4.5 / 4.3 · Reassigned high"
            value={`${SNAP.grok_peer_high.reassigned.high}/${SNAP.grok_peer_high.reassigned.n}`}
            hint={`mean ${SNAP.grok_peer_high.reassigned.mean}`}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            Credit for work labeled as each model id
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Reassigned only — any real provider wearing that brand ({SNAP.remap_cells} ratings).
            Constrained / adequate ids shown together.
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
              {(
                [
                  ["openai", `${tk.adequate.openai} / ${tk.constrained.openai}`],
                  ["anthropic", `${tk.adequate.anthropic} / ${tk.constrained.anthropic}`],
                  ["gemini", tk.adequate.gemini],
                  ["xai", `${tk.adequate.xai} / ${tk.constrained.xai}`],
                ] as const
              ).map(([key, modelIds]) => {
                const row = SNAP.credit_when_labeled[key];
                const isGrok = key === "xai";
                return (
                  <tr key={key} className={isGrok ? "bg-rose-50/70" : undefined}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-800">{modelIds}</p>
                      <p className="text-[11px] text-zinc-500">{row.label}</p>
                    </td>
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
          <h3 className="text-sm font-semibold text-zinc-900">
            Real Grok work · remapped label · how often
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Not a one-off ChatGPT swap. Counts are rater × decision cells. Lift is reassigned minus
            Revealed on those same cells.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Swap</th>
                <th className="px-4 py-2 font-medium">Cells</th>
                <th className="px-4 py-2 font-medium">High</th>
                <th className="px-4 py-2 font-medium">Mean now / revealed</th>
                <th className="px-4 py-2 font-medium">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {SNAP.grok_swaps.map((swap) => (
                <tr key={swap.shown_as_key}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">
                      {swap.by_batch.adequate.real_model} / {swap.by_batch.constrained.real_model} →{" "}
                      {swap.by_batch.adequate.shown_as_model} / {swap.by_batch.constrained.shown_as_model}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {swap.unique_demos} demos · ChatGPT as rater on {swap.chatgpt_as_rater_n} of{" "}
                      {swap.n}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">{swap.n}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                    {swap.high}/{swap.n}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                    {swap.mean} / {swap.mean_revealed}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                    {lift(swap.lift_vs_revealed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
          {tk.adequate.openai} / {tk.constrained.openai} rating {tk.adequate.xai} / {tk.constrained.xai}:
          Revealed {SNAP.chatgpt_rates_grok.revealed.mean} (
          {SNAP.chatgpt_rates_grok.revealed.high}/{SNAP.chatgpt_rates_grok.revealed.n} high) · Blind{" "}
          {SNAP.chatgpt_rates_grok.blind.mean} ({SNAP.chatgpt_rates_grok.blind.high}/
          {SNAP.chatgpt_rates_grok.blind.n}) · Reassigned {SNAP.chatgpt_rates_grok.reassigned.mean} (
          {SNAP.chatgpt_rates_grok.reassigned.high}/{SNAP.chatgpt_rates_grok.reassigned.n}).
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">By batch</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Same real Grok generation wearing that batch&apos;s think-tank label.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Batch</th>
                <th className="px-4 py-2 font-medium">Real → shown as</th>
                <th className="px-4 py-2 font-medium">High</th>
                <th className="px-4 py-2 font-medium">Mean / revealed</th>
                <th className="px-4 py-2 font-medium">Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {SNAP.grok_swaps.flatMap((swap) =>
                (["adequate", "constrained"] as const).map((batch) => {
                  const row = swap.by_batch[batch];
                  return (
                    <tr key={`${swap.shown_as_key}-${batch}`}>
                      <td className="px-4 py-3 text-zinc-700">
                        {batch === "adequate" ? "adequate (Sol)" : "Civitas constrained"}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800">
                        {row.real_model} → {row.shown_as_model}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                        {row.high}/{row.n}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                        {row.mean} / {row.mean_revealed}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-700">
                        {lift(row.lift_vs_revealed)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
