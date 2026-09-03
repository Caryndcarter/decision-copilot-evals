import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";
import { TestTypeCard } from "../_components/test-type-card";
import { StudyProcessTabs, type StudyProcessTab } from "../_components/study-process-tabs";
import { getLiveTestTypes, getStudiesForType } from "@/lib/findings-registry";
import { getResultsCaseBrowseMeta } from "@/lib/results-browse-meta";

export const metadata: Metadata = {
  title: "How it works — Model Studies",
  description:
    "Voice Influence, Authorship, and Replication — each measuring model behavior a different way.",
};

/** The process differs by study — there is no single shared pipeline. */
const PROCESS_BY_STUDY: Record<
  string,
  { scores: string; process: { title: string; desc: string }[] }
> = {
  "voice-influence": {
    scores: "Scores each model's own Decision Brief",
    process: [
      {
        title: "Write the intake as a filer who's already decided",
        desc: "Each condition is an intake authored by someone who has already leaned toward one option. Tone and framing vary — confident, urgent, honest-aggressive, or quietly resting on a premise that doesn't hold up — but the underlying facts stay constant across every model.",
      },
      {
        title: "Every model answers on its own",
        desc: "The same four models — ChatGPT (OpenAI), Fable (Anthropic), Gemini (Google), and Grok (xAI) — each independently produce their own Decision Brief from that intake, without seeing what the others wrote.",
      },
      {
        title: "Blind-code each Decision Brief",
        desc: "A judge model, kept blind to which provider wrote which brief, scores every Decision Brief against a rubric written for that specific case.",
      },
      {
        title: "Aggregate, and let the split speak",
        desc: "Counts roll up by provider and condition. The signal isn't one number — it's where models diverge on the same facts, and whether they follow the filer's lean or push back.",
      },
    ],
  },
  authorship: {
    scores: "Measures the merge — who gets the credit",
    process: [
      {
        title: "Start from one set of analyses",
        desc: "Several models' analyses of the same decision are the raw material — the think tank whose work is about to be merged into a single brief.",
      },
      {
        title: "Merge under three authorship conditions",
        desc: "A synthesizer combines them into a Unified Brief three ways: Blind (provider names hidden — the product default), Revealed (real names shown), and Reassigned (names deliberately swapped).",
      },
      {
        title: "Measure credit, not just the text",
        desc: "Each synthesizer rates how much every think-tank member influenced its merge, producing a rater × rated influence matrix. The Synthesizer Behavior case looks at two patterns in that credit: a model that claims full self-credit when peers rate the work weak, and a brand penalty that follows the Grok name rather than the work.",
      },
      {
        title: "Compare across conditions",
        desc: "The signal is the delta between conditions: if the same reasoning gains or loses credit when the name on it changes, credit is tracking the brand, not the idea. Attribution here comes from the synthesis and ratings themselves — some authorship cases have no separate blind judge.",
      },
    ],
  },
  replication: {
    scores: "Scores merged Unified Briefs, at volume",
    process: [
      {
        title: "Fix one scenario, run it many times",
        desc: "A single scenario runs through the full path — intake, research, variant, synthesis — repeated across many trials, at much higher volume than a one-off case.",
      },
      {
        title: "Synthesize a Unified Brief each trial",
        desc: "Every trial, synthesizers merge the think tank into a Unified Brief under Blind, Revealed, and Reassigned authorship.",
      },
      {
        title: "Blind-code every Unified Brief",
        desc: "A judge, blind to both synthesizer brand and authorship condition, scores each brief against a fixed multi-dimension moral rubric.",
      },
      {
        title: "Separate signal from noise",
        desc: "Aggregating across trials shows which behaviors are durable and which were a fluke of small numbers — the check on whether an earlier finding was real.",
      },
    ],
  },
};

