import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { Glossary } from "../_components/glossary";
import { DimensionGlossaryTable } from "../_components/dimension-glossary-table";
import { getLiveTestTypes, getStudiesForType } from "@/lib/findings-registry";

export const metadata: Metadata = {
  title: "How it works — Model Studies",
  description: "The shared method behind every study: blind coding against a fixed rubric.",
};

const STUDIES = [
  {
    id: "voice-influence",
    title: "Voice influence",
    question: "Does the way the user frames the story change how the model treats the same facts?",
    desc: "A filer who has already leaned toward a decision asks for advice. We measure sycophancy: telling them what they already believe instead of what they need to hear.",
  },
  {
    id: "authorship-influence",
    title: "Authorship influence",
    question:
      "When a Unified Brief credits an idea to a model, does the credit survive if the model's identity is revealed or swapped?",
    desc: "Same analyses, different brand visibility. We measure whether knowing who wrote what changes what gets kept in the Unified Brief.",
  },
  {
    id: "replication",
    title: "Replication",
    question: "Does a model's recommendations remain constant when you run the same scenario over and over?",
    desc: "Repeat the full path across trials to separate durable behavior from one-shot noise.",
  },
] as const;

export default function HowItWorksPage() {
  const testTypes = getLiveTestTypes();

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 py-16 lg:py-24">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
            Method
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white leading-tight sm:text-4xl lg:text-5xl">
            One method, run on a different scenario each time
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">
            Every case on this site follows the same shape. What changes is the scenario, the
            conditions, and the rubric dimensions specific to it — not the process that produces
            the numbers.
          </p>
        </div>
      </section>

      {/* How it works — three beats */}
      <section className="border-b border-zinc-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">How it works</h2>
            <p className="mt-3 text-zinc-500">
              One kind of pressure. Several models. A judge that never sees the brand.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Adversarial intakes",
                desc: "Intakes written by a filer who has already leaned toward a decision — built to read like a real high-stakes call, not a chat turn.",
              },
              {
                title: "Same rubric every time",
                desc: "Every brief is scored against a fixed skeleton so models can be compared to each other — and to themselves over time.",
              },
              {
                title: "Blind coding",
                desc: "The judge model scores what came back without knowing which provider wrote which brief.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-6"
              >
                <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studies */}
      <section className="border-b border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              What each study asks
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {STUDIES.map((s) => (
              <div
                id={s.id}
                key={s.id}
                className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                  {s.title}
                </p>
                <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-900">
                  {s.question}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/model-studies/results"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              See results by study →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6 space-y-6">
          <p className="text-sm leading-relaxed text-zinc-600">
            The site is organized in three layers: a{" "}
            <strong className="font-semibold text-zinc-900">study</strong> is the research
            question (does filer voice change model behavior?); a{" "}
            <strong className="font-semibold text-zinc-900">case</strong> is a named scenario under
            that study (e.g. Meridian IC), built from several{" "}
            <strong className="font-semibold text-zinc-900">conditions</strong> (confident tone,
            Blind authorship, and so on). Each condition runs through every model, and every
            resulting brief is scored by a{" "}
            <strong className="font-semibold text-zinc-900">judge model</strong> that never sees
            which provider wrote it.
          </p>
          <p className="text-sm leading-relaxed text-zinc-600">
            Two kinds of brief show up throughout this site.{" "}
            <strong className="font-semibold text-zinc-900">Decision Brief</strong> is one model&apos;s
            own response to an intake — its analysis and recommendation, on its own.{" "}
            <strong className="font-semibold text-zinc-900">Unified Brief</strong> is different:
            it&apos;s what you get when a{" "}
            <strong className="font-semibold text-zinc-900">synthesizer</strong> model merges several
            models&apos; Decision Briefs into one combined recommendation. Voice Influence cases
            score Decision Briefs directly; Authorship and Replication cases score Unified Briefs,
            since what they measure is what happens during that merge.
          </p>
          <Glossary />
        </div>
      </section>

      <section id="unified-brief-research" className="scroll-mt-24 bg-zinc-50 py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            Unified Brief research instruments
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Some studies go beyond blind rubric coding and use optional product artifacts built for
            authorship and ethics research on Unified Briefs.
          </p>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-zinc-900">
                Influence charts — how each author weighted the room
              </h3>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-600">
                <p>
                  When multiple synthesizers each produce a Unified Brief, every author can rate how
                  much each think-tank member influenced <em>their</em> merge. Influence charts show
                  rater × rated heatmaps and averages — including side-by-side comparisons across
                  Blind, Revealed, and Reassigned authorship.
                </p>
                <p>
                  This is the layer{" "}
                  <Link
                    href="/model-studies/how-it-works#authorship-influence"
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Authorship influence
                  </Link>{" "}
                  measures: does credit track the idea or the logo?
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-zinc-900">Ethics audit (moral audit)</h3>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-600">
                <p>
                  A blind <strong className="font-medium text-zinc-800">moral audit</strong> scores a
                  Unified Brief on eight domain-agnostic dimensions — tradeoff honesty, whose downside
                  is protected, and similar — using a separate reviewer that never sees which model
                  wrote the brief.
                </p>
                <p>
                  Replication cases such as Civitas use this layer alongside rubric coding to ask
                  whether models protect the right downside under pressure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">The shared process</h2>
          <ol className="mt-6 space-y-6">
            {[
              {
                title: "Write a condition with a filer who's already decided",
                desc: "Each condition is an intake authored by a filer who has already leaned toward one option. Tone and framing vary — confident, urgent, optimistic, honest-aggressive — but for a given condition, the underlying facts are held constant across every model.",
              },
              {
                title: "Run the same intake through every model",
                desc: "The same four models — ChatGPT (OpenAI), Fable (Anthropic), Gemini (Google), and Grok (xAI) — each independently produce their own Decision Brief on the same intake, without seeing what the others wrote.",
              },
              {
                title: "Blind-code every brief against a fixed rubric",
                desc: "A separate judge model scores each brief against a rubric written specifically for that case, kept blind to which provider wrote the brief it's coding — only the brief itself. Which model judges varies by case (see the notes for each one below), and one case (multi-demo authorship) has no separate judge at all — see its notes for why.",
              },
              {
                title: "Aggregate, and let the split speak",
                desc: "Counts are aggregated by provider and by condition. The interesting result usually isn't a single number — it's where providers split from each other on the same facts.",
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

      <section className="bg-zinc-50 py-16 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">By study</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Each study&apos;s rubric is scenario-specific — here&apos;s what&apos;s particular to
            every case inside it.
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
                        href={
                          study.kind === "influence-matrix"
                            ? `/model-studies/results#${type.id}`
                            : `/model-studies/results/${study.id}`
                        }
                        className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        See {study.name} on Results →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Same bet */}
      <section className="border-b border-zinc-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            Same bet as the product — two directions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500">
            <Link href="/intake" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Decision Copilot
            </Link>{" "}
            runs every decision through Risk, Reversibility, and Stakeholders — not a menu of chat
            styles. A fixed rubric is what makes these studies possible. Each case&apos;s own
            codes are that same skeleton under specific decision pressure: catch the ignored risk,
            keep the door open before committing, say who bears the downside.
          </p>
          <ul className="mx-auto mt-8 max-w-md space-y-3 text-left text-sm text-zinc-600">
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>
                <span className="font-semibold text-zinc-900">Studies</span> — pointed at the models
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>
                <span className="font-semibold text-zinc-900">Product</span> — pointed at your decision
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-zinc-950 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            See it on your own decision
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/intake"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Start a decision →
            </Link>
            <Link
              href="/model-studies/results"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Back to results
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
