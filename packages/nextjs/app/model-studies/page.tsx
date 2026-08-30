import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "./_components/site-nav";
import { StatStrip } from "./_components/stat-strip";
import { RollupFindingGrid } from "./_components/rollup-finding-card";
import { TestTypeCard } from "./_components/test-type-card";
import {
  getLiveTestTypes,
  getRollupStats,
  getStandoutFindings,
  getStudiesForType,
} from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "Model Studies — a Decision Copilot research program",
  description:
    "Blind-coded, multi-model research on whether AI advisors tell decision-makers the truth or agree with them.",
};

export default function Home() {
  const stats = getRollupStats();
  const findings = getStandoutFindings();
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-logo/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
        <img
          src="/hero-brain.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute right-[6%] top-1/2 z-0 hidden w-[48%] max-w-md -translate-y-1/2 opacity-50 mix-blend-screen lg:block"
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-logo-light">
              A Decision Copilot research program
            </p>
            <h1 className="mt-4 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl lg:text-5xl">
              Same facts. Different answers.
            </h1>
            <p className="mt-5 text-lg text-zinc-300 leading-relaxed">
              Model Studies is a research program that puts frontier AI models through real decision
              scenarios — same facts, several providers, blind-coded on a fixed rubric. We track where
              models&apos; answers split when you hold the facts constant and change the conditions:
              how the story is framed, whether provider names are visible when briefs are merged into
              a{" "}
              <Link
                href="/how-it-works#unified-brief"
                className="font-semibold text-logo-light hover:text-white transition-colors"
              >
                Unified Brief
              </Link>
              , whether the same scenario holds up when run at volume, and more. Results are published
              here so you can see what held up and what didn&apos;t.
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

      {/* Hook — why the program exists, then into studies */}
      <section className="relative overflow-hidden border-b border-zinc-100 bg-zinc-50 py-20 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 0% 0%, rgba(99,102,241,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(139,92,246,0.08), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
            Research program
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            The reason for Model Studies research
          </h2>
          <p className="mt-5 text-base leading-relaxed text-zinc-600">
            Claims about how models behave under decision pressure — and overconfidence in model
            consensus — are easy to ship and hard to check. This program exists to make them
            checkable: the same facts, several models, blind coding on a fixed rubric, and the
            results published — so you can see what held up and what didn&apos;t, instead of taking
            a feature bullet on faith.
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-zinc-800">
            {[
              "Same facts, several models",
              "Blind coding on a fixed rubric",
              "Results published, not claimed",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Link
              href="/model-studies/why"
              className="inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-colors hover:bg-indigo-500"
            >
              Why it matters →
            </Link>
          </div>
        </div>
      </section>

      {/* Studies */}
      <section id="studies" className="scroll-mt-20 bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">The Studies</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            Each study is a research question, answered across one or more cases. New cases land
            inside an existing study as a registry entry — the study is the story, not any single
            case.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {testTypes.map((t) => (
              <TestTypeCard key={t.id} type={t} studies={getStudiesForType(t.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* Rollup findings */}
      <section className="bg-zinc-50 py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              What the studies found
            </h2>
            <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
              Where models split under the same facts — blind-coded, on a fixed rubric. The full
              scoreboards live on Results and on each case page.
            </p>
          </div>
          <RollupFindingGrid findings={findings} />
          <div className="mt-8">
            <Link
              href="/model-studies/results"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              See the full rollup on Results →
            </Link>
          </div>
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
            complete cases.
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
