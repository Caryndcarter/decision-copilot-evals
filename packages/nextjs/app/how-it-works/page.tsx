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

/** Room for sticky main nav + in-page pill bar (~160px). */
const PAGE_SCROLL_MT = "scroll-mt-40";

/** Zero-height anchor so hash scroll lands above the visible heading. */
function ScrollAnchor({ id }: { id: string }) {
  return <span id={id} className={`block h-0 ${PAGE_SCROLL_MT}`} aria-hidden />;
}

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
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-logo">{eyebrow}</p>
      ) : null}
      <h2 className={`${eyebrow ? "mt-2" : ""} text-2xl font-bold tracking-tight text-zinc-900`}>
        {title}
      </h2>
      {dek ? <p className="mt-3 text-sm leading-relaxed text-zinc-600">{dek}</p> : null}
    </div>
  );
}

function SubBlock({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className={
        id
          ? `${PAGE_SCROLL_MT} rounded-xl border border-zinc-200 bg-white p-6 shadow-sm`
          : "rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      }
    >
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-zinc-600">{children}</div>
    </div>
  );
}

function BriefItem({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{children}</p>
    </div>
  );
}

const PAGE_NAV = [
  { href: "#flow", label: "The flow" },
  { href: "#unified-brief", label: "Unified Brief" },
  { href: "#postures", label: "Postures" },
  { href: "#discuss", label: "Chat" },
] as const;

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
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-logo/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-logo-light">Product</p>
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

      <div className="sticky top-[65px] z-40 border-b border-zinc-100 bg-zinc-50/95 py-5 backdrop-blur-sm">
        <nav aria-label="On this page" className="mx-auto flex max-w-3xl justify-center px-6">
          <div className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-zinc-200 bg-white p-1.5 shadow-sm">
            {PAGE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-indigo-600"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <section id="flow" className={`${PAGE_SCROLL_MT} border-b border-zinc-100 bg-white py-16`}>
        <div className="mx-auto max-w-3xl px-6">
          <HowItWorksFlowSection
            sectionTitle="The four steps"
            showUnifiedBriefCta={false}
            linkIntroUnifiedBrief={false}
          />
        </div>
      </section>

      <section id="unified-brief" className={`${PAGE_SCROLL_MT} border-b border-zinc-100 bg-zinc-50 py-16`}>
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading
            eyebrow="Unified Brief"
            title="What's in a Unified Brief"
            dek="One merged brief from your think tank — written blind by default so ideas beat brand names."
          />

          <div className="mt-10 space-y-10">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
                How it&apos;s built
              </h3>
              <p className="mt-3 text-base leading-relaxed text-zinc-700">
                Run a think tank and each model produces its own{" "}
                <strong className="font-medium text-zinc-900">Decision Brief</strong>. You pick a{" "}
                <strong className="font-medium text-zinc-900">synthesizer</strong> to merge those
                into one <strong className="font-medium text-zinc-900">Unified Brief</strong> — a
                structured write-up, not a chat transcript.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
                What&apos;s in the document
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <BriefItem title="Situation & summary">
                  The merged read of what&apos;s on the table.
                </BriefItem>
                <BriefItem
                  title={
                    <Link
                      href="/#three-lenses"
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Risk, Reversibility, Stakeholders
                    </Link>
                  }
                >
                  What could go wrong, how hard it is to undo, and who bears the consequences.
                </BriefItem>
                <BriefItem title="Recommendation">One clear call from the think tank&apos;s best ideas.</BriefItem>
                <BriefItem title="Key considerations & next steps">
                  Tradeoffs to keep visible and concrete next steps you can act on.
                </BriefItem>
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                From chat
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                Spun off from your conversation with the models and folded into the same document.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <BriefItem title="Research">
                  An optional &ldquo;show your work&rdquo; addendum. Ask a model to justify its
                  reasoning and the supporting lookups and evidence it surfaces are saved here.
                </BriefItem>
                <BriefItem title="Variants">
                  Alternate framings or what-if branches you spin off from chat and keep, so the
                  brief can weigh them too.
                </BriefItem>
              </div>
            </div>

            <div>
              <ScrollAnchor id="postures" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Postures — how you frame the analysis
              </h3>
              <p className="mt-3 text-base leading-relaxed text-zinc-700">
                At intake you choose <em>how</em> models analyze the decision. Every brief still runs
                through the same{" "}
                <Link
                  href="/#three-lenses"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  three lenses
                </Link>
                ; the posture sets the emphasis:
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Compare options openly", "Balanced paths — no preferred direction assumed."],
                  ["Challenge my leaning", "Pressure-test your plan; downsides and blind spots."],
                  ["Show me the opposition", "Steelman the strongest case against your lean."],
                  ["Risk-first", "Downside scan — risks and hidden assumptions first."],
                  ["Widen the option set", "Alternatives and adjacent factors you may not have named."],
                ].map(([name, desc]) => (
                  <div key={name} className="rounded-lg border border-zinc-200/80 bg-white p-4">
                    <p className="text-sm font-semibold text-zinc-900">{name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                Prefer a different shape? Use <strong className="font-medium text-zinc-800">freeform</strong>{" "}
                and let the model choose its own structure.
              </p>
            </div>

            <SubBlock id="discuss" title="Chat is where the work happens">
              <p>
                A brief isn&apos;t a static document — it&apos;s a conversation. Chat with any model,
                or the synthesizer, to press on the reasoning, challenge a call, and reshape the
                brief in place. It&apos;s also where you spin off the research and variants that fold
                back into the document.
              </p>
              <ul className="mt-3 list-disc space-y-3 pl-5">
                <li>
                  <strong className="font-medium text-zinc-800">Decision Briefs</strong> — chat in
                  Discuss &amp; clarify; edit sections in place; ask for new views.
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Unified Brief</strong> — discuss with
                  the synthesizer or any reviewer; ask why an idea was left out; regenerate when you
                  want the written merge to change.
                </li>
                <li>
                  <strong className="font-medium text-zinc-800">Contributions</strong> — see what
                  each model contributed after the blind merge; export as PDF with an optional
                  appendix.
                </li>
              </ul>
            </SubBlock>

            <SubBlock id="fact-check" title="Fact-check pass (optional)">
              <p>
                A separate judge with web search can flag public factual errors and rewrite the draft
                — without changing the recommendation.
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
              Try a demo →
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
