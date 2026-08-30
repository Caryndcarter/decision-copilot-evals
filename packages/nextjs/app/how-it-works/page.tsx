import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { HowItWorksFlowSection } from "@/app/components/how-it-works-flow-section";
import { SessionNav } from "@/app/components/session-nav";

export const metadata: Metadata = {
  title: "How it works — Decision Copilot",
  description:
    "From intake through think tank to Unified Brief — what you get, how synthesis works, contributions, and PDF export.",
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

      <section className="relative overflow-hidden border-b border-zinc-100 bg-zinc-950 py-16 lg:py-24">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">Product</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white leading-tight sm:text-4xl lg:text-5xl">
            How Decision Copilot works
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">
            You bring the decision. Independent models pressure-test the same facts. You get
            structured briefs — and, when you run a think tank, one merged{" "}
            <strong className="font-semibold text-white">Unified Brief</strong> you can discuss,
            attribute, and export.
          </p>
        </div>
      </section>

      <section id="flow" className="scroll-mt-24 border-b border-zinc-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <HowItWorksFlowSection showUnifiedBriefCta={false} linkIntroUnifiedBrief={false} />
        </div>
      </section>

      <section id="unified-brief" className="scroll-mt-24 border-b border-zinc-100 bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading
            eyebrow="Unified Brief"
            title="What's in a Unified Brief"
            dek="One merged brief from your think tank — written blind by default so ideas beat brand names."
          />

          <div className="mt-8 space-y-4">
            <SubBlock title="What's inside">
              <p>
                A <strong className="font-medium text-zinc-800">Unified Brief</strong> is one
                structured decision write-up — not a chat transcript. When you run a think tank,
                each model first produces its own{" "}
                <strong className="font-medium text-zinc-800">Decision Brief</strong> on your
                decision. One model you choose — the{" "}
                <strong className="font-medium text-zinc-800">synthesizer</strong> — merges all of
                that into a single Unified Brief.
              </p>
              <p>That merged brief typically includes:</p>
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
                  — what could go wrong, how hard it is to undo, and who has to live with the
                  outcome; so you don&apos;t get a good-on-paper answer that skips downside,
                  lock-in, or the people involved
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
                  <strong className="font-medium text-zinc-800">Research & variants</strong> — live
                  web lookups for current facts, plus alternate scenarios or what-if branches you
                  saved along the way; folded into the merge, not bolted on afterward
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

            <SubBlock title="Fact-check pass (optional)">
              <p>
                After the synthesizer writes the Unified Brief, an optional{" "}
                <strong className="font-medium text-zinc-800">fact-check pass</strong> can run — a
                separate judge with web search flags public factual errors and rewrites the draft
                without changing the recommendation.
              </p>
            </SubBlock>

            <SubBlock title="Download as PDF">
              <p>
                Use <strong className="font-medium text-zinc-800">PDF</strong> on the Unified Brief
                page to save or print — contributions appendix optional.
              </p>
            </SubBlock>

            <SubBlock title="Contributions — whose ideas made the cut">
              <p>
                After the merge, the synthesizer runs a{" "}
                <strong className="font-medium text-zinc-800">contributions analysis</strong>: for
                every think-tank member it states what was adopted, what was distinct, what was left
                out, and an influence rating (high / medium / low / minimal).
              </p>
              <p>
                That&apos;s attribution <em>after</em> the blind merge — transparency without letting
                brand bias into the recommendation itself. The PDF appendix can include this breakdown.
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
