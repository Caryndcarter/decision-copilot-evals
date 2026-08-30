import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { HowItWorksFlowSection } from "@/app/components/how-it-works-flow-section";
import { SessionNav } from "@/app/components/session-nav";

export const metadata: Metadata = {
  title: "How it works — Decision Copilot",
  description:
    "From intake through think tank to Unified Brief — what you get, how synthesis works, contributions, influence charts, and PDF export.",
};

function SectionHeading({
  id,
  eyebrow,
  title,
  dek,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  dek?: string;
}) {
  return (
    <div id={id} className={id ? "scroll-mt-24" : undefined}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{eyebrow}</p>
      ) : null}
      <h2 className={`${eyebrow ? "mt-2" : ""} text-2xl font-bold tracking-tight text-zinc-900`}>
        {title}
      </h2>
      {dek ? <p className="mt-3 text-sm leading-relaxed text-zinc-600">{dek}</p> : null}
    </div>
  );
}

function SubBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-600">{children}</div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <SessionNav />
        </div>
      </nav>

      <section className="border-b border-zinc-100 bg-zinc-950 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">Product</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How Decision Copilot works
          </h1>
          <p className="mt-5 text-base leading-relaxed text-zinc-300">
            You bring the decision. Independent models pressure-test the same facts. You get
            structured briefs — and, when you run a think tank, one merged{" "}
            <strong className="font-semibold text-white">Unified Brief</strong> you can discuss,
            attribute, and export.
          </p>
        </div>
      </section>

      <section id="flow" className="scroll-mt-24 border-b border-zinc-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <HowItWorksFlowSection introLinkHref="#unified-brief" unifiedBriefCtaHref="#unified-brief" />
        </div>
      </section>

      <section id="unified-brief" className="scroll-mt-24 border-b border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading
            eyebrow="Unified Brief"
            title="What's in a Unified Brief"
            dek="One synthesizer merges every model's Decision Brief, your research, and saved variants into one Unified Brief — written blind by default so ideas beat brand names."
          />

          <div className="mt-8 space-y-4">
            <SubBlock title="What's inside">
              <p>
                A Unified Brief is still a structured decision artifact — not a chat transcript. It
                typically includes:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="font-medium text-zinc-800">Situation & summary</strong> — the
                  merged read of what&apos;s on the table
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">
                    <Link
                      href="/#three-lenses"
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Risk, Reversibility, Stakeholders
                    </Link>
                  </strong>{" "}
                  — the same three lenses every Decision Brief uses, so you can compare models apples
                  to apples
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Recommendation</strong> — one clear
                  call drawn from the think tank&apos;s best ideas
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Key considerations & next steps</strong>{" "}
                  — tradeoffs to keep visible and actions you can take this week
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Research & variants</strong> — live web
                  research and any saved scenario variants you asked for are folded into the synthesis
                  prompt, not bolted on afterward
                </li>
              </ul>
            </SubBlock>

            <SubBlock title="Postures — how you frame the analysis">
              <p>
                At intake you tell your think tank <em>how</em> to analyze the decision — that&apos;s
                your <strong className="font-medium text-zinc-800">posture</strong>. Every structured
                Decision Brief still uses the same{" "}
                <Link
                  href="/#three-lenses"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Risk / Reversibility / Stakeholders
                </Link>{" "}
                skeleton; the posture changes what models emphasize:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="font-medium text-zinc-800">Compare options openly</strong> —
                  balanced analysis across paths, no preferred direction assumed
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Challenge my leaning</strong> —
                  pressure-test the plan you&apos;re considering, with downsides and blind spots
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Show me the opposition</strong> —
                  steelman the strongest case against your lean
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Risk-first</strong> — thorough
                  downside scan; risks and hidden assumptions front and center
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Widen the option set</strong> —
                  alternative paths and adjacent factors you might not have named
                </li>
              </ul>
              <p>
                If the standard brief isn&apos;t the right fit,{" "}
                <strong className="font-medium text-zinc-800">freeform</strong> lets the model choose
                its own structure instead. In a think tank, every model works from the same intake and
                posture before their outputs merge into one Unified Brief.
              </p>
            </SubBlock>

            <SubBlock title="How one is made">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Each think-tank member finishes its own Decision Brief on the same intake (after
                  clarifications).
                </li>
                <li>
                  You pick a <strong className="font-medium text-zinc-800">synthesizer</strong> — any
                  configured model can merge (OpenAI, Anthropic, Gemini, or xAI).
                </li>
                <li>
                  The synthesizer receives every lane&apos;s structured output, research notes, and
                  variants, then writes one JSON brief. By default it runs in{" "}
                  <strong className="font-medium text-zinc-800">Blind</strong> authorship: provider
                  names are hidden during the merge so credit follows ideas, not logos.
                </li>
                <li>
                  An optional <strong className="font-medium text-zinc-800">fact-check pass</strong>{" "}
                  can run afterward — a separate judge with web search flags public factual errors and
                  rewrites the draft without changing the recommendation.
                </li>
              </ol>
              <p className="pt-1">
                You can regenerate under <strong className="font-medium text-zinc-800">Revealed</strong>{" "}
                (real brand names visible) or <strong className="font-medium text-zinc-800">Reassigned</strong>{" "}
                (brands swapped) to study authorship effects — Blind stays the product default.
              </p>
            </SubBlock>

            <SubBlock title="Download as PDF">
              <p>
                On the Unified Brief page, use <strong className="font-medium text-zinc-800">PDF</strong>{" "}
                to print or save. The export includes the brief itself plus optional appendices:
                contribution attribution (who influenced the merge) and influence heatmaps when
                you&apos;ve generated them. Browser print → &quot;Save as PDF&quot; works the same way
                as on individual Decision Briefs.
              </p>
            </SubBlock>

            <SubBlock title="Contributions — whose ideas made the cut">
              <p>
                After synthesis, the Unified Brief&apos;s author runs a{" "}
                <strong className="font-medium text-zinc-800">contributions analysis</strong>: for
                every think-tank member it states what was adopted, what was distinct, what was left
                out, and an influence rating (high / medium / low / minimal).
              </p>
              <p>
                That&apos;s attribution <em>after</em> the blind merge — transparency without letting
                brand bias into the recommendation itself. The PDF appendix can include this breakdown.
              </p>
            </SubBlock>

            <SubBlock title="Influence charts — how each author weighted the room">
              <p>
                When multiple synthesizers each produce a Unified Brief, every author can also rate
                how much each think-tank member influenced <em>their</em> merge. Influence charts
                show rater × rated heatmaps and averages — including side-by-side comparisons across
                Blind, Revealed, and Reassigned authorship.
              </p>
              <p>
                This is the layer our{" "}
                <Link href="/model-studies" className="font-semibold text-indigo-600 hover:text-indigo-800">
                  Model Studies
                </Link>{" "}
                authorship research measures: does credit track the idea or the logo?
              </p>
            </SubBlock>

            <SubBlock title="Ethics audit (optional)">
              <p>
                You can also run a blind <strong className="font-medium text-zinc-800">moral audit</strong>{" "}
                on a Unified Brief — eight domain-agnostic dimensions (tradeoff honesty, whose
                downside is protected, and similar) scored by a separate reviewer that never sees
                which model wrote the brief.
              </p>
            </SubBlock>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/intake"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Start a decision →
            </Link>
            <Link
              href="/tour"
              className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Take the product tour
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            ← Back to homepage
          </Link>
        </div>
      </section>
    </div>
  );
}
