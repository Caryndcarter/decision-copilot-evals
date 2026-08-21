import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { StatStrip } from "../_components/stat-strip";
import { RollupFindingGrid } from "../_components/rollup-finding-card";
import { DimensionScoreboard } from "../_components/scoreboard-dimension-coded";
import { InfluenceMatrixPlaceholder } from "../_components/scoreboard-influence-matrix";
import {
  getAllRollupFindings,
  getLiveStudies,
  getRollupStats,
  getUpcomingStudies,
} from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "Results — Model Studies",
  description: "Every study, every finding — the full rollup of blind-coded model behavior.",
};

export default function ResultsPage() {
  const stats = getRollupStats();
  const findings = getAllRollupFindings();
  const liveStudies = getLiveStudies();
  const upcoming = getUpcomingStudies();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="bg-zinc-950 pt-16 pb-10 lg:pt-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
            Full rollup
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
            Every study, every finding
          </h1>
          <p className="mt-5 text-base text-zinc-300 leading-relaxed">
            One continuous view across all live studies. As new case batteries are coded, they
            extend this page — they don&apos;t replace it.
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-6 mt-10">
          <StatStrip stats={stats} />
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">All findings</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Every claim below is drawn from a blind-coded batch — the judge never saw which
            provider wrote which brief. Click through to a study for its full scoreboard and
            methodology.
          </p>
          <div className="mt-8">
            <RollupFindingGrid findings={findings} />
          </div>
        </div>
      </section>

      {liveStudies.map((study) => (
        <section key={study.id} className="bg-zinc-50 py-16 border-b border-zinc-100">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                  {study.eyebrow}
                </span>
                <h2 className="mt-1 text-xl font-bold text-zinc-900 tracking-tight">
                  {study.name}
                </h2>
              </div>
              <Link
                href={`/results/${study.id}`}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Full study page →
              </Link>
            </div>
            <div className="mt-6">
              {study.kind === "dimension-coded" ? (
                <DimensionScoreboard rows={study.scoreboard ?? []} />
              ) : (
                <InfluenceMatrixPlaceholder deepDiveHref={study.deepDiveHref} />
              )}
            </div>
          </div>
        </section>
      ))}

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
