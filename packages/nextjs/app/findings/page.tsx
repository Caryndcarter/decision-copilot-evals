import Link from "next/link";
import type { Metadata } from "next";
import { FindingsNav } from "./_components/findings-nav";
import { StudyCard } from "./_components/study-card";
import { FINDINGS_STUDIES } from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "Findings — Decision Copilot",
  description:
    "What blind-coded, multi-model research shows about whether AI advisors tell decision-makers the truth or agree with them.",
};

export default function FindingsHubPage() {
  return (
    <div className="min-h-screen bg-white">
      <FindingsNav />

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

        <div className="relative mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
            A Decision Copilot research program
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
            When someone&apos;s already picked a side, does the model say so — or agree with them?
          </h1>
          <p className="mt-5 text-lg text-zinc-300 leading-relaxed">
            Every study below runs the same experiment on a different scenario: give several
            frontier models the same facts, written by a narrator who has already decided, and
            blind-code what each one actually does with the pressure. The judge never sees which
            provider wrote what.
          </p>
        </div>
      </section>

      {/* Study grid */}
      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Studies</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
            New studies are added by extending one registry file — the layout doesn&apos;t need to
            change.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FINDINGS_STUDIES.map((s) => (
              <StudyCard key={s.id} study={s} />
            ))}
          </div>
        </div>
      </section>

      {/* Why this matters */}
      <section className="bg-zinc-50 py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Why we run this</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Most claims about AI models catching each other&apos;s mistakes are feature
            descriptions — plausible, but untested. This is the opposite bet: publish the cases,
            keep the coding blind, and let the numbers say whether a model is actually
            pressure-testing a decision or just agreeing with whoever&apos;s already decided.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            It&apos;s also why Decision Copilot runs every decision through the same fixed
            rubric — Risk, Reversibility, People — instead of a menu of conversation styles. A
            fixed rubric is what makes a study like this possible in the first place: you can only
            compare models against each other, and against themselves over time, if every brief is
            built the same way.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Try it on your own decision →
            </Link>
            <Link
              href="/auth/signin?callbackUrl=/harness/findings"
              className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Sign in for full quote-level data
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-zinc-950 border-t border-white/5 py-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between flex-wrap gap-4">
          <span className="text-sm text-zinc-600">Decision Copilot — research findings</span>
          <span className="text-sm text-zinc-600">Aggregate data only · full dataset requires sign-in</span>
        </div>
      </footer>
    </div>
  );
}
