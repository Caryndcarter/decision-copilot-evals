import { AUTHORSHIP_BRAND_FAVORITISM_SNAPSHOT as SNAP } from "@/lib/authorship-brand-favoritism";
import { Donut, DonutLegend, DONUT_COLORS, type DonutSegment } from "./rating-donut";

const MODES = [
  { key: "revealed", label: "Revealed", sub: "named Grok" },
  { key: "blind", label: "Blind", sub: "no brands" },
  { key: "reassigned", label: "Reassigned", sub: "another name" },
] as const;

/**
 * One rating slot spans every rater on every decision. Removing the author's own
 * self-rating is what turns that 40 into the 30 peer ratings the finding quotes.
 */
function ratingUniverse() {
  const selfRatings = SNAP.decisions;
  const peerRatings = SNAP.peer_ratings_per_mode;
  return { selfRatings, peerRatings, total: peerRatings + selfRatings };
}

export function AuthorshipBrandFavoritismPanel() {
  const labeled = ["openai", "anthropic", "gemini", "xai"] as const;
  const { selfRatings, peerRatings, total } = ratingUniverse();
  const raters = total / SNAP.decisions;

  const remapSegments: DonutSegment[] = SNAP.grok_swaps.map((swap) => ({
    label: swap.label,
    value: swap.n,
    color:
      swap.shown_as_key === "openai"
        ? DONUT_COLORS.shownAsOpenai
        : swap.shown_as_key === "anthropic"
          ? DONUT_COLORS.shownAsAnthropic
          : DONUT_COLORS.shownAsGemini,
  }));
  const remapTotal = remapSegments.reduce((sum, s) => sum + s.value, 0);

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
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
            Reading the denominators
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">
            Any one contribution gets <strong>{total} ratings</strong> — {SNAP.decisions} decisions ×{" "}
            {raters} raters. Drop the {selfRatings} where the author rates itself and{" "}
            <strong>{peerRatings} peer ratings</strong> remain. Every chart below is a cut of that{" "}
            {total}.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            Grok&apos;s work, rated by peers — same work, three name conditions
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Each ring is all {total} ratings of Grok&apos;s contribution in that mode. The grey wedge
            is Grok rating itself, which peer credit leaves out.
          </p>
        </div>
        <div className="grid gap-4 px-4 py-5 sm:grid-cols-3">
          {MODES.map((mode) => {
            const row = SNAP.grok_peer_high[mode.key];
            const segments: DonutSegment[] = [
              { label: "Peers rated high", value: row.high, color: DONUT_COLORS.peerHigh },
              {
                label: "Peers rated lower",
                value: row.n - row.high,
                color: DONUT_COLORS.peerRest,
              },
              {
                label: "Grok rating itself (excluded)",
                value: selfRatings,
                color: DONUT_COLORS.selfExcluded,
              },
            ];
            return (
              <figure key={mode.key} className="flex flex-col items-center">
                <Donut
                  segments={segments}
                  total={total}
                  centerValue={`${row.high}/${row.n}`}
                  centerLabel="peers rated high"
                />
                <figcaption className="mt-1 text-center">
                  <p className="text-sm font-semibold text-zinc-900">{mode.label}</p>
                  <p className="text-xs text-zinc-500">
                    {mode.sub} · mean {row.mean}
                  </p>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <div className="border-t border-zinc-100 px-4 py-3">
          <DonutLegend
            items={[
              { label: "Peers rated high", color: DONUT_COLORS.peerHigh },
              { label: "Peers rated lower", color: DONUT_COLORS.peerRest },
              {
                label: `Grok rating itself — excluded (${selfRatings} per mode)`,
                color: DONUT_COLORS.selfExcluded,
              },
            ]}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">Credit for work labeled as…</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Reassigned only — each cell is some model&apos;s real work wearing that brand. Every row
            is its own {total} ratings, ranked by the label the rater saw rather than by who wrote
            it.
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
        <div className="flex flex-col items-center gap-5 border-b border-zinc-100 px-4 py-5 sm:flex-row sm:items-center sm:gap-8">
          <Donut
            segments={remapSegments}
            total={remapTotal}
            centerValue={`${remapTotal}`}
            centerLabel="Grok cells"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-zinc-700">
              In Reassigned, Grok&apos;s work never stayed labeled Grok. All {remapTotal} of its
              rating cells were split across the three borrowed names — which is where the uneven{" "}
              {SNAP.grok_swaps.map((s) => s.n).join(" / ")} denominators come from.
            </p>
            <div className="mt-3">
              <DonutLegend
                items={SNAP.grok_swaps.map((swap, i) => ({
                  label: `Shown as ${swap.label}`,
                  value: swap.n,
                  color: remapSegments[i].color,
                }))}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Gemini drew fewer swaps than the other two, so those rates are not equal-sample
              comparisons.
            </p>
          </div>
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
