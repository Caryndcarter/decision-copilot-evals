import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { Glossary } from "../_components/glossary";
import { DimensionGlossaryTable } from "../_components/dimension-glossary-table";
import { getLiveTestTypes, getStudiesForType } from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "How it works — Model Studies",
  description: "The shared method behind every test type: blind coding against a fixed rubric.",
};

export default function HowItWorksPage() {
  const testTypes = getLiveTestTypes();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <section className="bg-zinc-950 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
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
      </section>

      <section className="bg-white py-12 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6 space-y-6">
          <p className="text-sm leading-relaxed text-zinc-600">
            The site is organized in four layers, nested inside each other: a{" "}
            <strong className="font-semibold text-zinc-900">test type</strong> is the question
            being asked (does filer voice change model behavior?); a{" "}
            <strong className="font-semibold text-zinc-900">study</strong> is one specific test of
            that question, built from several{" "}
            <strong className="font-semibold text-zinc-900">case files</strong>; each case file runs
            through every model, and every resulting brief is scored by a{" "}
            <strong className="font-semibold text-zinc-900">judge model</strong> that never sees
            which provider wrote it.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600">
            Two kinds of brief show up throughout this site.{" "}
            <strong className="font-semibold text-zinc-900">Decision Brief</strong> is one model's
            own response to a case — its analysis and recommendation, on its own.{" "}
            <strong className="font-semibold text-zinc-900">Unified Brief</strong> is different:
            it's what you get when a <strong className="font-semibold text-zinc-900">synthesizer</strong>{" "}
            model merges several models' Decision Briefs into one combined recommendation. Voice
            Influence studies score Decision Briefs directly; Authorship and Replication studies
            score Unified Briefs, since what they're testing is what happens during that merge.
          </p>
          <Glossary />
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">The shared process</h2>
          <ol className="mt-6 space-y-6">
            {[
              {
                title: "Write a case with a filer who's already decided",
                desc: "Each case is an intake authored by a filer who has already leaned toward one option. The tone and framing vary — confident, urgent, optimistic, honest-aggressive — but for a given case, the underlying facts are held constant across every model.",
              },
              {
                title: "Run the same case through every model",
                desc: "The same four models — ChatGPT (OpenAI), Fable (Anthropic), Gemini (Google), and Grok (xAI) — each independently produce their own Decision Brief on the same intake, without seeing what the others wrote.",
              },
              {
                title: "Blind-code every brief against a fixed rubric",
                desc: "A separate judge model scores each brief against a rubric written specifically for that study, kept blind to which provider wrote the brief it's coding — only the brief itself. Which model judges varies by study (see the notes for each one below), and one study (multi-demo authorship) has no separate judge at all — see its notes for why.",
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
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">By test type</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Each type's rubric is scenario-specific — here&apos;s what&apos;s particular to every
            study inside it.
          </p>
          <div className="mt-8 space-y-10">
            {testTypes.map((type) => (
              <div key={type.id}>
                <h3 className="text-base font-semibold text-zinc-900">{type.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{type.heroQuestion}</p>
                <div className="mt-4 space-y-6">
                  {getStudiesForType(type.id).map((study) => (
                    <div key={study.id} className="border-l-2 border-zinc-200 pl-4">
                      <h4 className="text-sm font-semibold text-zinc-800">{study.name}</h4>
                      <ul className="mt-2 space-y-2">
                        {study.methodology.map((m) => (
                          <li key={m} className="flex gap-3 text-sm leading-relaxed text-zinc-600">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                      {study.dimensionGlossary && (
                        <div className="mt-3">
                          <DimensionGlossaryTable entries={study.dimensionGlossary} />
                        </div>
                      )}
                      <Link
                        href={`/model-studies/results/${study.id}`}
                        className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        See {study.name} results →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
