import Link from "next/link";
import type { CrossStudyFinding } from "@/lib/cross-study-findings";

function EvidenceBars({ finding }: { finding: CrossStudyFinding }) {
  return (
    <figure className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <figcaption className="text-xs font-medium text-zinc-700">{finding.evidenceCaption}</figcaption>
      <ul className="mt-3 space-y-2.5" aria-label={finding.evidenceCaption}>
        {finding.bars.map((bar) => {
          const pct = bar.max > 0 ? Math.round((bar.value / bar.max) * 100) : 0;
          return (
            <li key={bar.label}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className={bar.highlight ? "font-medium text-indigo-900" : "text-zinc-600"}>
                  {bar.label}
                </span>
                <span className="tabular-nums text-zinc-500">
                  {bar.value}/{bar.max}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full ${bar.highlight ? "bg-indigo-500" : "bg-zinc-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">{finding.evidenceSummary}</p>
    </figure>
  );
}

export function CrossStudyFindingCard({ finding }: { finding: CrossStudyFinding }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold leading-snug text-zinc-900">{finding.headline}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">{finding.conclusion}</p>

      <div className="mt-5">
        <EvidenceBars finding={finding} />
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Decision contexts</dt>
          <dd className="mt-1 leading-relaxed text-zinc-600">{finding.contexts}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Why it matters</dt>
          <dd className="mt-1 leading-relaxed text-zinc-600">{finding.whyItMatters}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
        <span className="self-center text-xs font-medium text-zinc-500">Supporting cases:</span>
        {finding.supportingCases.map((c) => (
          <Link
            key={c.studyId}
            href={`/model-studies/results/${c.studyId}`}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
          >
            {c.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

export function CrossStudyFindingGrid({ findings }: { findings: CrossStudyFinding[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-1">
      {findings.map((f) => (
        <CrossStudyFindingCard key={f.id} finding={f} />
      ))}
    </div>
  );
}
