import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";

export const metadata: Metadata = {
  title: "Why it matters — Model Studies",
  description: "Why we publish blind-coded model behavior instead of just claiming it.",
};

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="bg-zinc-950 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl ml-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
              The pitch
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
              An AI that agrees with you isn&apos;t the same as an AI that&apos;s right
            </h1>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6 space-y-6 text-sm leading-relaxed text-zinc-600">
          <p>
            Most claims about AI models catching each other&apos;s mistakes are feature
            descriptions — a product bullet point, not a tested result. This site is the opposite
            bet: publish the cases, keep the coding blind to which provider wrote what, and let
            the numbers say whether a model is actually pressure-testing a decision or just
            agreeing with whoever&apos;s already decided.
          </p>
          <p>
            That distinction — sycophancy versus accuracy — is different from the thing most
            multi-model tools measure. Catching a hallucination is a factual check: is this true?
            Catching sycophancy is a different question: is this model telling the decision-maker
            what they need to hear, or what they already believe? For a high-stakes decision, the
            second failure mode is often the more expensive one, and it&apos;s much easier for a
            product to claim it&apos;s solved than to actually show its work.
          </p>
          <p>
            It&apos;s also why{" "}
            <Link href="/intake" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Decision Copilot
            </Link>{" "}
            runs every decision through the same fixed rubric — Risk, Reversibility, People —
            instead of a menu of conversation styles. A fixed rubric is what makes a study like
            this possible in the first place: you can only compare models against each other, and
            against themselves over time, if every brief is built the same way. The studies on
            this site and the product are the same bet, just pointed in two directions — one at
            the models, one at your decision.
          </p>
        </div>
      </section>

      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            See it on your own decision
          </h2>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href="/intake"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Start a decision →
            </Link>
            <Link
              href="/model-studies/results"
              className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Back to results
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
