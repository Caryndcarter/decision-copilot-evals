import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { getLiveStudies } from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "How it works — Model Studies",
  description: "The shared method behind every study: blind coding against a fixed rubric.",
};

export default function HowItWorksPage() {
  const studies = getLiveStudies();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="bg-zinc-950 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
              Method
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white tracking-tight leading-tight sm:text-4xl">
              One method, run on a different scenario each time
            </h1>
            <p className="mt-5 text-base text-zinc-300 leading-relaxed">
              Every study on this site follows the same shape. What changes is the scenario, the
              cases, and the rubric dimensions specific to it — not the process that produces the
              numbers.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">The shared process</h2>
          <ol className="mt-6 space-y-6">
            {[
              {
                title: "Write a case with a narrator who's already decided",
                desc: "Each case is a Decision Brief intake authored by a \"filer\" who has already leaned toward one option. The tone and framing vary — confident, urgent, optimistic, honest-aggressive — but for a given case, the underlying facts are held constant across every model.",
              },
              {
                title: "Run the same case through every provider",
                desc: "The same four provider models (OpenAI, Anthropic, Gemini, xAI) each independently produce a Decision Brief on the same intake — no model sees another's output.",
              },
              {
                title: "Blind-code every brief against a fixed rubric",
                desc: "A separate judge model codes each brief against a rubric written specifically for that study — it never sees which provider wrote the brief it's coding, only the brief itself.",
              },
              {
                title: "Aggregate, and let the split speak",
                desc: "Counts are aggregated by provider and by case. The interesting result usually isn't a single number — it's where providers split from each other on the same facts.",
              },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{step.title}</div>
                  <div className="mt-0.5 text-sm text-zinc-500 leading-relaxed">{step.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Per-study notes</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Each study's rubric is scenario-specific — here&apos;s what&apos;s particular to each
            one.
          </p>
          <div className="mt-8 space-y-8">
            {studies.map((study) => (
              <div key={study.id}>
                <h3 className="text-sm font-semibold text-zinc-900">{study.name}</h3>
                <ul className="mt-3 space-y-2">
                  {study.methodology.map((m) => (
                    <li key={m} className="flex gap-3 text-sm leading-relaxed text-zinc-600">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/results/${study.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  See {study.name} results →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
