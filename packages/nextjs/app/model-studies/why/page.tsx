import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "../_components/site-nav";

export const metadata: Metadata = {
  title: "Why it matters — Model Studies",
  description: "Why we publish blind-coded model behavior instead of just claiming it.",
};

const FAILURE_MODES = [
  {
    title: "Wrong data",
    question: "Is the information actually right?",
    descBefore:
      "Hallucinations, bad assumptions, and outdated or stale facts — the model reasons from something that isn\u2019t true. On Unified Briefs, an optional ",
    links: [{ href: "/how-it-works#fact-check", label: "fact-check judge" }],
    descAfter:
      " with web search can flag public factual errors in the draft \u2014 without changing the recommendation.",
  },
  {
    title: "Hidden bias",
    question: "Whose interests does the model protect when nothing in the prompt asks it to?",
    descBefore:
      "The model can favor one side\u2019s downside while sounding even-handed. ",
    links: [
      {
        href: "/model-studies/how-it-works#voice-influence",
        label: "Our Voice Influence study",
      },
    ],
    descAfter: " identifies this.",
  },
  {
    title: "Sycophancy",
    question: "Is this what the user needs — or what they already want?",
    descBefore: "The model bends toward the user’s lean, true or not. ",
    links: [
      {
        href: "/model-studies/how-it-works#voice-influence",
        label: "Our Voice Influence study",
      },
    ],
    descAfter: " targets this.",
  },
  {
    title: "Brand influence",
    question: "Is credit following the idea — or the logo?",
    descBefore: "When provider names are visible, judgment can track the brand instead of the argument. ",
    links: [
      {
        href: "/model-studies/how-it-works#authorship-influence",
        label: "Our Authorship study",
      },
    ],
    descAfter: " measures this.",
  },
  {
    title: "Self-preference",
    question: "Is this idea supported because it's stronger — or because it's the author's own?",
    descBefore:
      "A synthesizer favoring its own prior output simply because it wrote it, not because the reasoning is better. ",
    links: [
      {
        href: "/model-studies/how-it-works#authorship-influence",
        label: "Our Authorship study",
      },
    ],
    descAfter: " measures this.",
  },
  {
    title: "Lost dissent",
    question: "Was this agreement independent — or did one early take silence the rest?",
    descBefore:
      "When models see each other's answers first, real disagreement can collapse before it forms. We run them independently first so important dissent survives — the same pattern ",
    links: [
      {
        href: "#literature",
        label: "human psychology research",
      },
    ],
    descAfter: " on conformity and groupthink supports.",
  },
] as const;

const AI_LITERATURE = [
  {
    label: "Sycophancy is documented.",
    authors: "Sharma et al. (2023)",
    title: "Towards Understanding Sycophancy in Language Models",
    venue: "arXiv:2310.13548",
    finding:
      "found sycophancy across RLHF-trained assistants from multiple providers, tracing it to preference data that rewards agreement over truthfulness.",
  },
  {
    label: "The evaluation method has precedent.",
    authors: "Perez et al. (2022)",
    title: "Discovering Language Model Behaviors with Model-Written Evaluations",
    venue: "arXiv:2212.09251",
    finding:
      "generated evaluation scenarios at scale and scored them against a fixed rubric, rather than judging behavior case-by-case. Same structure this site runs.",
  },
  {
    label: "The sycophancy trigger is confirmed.",
    authors: "Wei et al. (2023)",
    title: "Simple Synthetic Data Reduces Sycophancy in Large Language Models",
    venue: "arXiv:2308.03958",
    finding:
      "models solved simple factual problems correctly on their own, but reversed once a user endorsed a wrong answer first. Worse at scale, not better.",
  },
] as const;

const HUMAN_PSYCHOLOGY = [
  {
    label: "Conformity under group pressure.",
    authors: "Asch, S. E. (1951)",
    title: "Effects of group pressure upon the modification and distortion of judgment",
    venue: "In H. Guetzkow (Ed.), Groups, leadership and men (pp. 177–190). Carnegie Press",
    finding:
      "People gave answers they knew were wrong just to match the group around them. See also Asch (1956), Studies of independence and conformity: I. A minority of one against a unanimous majority. Psychological Monographs: General and Applied, 70(9), 1–70.",
  },
  {
    label: "Groupthink suppresses dissent.",
    authors: "Janis, I. L. (1972)",
    title: "Victims of groupthink: A psychological study of foreign-policy decisions and fiascoes",
    venue: "Houghton Mifflin",
    finding:
      "A visible, cohesive group suppresses dissent and critical judgment in favor of consensus.",
  },
] as const;

