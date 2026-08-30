import type { Metadata } from "next";
import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";

export const metadata: Metadata = {
  title: "Product tour — Decision Copilot",
  description:
    "Walk through a frozen sample decision using the real product UI — intake, clarifying questions, model briefs, and a unified synthesis.",
};

const STEPS = [
  {
    title: "Brief your think tank",
    description:
      "Pre-filled intake for a Vercel vs AWS hosting decision — migrate, hybrid, or optimize in place.",
  },
  {
    title: "Answer follow-up questions",
    description: "Models ask clarifying questions once; your answers update every run in the think tank.",
  },
  {
    title: "Compare model briefs",
    description:
      "Switch between OpenAI, Anthropic, Gemini, and xAI — each with its own risk, reversibility, and stakeholders lenses.",
  },
  {
    title: "Read the Unified Brief",
    description: "See where models disagreed and how Decision Copilot synthesizes a single recommendation.",
  },
] as const;

export default function TourPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <SessionNav />
        </div>
      </nav>

      <section className="border-b border-zinc-200 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-logo">Interactive tour · no sign-up</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 lg:text-4xl">
            See the product, not a slide deck
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600">
            This tour uses the same pages as a live run — intake, clarifying questions, individual model briefs, and
            a unified synthesis. Everything is frozen sample data; nothing hits the API or requires an account.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/demo/intake"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Start the demo →
            </Link>
            <Link
              href="/request-access"
              className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Request access
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">What you&apos;ll walk through</h2>
        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-logo-soft text-sm font-bold text-logo-text">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-zinc-900">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-zinc-500">
          Prefer reading first?{" "}
          <Link href="/how-it-works" className="font-medium text-indigo-600 hover:text-indigo-700">
            How it works
          </Link>
        </p>
      </section>
    </div>
  );
}
