import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "./_components/site-nav";
import { StatStrip } from "./_components/stat-strip";
import { RollupFindingGrid } from "./_components/rollup-finding-card";
import { TestTypeCard } from "./_components/test-type-card";
import {
  getLiveTestTypes,
  getRollupFindings,
  getRollupStats,
  getStudiesForType,
} from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "Model Studies — a Decision Copilot research program",
  description:
    "Blind-coded, multi-model research on whether AI advisors tell decision-makers the truth or agree with them.",
};

export default function Home() {
  const stats = getRollupStats();
  const findings = getRollupFindings(2);
  const testTypes = getLiveTestTypes();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 pt-20 pb-16 lg:pt-24 lg:pb-20">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
        <img
          src="/hero-brain.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute right-[6%] top-1/2 z-0 hidden w-[48%] max-w-md -translate-y-1/2 opacity-50 mix-blend-screen lg:block"
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
              A Decision Copilot research program
            </p>
            <h1 className="mt-4 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl lg:text-5xl">
              When someone&apos;s already picked a side, does the model say so — or agree with
              them?
            </h1>
            <p className="mt-5 text-lg text-zinc-300 leading-relaxed">
              Give several frontier models the same facts, written by a narrator who&apos;s
              already decided. Blind-code what each one actually does with the pressure — the
              judge never sees which provider wrote what. This is the rollup of what that&apos;s
              found so far, across every study we&apos;ve run.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/model-studies/results"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
              >
                See the full results →
              </Link>
              <Link
                href="/model-studies/why"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                Why we run this
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 mt-14">
          <StatStrip stats={stats} />
        </div>
      </section>

      {/* Rollup findings */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              What the studies found
            </h2>
            <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
              A cross-study sample — every claim is drawn from a blind-coded batch. More cases are
              being added to this rollup over time; nothing below is the full picture.
            </p>
          </div>
          <RollupFindingGrid findings={findings} />
          <div className="mt-8">
            <Link
              href="/model-studies/results"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              See every finding, from every study →
            </Link>
          </div>
        </div>
      </section>

      {/* Test type grid */}
      <section className="bg-zinc-50 py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">The test types</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Each type is a question, tested across one or more studies. New studies land inside an
            existing type as a registry entry — the type is the story, not any single case.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {testTypes.map((t) => (
              <TestTypeCard key={t.id} type={t} studies={getStudiesForType(t.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* Why it matters teaser */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Why we run this</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Most claims about AI models catching each other&apos;s mistakes are feature
            descriptions — plausible, but untested. This is the opposite bet: publish the cases,
            keep the coding blind, and let the numbers say whether a model is actually
            pressure-testing a decision or just agreeing with whoever&apos;s already decided.
          </p>
          <Link
            href="/model-studies/why"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Read the full argument →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Want the full dataset?
          </h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            Every coded brief, every dimension, every verbatim quote — sign in to explore the
            complete studies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/auth/signin?callbackUrl=/harness/findings"
              className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
            >
              Sign in →
            </Link>
            <Link
              href="/model-studies/results"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-8 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Browse the rollup
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-zinc-950 border-t border-white/5 py-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between flex-wrap gap-4">
          <span className="text-sm text-zinc-600">Model Studies — a Decision Copilot research program</span>
          <span className="text-sm text-zinc-600">Aggregate data only · full dataset requires sign-in</span>
        </div>
      </footer>
    </div>
  );
}