export default function WhyPage() {
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
            Why it matters
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white leading-tight sm:text-4xl lg:text-5xl">
            An AI that agrees with you isn&apos;t the same as an AI that&apos;s correct
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">
            Advice can fail in quieter ways than a wrong fact — sycophancy, favoritism, groupthink
            suppressing dissent. We publish measured results on those failure modes and more — and
            use what we find to shape the product.
          </p>
        </div>
      </section>

      {/* Research → product */}
      <section
        id="research-to-product"
        className="scroll-mt-24 border-b border-zinc-100 bg-white py-16"
      >
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
            Research feeds product design
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            What we find changes how Decision Copilot is built
          </h2>
          <p className="mt-5 text-base leading-relaxed text-zinc-600">
            Model Studies isn&apos;t observation for its own sake. The failure modes below are the
            questions we investigate, and what we learn feeds directly back into how the product
            works.
          </p>
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
              Research → product
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900">
              Authorship study findings → blind authorship is now the default
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Our{" "}
              <Link
                href="/model-studies/findings/brand-favoritism"
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Authorship study
              </Link>{" "}
              discovered that when several models&apos; analyses are merged into a Unified Brief and
              provider names are visible, judgment can track the brand instead of the argument. After
              measuring that brand bias, we adapted Decision Copilot to hide provider names from the
              synthesizer by default, so the reasoning is weighed on its merits rather than its
              brand.
            </p>
          </div>
        </div>
      </section>

      {/* Failure modes */}
      <section className="border-b border-zinc-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              Failure modes we care about
            </h2>
            <p className="mt-3 text-zinc-500">
              Catching a made-up fact is not the only way advice can go wrong under decision
              pressure — and it&apos;s easier for a product to claim these are solved than to show
              the work. Our Model Studies aim to show that work.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2">
            {FAILURE_MODES.map((mode) => (
              <div
                key={mode.title}
                className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-6 shadow-sm shadow-zinc-100"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                  {mode.title}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900">{mode.question}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  {mode.descBefore}
                  {mode.links.map((link, i) => (
                    <span key={link.href}>
                      {i > 0 ? " " : null}
                      <Link
                        href={link.href}
                        className="font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        {link.label}
                      </Link>
                    </span>
                  ))}
                  {mode.descAfter}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Synthesizer / groupthink */}
      <section className="border-b border-zinc-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              Sycophancy risk shows up when models combine work
            </h2>
            <p className="mt-3 text-zinc-500">
              Sycophancy is usually framed as model-vs-user. The same mechanism — preference for the
              familiar over the correct — can hit the synthesizer that merges several analyses into
              one brief.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl rounded-xl border border-zinc-200 bg-zinc-50/80 p-6">
            <h3 className="text-sm font-semibold text-zinc-900">If brands are visible</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              A synthesizer can favor a familiar brand&apos;s phrasing — or its own outputs —
              independent of whether the reasoning underneath is actually stronger. Judgment
              starts tracking the source instead of the argument.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
              Authorship conditions
            </p>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">
              How much brand the synthesizer sees
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              When several models&apos; analyses are merged into one Unified Brief, an authorship
              condition controls whether the synthesizer sees real provider names. Decision Copilot
              defaults to Blind; Revealed is a choice in the product; Reassigned is how we
              measure brand influence in our Authorship study.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Blind",
                  role: "Product default",
                  desc: "Provider names are hidden. The synthesizer sees AI Model 1, 2, 3… and the reasoning only — so brand can't steer what gets kept.",
                },
                {
                  title: "Revealed",
                  role: "Available in the product",
                  desc: "Real provider names are visible to the synthesizer. Use it when you want named voices in the merge — or to compare against Blind.",
                },
                {
                  title: "Reassigned",
                  role: "Research condition",
                  desc: "Brand names stay in the prompt, but they're randomly remapped (each voice gets a unique wrong label). Shows whether credit follows the logo or the idea.",
                },
              ].map((mode) => (
                <div
                  key={mode.title}
                  className="rounded-xl border border-zinc-200 bg-white p-5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
                    {mode.role}
                  </p>
                  <h4 className="mt-1.5 text-sm font-semibold text-zinc-900">{mode.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{mode.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Academic grounding */}
      <section id="literature" className="scroll-mt-24 border-b border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
              Academic grounding
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
              The literature confirms our approach
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                AI research
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Language-model papers that document sycophancy and how to evaluate it.
              </p>
              <div className="mt-5 space-y-5 text-sm leading-relaxed text-zinc-600">
                {AI_LITERATURE.map((item) => (
                  <div key={item.label}>
                    <p className="font-semibold text-zinc-900">{item.label}</p>
                    <p className="mt-1.5">
                      {item.authors}, <em>{item.title}</em> ({item.venue}) — {item.finding}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div
              id="human-psychology"
              className="scroll-mt-24 rounded-xl border border-zinc-200 bg-white p-6 sm:p-7"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                Human psychology
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Classic group-dynamics work — same pattern when identity or authorship is visible.
              </p>
              <div className="mt-5 space-y-5 text-sm leading-relaxed text-zinc-600">
                {HUMAN_PSYCHOLOGY.map((item) => (
                  <div key={item.label}>
                    <p className="font-semibold text-zinc-900">{item.label}</p>
                    <p className="mt-1.5">
                      {item.authors}. <em>{item.title}</em>. {item.venue}. — {item.finding}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-4xl text-center text-sm leading-relaxed text-zinc-500">
            What&apos;s specific here isn&apos;t the phenomenon — it&apos;s measuring it against a
            fixed decision rubric, with blind multi-model coding, on adversarially framed intakes.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            See how the studies run
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/model-studies/how-it-works"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              How it works →
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
