import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { StatStrip } from "../_components/stat-strip";
import { MajorFindingDeck } from "../_components/major-finding-deck";
import { MajorFindingEvidenceSections } from "../_components/major-finding-snippet";
import { ResultsCaseTable } from "../_components/results-case-table";
import { getMajorFindings } from "@/lib/cross-study-findings";
import {
  getResultsStudyMetricsLine,
} from "@/lib/results-browse-meta";
import {
  getLiveTestTypes,
  getRollupStats,
  getStudiesForType,
  getUpcomingStudies,
} from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "Results — Model Studies",
  description:
    "Blind-coded counts and case index — headline patterns and numeric rollups across Model Studies.",
};

export default function ResultsPage() {
  const stats = getRollupStats();
  const majorFindings = getMajorFindings();
  const testTypes = getLiveTestTypes();
  const upcoming = getUpcomingStudies();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="relative overflow-hidden bg-zinc-950 pt-20 pb-16 lg:pt-24 lg:pb-20">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-logo/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-logo-light">Results</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white leading-tight sm:text-4xl lg:text-5xl">
              What changed when the facts stayed the same
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-zinc-300">
              Aggregate counts and headline patterns from blind-coded briefs — open any case row for
              full scoreboards, dimensions, and methodology.
            </p>
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl px-6 mt-14">
          <StatStrip stats={stats} />
        </div>
      </section>

      <section className="bg-white py-14 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Major findings</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Four headline patterns. Each pairs the story with the coded counts — step through them
            rather than reading four charts at once.
          </p>
          <div className="mt-8">
            <MajorFindingDeck findings={majorFindings} />
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 py-14 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">From the coded batch</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Curated moral-eval dimension slices behind each major finding — green/amber chips from
            blind coding, matching the grids on case pages.
          </p>
          <div className="mt-6">
            <MajorFindingEvidenceSections findings={majorFindings} />
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Case index</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Every published case by study — conditions, model count, coded outputs, and one headline
            result per row. Scoreboards live on the case pages.
          </p>

          <div className="mt-10 space-y-14">
            {testTypes.map((type) => {
              const studies = getStudiesForType(type.id);
              const metricsLine = getResultsStudyMetricsLine(type.id);

              return (
                <div key={type.id} id={type.id} className="scroll-mt-20">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                    {type.eyebrow}
                  </span>
                  <h3 className="mt-1 text-2xl font-bold text-zinc-900 tracking-tight">
                    {type.name}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-700 leading-relaxed">
                    {type.heroQuestion}
                  </p>
                  <p className="mt-2 text-xs tabular-nums text-zinc-500">{metricsLine}</p>

                  <div className="mt-4">
                    <ResultsCaseTable studies={studies} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">In development</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5"
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                    {s.eyebrow}
                  </span>
                  <h3 className="mt-1.5 text-sm font-semibold text-zinc-700">{s.name}</h3>
                  <p className="mt-1.5 text-sm text-zinc-500">{s.dek}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