export default function HowItWorksPage() {
  const testTypes = getLiveTestTypes();

  const studyTabs: StudyProcessTab[] = testTypes.map((type) => ({
    id: type.id,
    name: type.name,
    question: type.heroQuestion,
    scores: PROCESS_BY_STUDY[type.id]?.scores ?? "",
    process: PROCESS_BY_STUDY[type.id]?.process ?? [],
    cases: getStudiesForType(type.id).map((study) => ({
      id: study.id,
      name: study.name,
      methodology: study.methodology,
      dimensionGlossary: study.dimensionGlossary,
      resultsHref:
        getResultsCaseBrowseMeta(study).publicationStatus === "published"
          ? `/model-studies/results/${study.id}`
          : `/model-studies/results#${type.id}`,
    })),
  }));

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
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-logo/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-logo-light">
            Method
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white leading-tight sm:text-4xl lg:text-5xl">
            Change one thing. See what moves.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">
            Voice Influence, Authorship, and Replication each put models under a different kind of
            pressure — and each measures it differently. Pick a study to see exactly how its numbers
            are produced.
          </p>
        </div>
      </section>

      {/* Overall methodology — prose intro */}
      <section className="relative overflow-hidden border-b border-zinc-100 bg-white py-16 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 55% at 0% 0%, rgba(99,102,241,0.10), transparent 55%), radial-gradient(ellipse 55% 45% at 100% 100%, rgba(139,92,246,0.07), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
              How the research works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Model Studies methodology
            </h2>
          </div>

          <div className="mt-10 flex flex-col gap-6">
            <div className="relative rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
              <span className="absolute -top-px left-7 h-0.5 w-12 rounded-full bg-indigo-500" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                Controlled comparison
              </p>
              <p className="mt-3 text-lg font-semibold leading-snug text-zinc-900">
                Model Studies uses controlled comparisons to isolate what changes an AI model&apos;s
                judgment.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-600">
                We begin with a realistic decision scenario and run it repeatedly, changing one factor
                at a time. Because every other part of the test remains the same, differences in the
                results can be attributed to that one factor rather than random variation. Every
                version is run through each model. Results are then coded blind: a reviewing model
                scores each analysis against a fixed rubric of dimensions without knowing which model
                produced it, so brand recognition cannot influence the score.
              </p>
            </div>

            <div className="relative rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
              <span className="absolute -top-px left-7 h-0.5 w-12 rounded-full bg-indigo-500" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                Measured where it shows up
              </p>
              <p className="mt-3 text-lg font-semibold leading-snug text-zinc-900">
                Studies evaluate the output at the level where the effect should appear.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-600">
                Voice Influence studies evaluate each model&apos;s individual decision analysis, where
                changes in framing can first shape a model&apos;s reasoning, priorities, and
                recommendation. Authorship studies evaluate the merged Unified Brief, where the
                influence of named contributors can be measured.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What each study is */}
      <section className="border-b border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">The Studies</h2>
            <p className="mt-3 text-zinc-500">
              Each study isolates one force that can bend a model&apos;s judgment — how the ask is
              framed, whose name is on the reasoning, or plain run-to-run variance — holds the facts
              constant, and scores the result blind. That&apos;s what lets a difference in the output
              trace to the force we changed rather than to chance.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {testTypes.map((t) => (
              <TestTypeCard key={t.id} type={t} studies={getStudiesForType(t.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* How each study works — toggle between the studies, each with its own process */}
      <section className="border-b border-zinc-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">How each study works</h2>
            <p className="mt-3 text-zinc-500">
              What gets scored, and how, changes with the question. Toggle between the studies to see
              the exact process behind each one&apos;s numbers.
            </p>
          </div>
          <div className="mt-10">
            <StudyProcessTabs tabs={studyTabs} />
          </div>
          <div className="mt-10">
            <Link
              href="/model-studies/results"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              See results by study →
            </Link>
          </div>
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
                    href="/model-studies/how-it-works#authorship"
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Authorship influence
                  </Link>{" "}
                  measures: does credit track the idea or the logo?
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-zinc-900">Lean audit — whose side a brief takes</h3>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-600">
                <p>
                  A blind <strong className="font-medium text-zinc-800">lean audit</strong> scores a
                  Unified Brief on domain-agnostic dimensions — tradeoff honesty, whose downside is
                  protected, whether one side&apos;s power goes unchallenged, and similar — using a
                  separate reviewer that never sees which model wrote the brief.
                </p>
                <p>
                  Cases use this layer alongside rubric coding to surface which way a brief leans:
                  whose interests it protects when nothing in the prompt asks it to.
                </p>
              </div>
            </div>
          </div>
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
