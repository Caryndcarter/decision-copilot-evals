import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { StatStrip } from "../_components/stat-strip";
import { CrossStudyFindingGrid } from "../_components/cross-study-finding-card";
import { ResultsCaseCard } from "../_components/results-case-card";
import { getCrossStudyFindings } from "@/lib/cross-study-findings";
import {
  RESULTS_STUDY_LABELS,
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
    "What changed when the facts stayed the same — cross-study findings and links to every case's blind-coded evidence.",
};

export default function ResultsPage() {
  const stats = getRollupStats();
  const crossStudyFindings = getCrossStudyFindings();
  const testTypes = getLiveTestTypes();
  const upcoming = getUpcomingStudies();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="bg-zinc-950 pt-16 pb-10 lg:pt-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-logo-light">Results</p>
            <h1 className="mt-3 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
              What changed when the facts stayed the same
            </h1>
            <p className="mt-5 text-base text-zinc-300 leading-relaxed">
              Browse the strongest findings across Model Studies, then open any study or case to examine
              the conditions, coded dimensions, and model-level results behind it.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 mt-10">
          <StatStrip stats={stats} />
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Cross-study findings</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Patterns that show up across cases — blind-coded evidence, not case names. Open any
            supporting case for full scoreboards and methodology.
          </p>
          <div className="mt-8">
            <CrossStudyFindingGrid findings={crossStudyFindings} />
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Browse by study</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Three research questions, each with one or more cases. Scoreboards and condition definitions
            live on the case pages — not here.
          </p>

          <div className="mt-10 space-y-14">
            {testTypes.map((type) => {
              const studies = getStudiesForType(type.id);
              const browse = RESULTS_STUDY_LABELS[type.id];
              const metricsLine = getResultsStudyMetricsLine(type.id);

              return (
                <div key={type.id} id={type.id} className="scroll-mt-20">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                    Study
                  </span>
                  <h3 className="mt-1 text-2xl font-bold text-zinc-900 tracking-tight">
                    {browse?.displayName ?? type.name}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-700 leading-relaxed">
                    {browse?.heroQuestion ?? type.heroQuestion}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">{metricsLine}</p>

                  {type.id === "authorship" ? (
                    <div className="mt-6 space-y-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Published
                        </p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          {studies
                            .filter((s) => s.id === "authorship-budget-conditions")
                            .map((study) => (
                              <ResultsCaseCard key={study.id} study={study} />
                            ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Ongoing
                        </p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          {studies
                            .filter((s) => s.id === "multi-demo-authorship")
                            .map((study) => (
                              <ResultsCaseCard key={study.id} study={study} />
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {studies.map((study) => (
                        <ResultsCaseCard key={study.id} study={study} />
                      ))}
                    </div>
                  )}
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
