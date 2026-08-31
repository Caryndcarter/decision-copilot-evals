import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/app/model-studies/_components/site-nav";
import { MajorFindingGrid } from "@/app/model-studies/_components/cross-study-finding-card";
import { MajorFindingEvidenceSections } from "@/app/model-studies/_components/major-finding-snippet";
import { AuthorshipBudgetConditionsPanel } from "@/app/harness/findings/authorship-budget-conditions-panel";
import { AuthorshipBrandFavoritismPanel } from "@/app/harness/findings/authorship-brand-favoritism-panel";
import { AuthorshipBrandFavoritismModelsPanel } from "@/app/harness/findings/authorship-brand-favoritism-models-panel";
import {
  OVERVIEW_PUBLISHED_FINDINGS,
  getOverviewFinding,
} from "@/lib/model-studies-overview-findings";
import { getMajorFinding } from "@/lib/cross-study-findings";

export function generateStaticParams() {
  return OVERVIEW_PUBLISHED_FINDINGS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const finding = getOverviewFinding(slug);
  if (!finding) return {};
  return {
    title: `${finding.headline} — Model Studies`,
    description: finding.whyItMatters ?? finding.body.split("\n\n")[0],
  };
}

export default async function FindingStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const finding = getOverviewFinding(slug);
  if (!finding) notFound();

  const studyLabel = [...new Set(finding.sources.map((s) => s.study))].join(" · ");
  const majorFinding = finding.majorFindingId
    ? getMajorFinding(finding.majorFindingId)
    : undefined;
  const hasSnippets = (majorFinding?.snippets.length ?? 0) > 0;
  const hasAuthorshipPanel = finding.slug === "self-credit";
  const hasBrandFavorPanel = finding.slug === "brand-favoritism";
  const hasBrandFavorModelsPanel = finding.slug === "brand-favoritism-models";
  const hasEvidence =
    Boolean(majorFinding) || hasAuthorshipPanel || hasBrandFavorPanel || hasBrandFavorModelsPanel;

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 pt-16 pb-14 lg:pt-20 lg:pb-16">
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

        <div className="relative mx-auto max-w-3xl px-6">
          <Link
            href="/model-studies#findings"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← Latest findings
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-logo-light">
            {studyLabel}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {finding.headline}
          </h1>
          {finding.compareWording ? (
            <Link
              href={finding.compareWording.href}
              className="mt-4 inline-flex text-sm font-semibold text-logo-light hover:text-white"
            >
              {finding.compareWording.label}
            </Link>
          ) : null}
        </div>
      </section>

      {/* Narrative */}
      <section className="bg-white py-14 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-4 text-base leading-relaxed text-zinc-700">
            {finding.body.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {finding.whyItMatters ? (
            <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
                Why it matters
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">{finding.whyItMatters}</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Evidence */}
      {hasEvidence ? (
        <section className="bg-zinc-50 py-14 border-b border-zinc-100">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">The evidence</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Blind-coded counts behind this finding — the judge never saw which provider wrote which
              brief. Open a case below for the full scoreboard and methodology.
            </p>

            {majorFinding ? (
              <div className="mt-8">
                <MajorFindingGrid findings={[majorFinding]} wide />
              </div>
            ) : null}

            {hasSnippets && majorFinding ? (
              <div className="mt-6">
                <MajorFindingEvidenceSections findings={[majorFinding]} />
              </div>
            ) : null}

            {hasAuthorshipPanel ? (
              <div className="mt-8">
                <AuthorshipBudgetConditionsPanel />
              </div>
            ) : null}

            {hasBrandFavorPanel ? (
              <div className="mt-8">
                <AuthorshipBrandFavoritismPanel />
              </div>
            ) : null}

            {hasBrandFavorModelsPanel ? (
              <div className="mt-8">
                <AuthorshipBrandFavoritismModelsPanel />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Cases behind this story */}
      <section className="bg-white py-14 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            {finding.caseLinks.length > 1 ? "Cases behind this finding" : "The case behind this finding"}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Each case page carries the full scoreboard, dimension grid, methodology, and source
            notes for that batch.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {finding.caseLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <span className="text-sm font-semibold text-zinc-900">{link.label}</span>
                <span className="text-sm font-semibold text-indigo-600 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-xl font-bold tracking-tight text-white">Explore the rest of the research</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400">
            Every published finding, case, and coded rollup across Model Studies.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/model-studies/results"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              See all results →
            </Link>
            <Link
              href="/model-studies#findings"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Back to findings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
