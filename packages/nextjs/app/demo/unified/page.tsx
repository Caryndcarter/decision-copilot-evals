import Link from "next/link";
import { CollapsibleBlock } from "@/app/run/collapsible-block";
import { DEMO_UNIFIED_BRIEF } from "@/app/demo/_data/vp-sales-fixtures";
import { TOUR_DISAGREEMENTS, TOUR_UNIFIED_BRIEF } from "@/app/tour/_data/tour-demo-data";
import { runProviderLabel } from "@/lib/run-display-name";

export default function DemoUnifiedPage() {
  return (
    <>
      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Unified Brief</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-900">{DEMO_UNIFIED_BRIEF.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Synthesized across all four models in your think tank (demo).
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
        {TOUR_DISAGREEMENTS.map((d) => (
          <CollapsibleBlock key={d.label} title={d.label} defaultOpen>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4 font-medium">Model</th>
                    <th className="py-2 font-medium">Stance</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((row) => (
                    <tr key={row.provider} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-zinc-800">
                        {runProviderLabel(row.provider)}
                      </td>
                      <td className="py-2.5 text-zinc-700">{row.stance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleBlock>
        ))}

        <CollapsibleBlock title="Synthesized recommendation" defaultOpen>
          <p className="text-sm leading-relaxed text-zinc-700">{DEMO_UNIFIED_BRIEF.summary}</p>
          <p className="mt-4 text-sm font-medium text-zinc-900">Recommendation</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">{DEMO_UNIFIED_BRIEF.recommendation}</p>
          <p className="mt-4 text-sm font-medium text-zinc-900">Key considerations</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {DEMO_UNIFIED_BRIEF.key_considerations.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium text-zinc-900">Next steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {DEMO_UNIFIED_BRIEF.next_steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Contributions</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {TOUR_UNIFIED_BRIEF.contributions.map((c) => (
              <li key={c.provider}>
                <span className="font-medium">{runProviderLabel(c.provider)}</span> — {c.note}
              </li>
            ))}
          </ul>
        </CollapsibleBlock>
      </div>

      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-6 py-6">
        <Link href="/demo/result?provider=openai" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Individual model results
        </Link>
        <Link
          href="/request-access"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Request access
        </Link>
      </div>
    </>
  );
}
