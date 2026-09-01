import type { Metadata } from "next";
import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { PublicSessionNav } from "@/app/components/public-session-nav";

export const metadata: Metadata = {
  title: "Product tour — Decision Copilot",
  description:
    "Walk through a sample decision using the real product flow — intake, clarifying questions, model briefs, and a unified synthesis.",
};

const STEPS = [
  {
    title: "Brief your think tank",
    description:
      "Pre-filled intake for a wartime shipping decision — a tanker operator weighing whether to keep sailing the Strait of Hormuz under escort or reroute around the Cape.",
  },
  {
    title: "Answer follow-up questions",
    description: "Models ask clarifying questions once; your answers update every run in the think tank.",
  },
  {
    title: "Compare model briefs",
    description:
      "On the Decision Brief, open the model menu to switch between OpenAI, Anthropic, Gemini, and xAI. Expand the collapsed sections to read each model's lenses.",
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
          <PublicSessionNav />
        </div>
      </nav>

      <section className="border-b border-zinc-200 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-logo">Interactive tour · no sign-up</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 lg:text-4xl">
            See the product in action
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600">
            Walk through the same flow as a live run — intake, clarifying questions, individual model briefs, and a
            unified synthesis.
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
