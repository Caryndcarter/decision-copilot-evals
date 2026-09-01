import Link from "next/link";
import type { OverviewPublishedFinding } from "@/lib/model-studies-overview-findings";
import { FindingVisual } from "./finding-visual";

function studyLabel(sources: OverviewPublishedFinding["sources"]): string {
  return [...new Set(sources.map((s) => s.study))].join(" · ");
}

function caseLabel(sources: OverviewPublishedFinding["sources"]): string {
  return sources.map((s) => s.case).join(", ");
}

export function OverviewPublishedFindings({ findings }: { findings: OverviewPublishedFinding[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {findings.map((f) => (
        <article
          key={f.headline}
          className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
        >
          <FindingVisual theme={f.visualTheme} className="border-b border-zinc-100" />
          <div className="flex flex-1 flex-col p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
              {studyLabel(f.sources)}
            </p>
            <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:text-xl">
              {f.headline}
            </h3>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600">
              {f.body.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {f.whyItMatters ? (
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                <span className="font-semibold text-zinc-800">Why it matters:</span>{" "}
                {f.whyItMatters}
              </p>
            ) : null}
            <div className="mt-auto pt-5">
              <p className="text-xs font-medium text-zinc-500">
                Case: <span className="text-zinc-700">{caseLabel(f.sources)}</span>
              </p>
              <Link
                href={`/model-studies/findings/${f.slug}?from=overview`}
                className="mt-3 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Read the full finding →
              </Link>
              {f.compareWording ? (
                <Link
                  href={f.compareWording.href}
                  className="mt-2 block text-xs font-medium text-zinc-500 hover:text-indigo-700"
                >
                  {f.compareWording.label}
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
