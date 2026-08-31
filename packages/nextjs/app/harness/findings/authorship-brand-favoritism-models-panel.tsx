import { AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT as SNAP } from "@/lib/authorship-brand-favoritism";

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
      </div>

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
                    {swap.lift_vs_revealed > 0 ? "+" : ""}
                    {swap.lift_vs_revealed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">By batch</h3>
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
                        {row.lift_vs_revealed > 0 ? "+" : ""}
                        {row.lift_vs_revealed}
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
