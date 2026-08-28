import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function IconRisk() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function IconReversibility() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
    </svg>
  );
}

function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconResearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function IconCompare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 20 22 16 18 12"/>
      <line x1="2" y1="16" x2="22" y2="16"/>
      <polyline points="6 4 2 8 6 12"/>
      <line x1="2" y1="8" x2="22" y2="8"/>
    </svg>
  );
}

function IconBrief() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconThinkTank() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <circle cx="5" cy="8" r="2"/>
      <circle cx="19" cy="8" r="2"/>
      <circle cx="5" cy="16" r="2"/>
      <circle cx="19" cy="16" r="2"/>
      <line x1="9.5" y1="10.2" x2="6.8" y2="9.2"/>
      <line x1="14.5" y1="10.2" x2="17.2" y2="9.2"/>
      <line x1="9.5" y1="13.8" x2="6.8" y2="14.8"/>
      <line x1="14.5" y1="13.8" x2="17.2" y2="14.8"/>
    </svg>
  );
}

function IconAttribution() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  );
}

// ── Hero mockup: think tank → unified brief ───────────────────────────────────

const ADVISOR_PILLS = [
  { label: "OpenAI", color: "text-emerald-300 bg-emerald-950/60 border-emerald-800/50" },
  { label: "Anthropic", color: "text-orange-300 bg-orange-950/60 border-orange-800/50" },
  { label: "Gemini", color: "text-blue-300 bg-blue-950/60 border-blue-800/50" },
  { label: "xAI", color: "text-zinc-300 bg-zinc-800/60 border-zinc-700/50" },
];

function ThinkTankMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0 select-none pointer-events-none">
      <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-3xl scale-90" />

      {/* Advisor panel row */}
      <div className="relative mb-3 flex flex-wrap justify-center gap-1.5">
        {ADVISOR_PILLS.map((p) => (
          <span
            key={p.label}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${p.color}`}
          >
            {p.label}
          </span>
        ))}
      </div>

      {/* Convergence hint */}
      <div className="relative flex justify-center mb-2">
        <div className="flex items-center gap-1 text-[10px] text-indigo-400/80 uppercase tracking-widest font-semibold">
          <span className="h-px w-8 bg-indigo-500/40" />
          synthesize
          <span className="h-px w-8 bg-indigo-500/40" />
        </div>
      </div>

      {/* Unified Brief card */}
      <div className="relative rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-zinc-500 font-mono">unified brief</span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-1">Situation</div>
            <div className="text-xs text-zinc-300 leading-relaxed">Migrate from Vercel to AWS self-hosted infrastructure to reduce costs from $5k → $600/month.</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Risk", value: "High", color: "text-red-400 bg-red-950/50 border-red-900/50" },
              { label: "Reversibility", value: "Low", color: "text-amber-400 bg-amber-950/50 border-amber-900/50" },
              { label: "Stakeholders", value: "Med", color: "text-blue-400 bg-blue-950/50 border-blue-900/50" },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border px-2 py-2 text-center ${item.color}`}>
                <div className="text-[9px] uppercase tracking-wide opacity-70 mb-0.5">{item.label}</div>
                <div className="text-xs font-semibold">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-1">Recommendation</div>
            <div className="text-[11px] text-zinc-300 leading-relaxed">Run a 30-day parallel deployment on a single non-critical service before committing to full migration.</div>
          </div>
        </div>
      </div>

      {/* Floating contributions card */}
      <div className="absolute -bottom-6 -left-4 w-44 rounded-xl border border-white/10 bg-zinc-900/90 shadow-xl p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Contributions</div>
        <div className="text-[11px] text-zinc-300 leading-snug">Whose ideas made the cut — attribution across every model in your think tank.</div>
        <div className="flex flex-wrap gap-1">
          {["Anthropic", "OpenAI", "Gemini"].map((p) => (
            <span key={p} className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">{p}</span>
          ))}
        </div>
      </div>

      {/* Floating research card */}
      <div className="absolute -top-4 -right-4 w-40 rounded-xl border border-white/10 bg-zinc-900/90 shadow-xl p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Research</div>
        <div className="text-[11px] text-zinc-300 leading-snug">Live web search feeds back into your think tank&apos;s analysis.</div>
      </div>
    </div>
  );
}

