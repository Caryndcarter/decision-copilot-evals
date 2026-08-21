import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/app/_components/site-nav";
import { StatStrip } from "@/app/_components/stat-strip";
import { FindingCardGrid } from "@/app/_components/finding-card";
import { DimensionScoreboard } from "@/app/_components/scoreboard-dimension-coded";
import { InfluenceMatrixPlaceholder } from "@/app/_components/scoreboard-influence-matrix";
import { FINDINGS_STUDIES, getFindingsStudy } from "@/lib/findings-registry";

export function generateStaticParams() {
  return FINDINGS_STUDIES.filter((s) => s.status === "live").map((s) => ({ study: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ study: string }>;
}): Promise<Metadata> {
  const { study: studyId } = await params;
  const study = getFindingsStudy(studyId);
  if (!study) return {};
  return {
    title: `${study.name} — Results — Decision Copilot`,
    description: study.heroQuestion,
  };
}

export default async function StudyResultsPage({
  params,
}: {
  params: Promise<{ study: string }>;
}) {
  const { study: studyId } = await params;
  const study = getFindingsStudy(studyId);
  if (!study || study.status !== "live") notFound();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      {/* Hero + stats */}
      <section className="bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-10 lg:pt-20">
          <Link
            href="/results"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← All results
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
            {study.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
            {study.heroQuestion}
          </h1>
          <p className="mt-5 text-base text-zinc-300 leading-relaxed">{study.dek}</p>
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <StatStrip stats={study.stats} />
        </div>
      </section>

      {/* Findings */}
      {study.findings.length > 0 && (
        <section className="bg-white py-16 border-b border-zinc-100">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">What this batch found</h2>
            <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
              Every claim below is drawn from a blind-coded batch — the judge never saw which
              provider wrote which brief.
            </p>
            <div className="mt-8">
              <FindingCardGrid findings={study.findings} />
            </div>
          </div>
        </section>
      )}

      {/* Scoreboard */}
      <section className="bg-zinc-50 py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Scoreboard</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            A curated slice of the coded dimensions, by provider. This is aggregate counts only —
            no model quotes.
          </p>
          <div className="mt-8">
            {study.kind === "dimension-coded" ? (
              <DimensionScoreboard rows={study.scoreboard ?? []} />
            ) : (
              <InfluenceMatrixPlaceholder deepDiveHref={study.deepDiveHref} />
            )}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">How it works</h2>
          <ul className="mt-6 space-y-4">
            {study.methodology.map((m) => (
              <li key={m} className="flex gap-3 text-sm leading-relaxed text-zinc-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-zinc-400">Source: {study.sourceNote}</p>
        </div>
      </section>

      {/* Deep dive CTA */}
      <section className="bg-zinc-950 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-xl font-bold text-white tracking-tight">Want the full dataset?</h2>
          <p className="mt-3 text-sm text-zinc-400 max-w-lg mx-auto">
            Every coded brief, every dimension, every verbatim quote the judge based its call on —
            sign in to explore the complete study.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {study.deepDiveHref && (
              <Link
                href={study.deepDiveHref}
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Sign in to explore →
              </Link>
            )}
            <Link
              href="/results"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              See other studies
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
