import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { StatStrip } from "../_components/stat-strip";
import { RollupFindingGrid } from "../_components/rollup-finding-card";
import { AuthorshipBudgetConditionsPanel } from "@/app/harness/findings/authorship-budget-conditions-panel";
import { DimensionScoreboard } from "../_components/scoreboard-dimension-coded";
import { InfluenceMatrixPlaceholder } from "../_components/scoreboard-influence-matrix";
import {
  getLiveTestTypes,
  getRollupStats,
  getRollupStatsForType,
  getStandoutFindings,
  getStudiesForType,
  getUpcomingStudies,
} from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "Results — Model Studies",
  description: "Every study, every finding — the full rollup of blind-coded model behavior.",
};

export default function ResultsPage() {
  const stats = getRollupStats();
  const standout = getStandoutFindings();
  const testTypes = getLiveTestTypes();
  const upcoming = getUpcomingStudies();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="bg-zinc-950 pt-16 pb-10 lg:pt-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
              Full rollup
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
              Every study, every finding
            </h1>
            <p className="mt-5 text-base text-zinc-300 leading-relaxed">
              Grouped by research question, not by case name. Each study holds one or more cases —
              new cases land inside an existing study as they&apos;re coded, rather than becoming a
              new peer at the top level.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 mt-10">
          <StatStrip stats={stats} />
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Standout findings</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Where models split — on whose downside is protected, filer alignment, crew risk, pace,
            and lean — under the same facts and a blind judge.
          </p>
          <div className="mt-8">
            <RollupFindingGrid findings={standout} />
          </div>
        </div>
      </section>

      {testTypes.map((type) => {
        const studies = getStudiesForType(type.id);
        const typeStats = getRollupStatsForType(type.id);
        return (
          <section
            key={type.id}
            id={type.id}
            className="scroll-mt-20 bg-zinc-50 py-16 border-b border-zinc-100"
          >
            <div className="mx-auto max-w-6xl px-6">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                {type.eyebrow}
              </span>
              <h2 className="mt-1 text-2xl font-bold text-zinc-900 tracking-tight">{type.name}</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-700 leading-relaxed">
                {type.heroQuestion}
              </p>
              <p className="mt-1.5 max-w-2xl text-sm text-zinc-500 leading-relaxed">{type.dek}</p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                {typeStats.map((s) => (
                  <span key={s.label} className="text-xs text-zinc-500">
                    <strong className="tabular-nums text-zinc-900">{s.value}</strong> {s.label}
                  </span>
                ))}
              </div>

              <div className="mt-8 space-y-8">
                {studies.map((study) => (
                  <div key={study.id} className="rounded-xl border border-zinc-200 bg-white p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          {study.eyebrow}
                        </span>
                        <h3 className="mt-0.5 text-lg font-semibold text-zinc-900">{study.name}</h3>
                      </div>
                      {study.kind === "dimension-coded" ||
                      study.id === "authorship-budget-conditions" ? (
                        <Link
                          href={`/model-studies/results/${study.id}`}
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Full case page →
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-4">
                      {study.id === "authorship-budget-conditions" ? (
                        <AuthorshipBudgetConditionsPanel />
                      ) : study.kind === "dimension-coded" ? (
                        <DimensionScoreboard rows={study.scoreboard ?? []} />
                      ) : (
                        <InfluenceMatrixPlaceholder deepDiveHref={study.deepDiveHref} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

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