// ── Use case card ─────────────────────────────────────────────────────────────

function UseCaseCard({ icon, title, scenario, posture }: {
  icon: React.ReactNode;
  title: string;
  scenario: string;
  posture: string;
}) {
  return (
    <div className="group rounded-xl border border-zinc-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">{icon}</div>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">{posture}</span>
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{scenario}</p>
    </div>
  );
}

// ── Step ─────────────────────────────────────────────────────────────────────

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">{n}</div>
      <div>
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="mt-0.5 text-sm text-zinc-500 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

/** Positioning vs general multi-model chat tools — no competitor names. */
const MULTI_MODEL_DIFFERENCES = [
  {
    dim: "What disagreement means",
    theirs: "Models catch each other's factual errors and hallucinations.",
    ours: "Models are checked for whether they honestly pressure-test your plan — or reinforce what you already lean toward.",
  },
  {
    dim: "Output consistency",
    theirs: "Shape varies by conversation mode — debate, red-team, freeform.",
    ours: "Every brief uses the same Risk / Reversibility / Stakeholders rubric — comparable across models and over time.",
  },
  {
    dim: "Unit of work",
    theirs: "An open-ended conversation thread.",
    ours: "A specific decision, with a brief you can point to later and defend.",
  },
  {
    dim: "Irreversibility",
    theirs: "Not a distinct concept.",
    ours: "A first-class lens: what's safe to try, what's irreversible, and what must clear first.",
  },
  {
    dim: "Evidence behind the claims",
    theirs: "A feature description — AIs flag each other's inconsistencies.",
    ours: "Case-based research: blind-coded dimensions with source quotes you can browse.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <AppNavBrand />
          <SessionNav />
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-zinc-950 pt-20 pb-28 lg:pt-28 lg:pb-36">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Your AI think tank · OpenAI · Anthropic · Gemini · xAI
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                Turn AI models into<br />
                <span className="text-indigo-400">your own think tank.</span>
              </h1>
              <p className="mt-5 text-lg text-zinc-300 leading-relaxed max-w-lg">
                You&apos;re facing a decision with real stakes — stay or migrate, hire or restructure,
                build or buy. There&apos;s no obvious right answer, and one chatbot reply
                usually isn&apos;t enough.
              </p>
              <p className="mt-4 text-base text-zinc-400 leading-relaxed max-w-lg">
                Decision Copilot is built for that moment. You describe what&apos;s going on:
                your situation, constraints, what you know and what you don&apos;t. Multiple AI
                models analyze the same brief independently — and you get structured output you
                can compare, refine, and act on together with your AI think tank — best-of-all-worlds
                thinking that pulls the strongest ideas from every perspective into one recommendation.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/intake"
                  className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Describe your decision →
                </Link>
                <Link
                  href="/tour"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  See how it works →
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
                {[
                  "Paste in your real situation",
                  "Choose how to analyze it",
                  "One model or your full think tank",
                  "Exportable brief",
                ].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-500"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mt-14 lg:mt-0 pt-6">
              <img
                src="/hero-brain.webp"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute left-1/2 top-1/2 z-0 w-[150%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-40 mix-blend-screen"
              />
              <div className="relative z-10">
                <ThinkTankMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">How it works</h2>
            <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
              You bring the decision. Decision Copilot brings structure, follow-up questions, and — if you want —
              more than one AI perspective on the same problem.
            </p>
          </div>
          <div className="space-y-8">
            <Step
              n="1"
              title="Describe what's on the table"
              desc="Paste in your situation: what you're deciding, constraints, what you already know, and what's still unclear. Pick an analysis posture — compare options openly, challenge a leaning, hear the opposition case, focus on risks first, or widen the option set."
            />
            <Step
              n="2"
              title="Convene your think tank"
              desc="Run a single AI model or several at once. Each one reads the same brief and produces its own structured analysis — so you're not relying on one voice for a complicated call."
            />
            <Step
              n="3"
              title="Answer what the models need to know"
              desc="Before finalizing, the models ask follow-up questions: missing context, unstated assumptions, things you'd only know if you were in the room. Your answers sharpen the analysis."
            />
            <Step
              n="4"
              title="Get a brief you can use"
              desc="Each run produces a structured decision brief — risks, tradeoffs, stakeholder impacts, recommendation, next steps. When you've run multiple models, you can also merge them into one Unified Brief and see which ideas from your think tank made the cut."
            />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/tour"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-500"
            >
              See it in action — take the tour →
            </Link>
            <p className="mt-2 text-xs text-zinc-400">Interactive walkthrough · no sign-up required</p>
          </div>
        </div>
      </section>

      {/* ── Why three lenses ── */}
      <section className="bg-zinc-50 py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">
              Why Risk, Reversibility, and Stakeholders?
            </h2>
            <p className="mt-3 text-zinc-500 max-w-2xl mx-auto">
              Most AI answers focus on whether something is a good idea. Important decisions also need
              you to ask what could go wrong, how hard it is to undo, and who has to live with the outcome.
              Every analysis runs through three lenses so you don&apos;t get a technically correct answer
              that ignores downside, lock-in, or the humans involved.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: <IconRisk />,
                title: "Risk",
                question: "What could go wrong?",
                desc: "Surfaces top risks, hidden assumptions, and blind spots — the things that look fine on paper until they aren't.",
                color: "text-red-500 bg-red-50",
              },
              {
                icon: <IconReversibility />,
                title: "Reversibility",
                question: "Can I undo this?",
                desc: "Identifies which steps lock you in and what's safe to try first, before you commit fully.",
                color: "text-amber-500 bg-amber-50",
              },
              {
                icon: <IconPeople />,
                title: "Stakeholders",
                question: "Who does this affect?",
                desc: "Maps stakeholder impacts, execution risks, and who needs to be brought along for this to actually work.",
                color: "text-blue-500 bg-blue-50",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className={`inline-flex p-2.5 rounded-lg mb-4 ${item.color}`}>{item.icon}</div>
                <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-1 text-xs font-medium text-indigo-600">{item.question}</p>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Think tank value ── */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">
              Your think tank on one decision
            </h2>
            <p className="mt-3 text-zinc-500 max-w-2xl mx-auto">
              Not a pile of separate chats — independent analyses on the same brief, then synthesis
              when you&apos;re ready.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <IconThinkTank />,
                title: "Independent think tank analysis",
                desc: "Each model reads your situation and runs the same lenses on its own. Compare where they agree, where they push back, and what only one surfaced.",
                color: "text-indigo-500 bg-indigo-50",
              },
              {
                icon: <IconCompare />,
                title: "Cross-provider comparison",
                desc: "See divergence side by side — useful when models disagree on risk level, reversibility, or who gets affected.",
                color: "text-violet-500 bg-violet-50",
              },
              {
                icon: <IconResearch />,
                title: "Research integration",
                desc: "Ask follow-up research questions with live web search. Findings feed back into the analysis on that run.",
                color: "text-violet-500 bg-violet-50",
              },
              {
                icon: <IconBrief />,
                title: "Unified Brief",
                desc: "When you've run multiple models, merge their output into one synthesized recommendation — exportable as a PDF.",
                color: "text-emerald-500 bg-emerald-50",
              },
              {
                icon: <IconAttribution />,
                title: "Contribution attribution",
                desc: "See whose ideas made the cut in the Unified Brief: what each model contributed, and what didn't survive synthesis.",
                color: "text-orange-500 bg-orange-50",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-6 hover:border-zinc-200 transition-colors">
                <div className={`inline-flex p-2.5 rounded-lg mb-4 ${item.color}`}>{item.icon}</div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── vs multi-model chat tools ── */}
      <section className="bg-zinc-950 py-20 border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-400">
              Not another multi-model chat
            </p>
            <h2 className="mt-3 text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Built for a decision you have to defend — not a thread you browse.
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              Leading multi-model tools orchestrate several AIs in an open conversation.
              Decision Copilot starts from a structured intake and a fixed analytical rubric,
              so disagreement is measurable — and every brief is comparable.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <div className="min-w-[36rem]">
              <div className="grid grid-cols-[minmax(8rem,0.9fr)_1.1fr_1.2fr] gap-x-4 border-b border-white/10 pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <span>Dimension</span>
                <span>Multi-model AI chat</span>
                <span className="text-indigo-300">Decision Copilot</span>
              </div>
              {MULTI_MODEL_DIFFERENCES.map((row) => (
                <div
                  key={row.dim}
                  className="grid grid-cols-[minmax(8rem,0.9fr)_1.1fr_1.2fr] gap-x-4 gap-y-2 border-b border-white/5 py-5"
                >
                  <h3 className="text-base font-semibold text-white sm:text-lg">{row.dim}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500">{row.theirs}</p>
                  <p className="text-sm leading-relaxed text-indigo-100/90">{row.ours}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-10 max-w-2xl text-sm leading-relaxed text-zinc-500">
            The fixed schema is what makes the research program possible: you can code cases
            against the same dimensions because every run shares one skeleton — and compare
            models on a brief you can defend later, not a thread that disappears into chat history.{" "}
            <Link href="/model-studies" className="font-medium text-indigo-400 hover:text-indigo-300">
              See the Model Studies research →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">Built for real decisions</h2>
            <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
              Not hypotheticals. The kind of calls that keep you up at night — the ones that deserve more than one opinion.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <UseCaseCard
              icon={<IconRisk />}
              title="Infrastructure cost decisions"
              scenario="Should we migrate from Vercel to self-hosted AWS to cut costs from $5k to $600/month — and what are we actually risking?"
              posture="Surface risks"
            />
            <UseCaseCard
              icon={<IconPeople />}
              title="Leadership & people calls"
              scenario="Our VP Sales is underperforming. Do we support them with ops, or make a change — and how do we protect the customer relationships?"
              posture="Pressure test"
            />
            <UseCaseCard
              icon={<IconResearch />}
              title="Compliance & regulatory"
              scenario="We're shipping AI features to EU enterprise customers. What's our EU AI Act exposure, and what do RFPs actually require?"
              posture="Surface risks"
            />
            <UseCaseCard
              icon={<IconCompare />}
              title="Strategic M&A"
              scenario="A PE-backed acquisition of a distressed hospital. What's the regulatory path, and can we secure the union agreements?"
              posture="Pressure test"
            />
            <UseCaseCard
              icon={<IconReversibility />}
              title="Office & real estate"
              scenario="Our downtown lease ends in 7 months and we need a hybrid policy. What are the realistic alternatives and hidden costs?"
              posture="Generate alternatives"
            />
            <UseCaseCard
              icon={<IconBrief />}
              title="Tech modernization"
              scenario="Rip-and-replace vs incremental sidecar approach for a 20-year-old core banking system. What's the regulator's likely stance?"
              posture="Surface risks"
            />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-zinc-950 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Have a decision worth thinking through?
          </h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            Describe your situation and get structured analysis back — from one model or your full
            think tank, synthesized into a brief when you need it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/intake"
              className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
            >
              Start a decision →
            </Link>
            <Link
              href="/intake"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-8 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Try a demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-950 border-t border-white/5 py-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between flex-wrap gap-4">
          <span className="text-sm text-zinc-600">Decision Copilot — your AI think tank</span>
          <span className="text-sm text-zinc-600">OpenAI · Anthropic · Google Gemini · xAI</span>
        </div>
      </footer>

    </div>
  );
}
