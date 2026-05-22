import Link from "next/link";
import { LogoLockup } from "@/app/components/logo-icon";
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

// ── Hero mockup card ──────────────────────────────────────────────────────────

function HeroMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0 select-none pointer-events-none">
      {/* Glow behind cards */}
      <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-3xl scale-90" />

      {/* Main card */}
      <div className="relative rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-zinc-500 font-mono">decision brief</span>
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
              { label: "People", value: "Med", color: "text-blue-400 bg-blue-950/50 border-blue-900/50" },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border px-2 py-2 text-center ${item.color}`}>
                <div className="text-[9px] uppercase tracking-wide opacity-70 mb-0.5">{item.label}</div>
                <div className="text-xs font-semibold">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Top risks</div>
            {["Cold start latency on Lambda@Edge", "Hidden pipeline migration complexity", "On-call burden shift to eng team"].map((r) => (
              <div key={r} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500/70 shrink-0" />
                <span className="text-[11px] text-zinc-400 leading-snug">{r}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mb-1">Recommendation</div>
            <div className="text-[11px] text-zinc-300 leading-relaxed">Run a 30-day parallel deployment on a single non-critical service before committing to full migration.</div>
          </div>
        </div>
      </div>

      {/* Floating secondary card */}
      <div className="absolute -bottom-6 -right-6 w-48 rounded-xl border border-white/10 bg-zinc-900/90 shadow-xl p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Research finding</div>
        <div className="text-[11px] text-zinc-300 leading-snug">Vercel costs 3–5× more than Fargate at scale; gap widens past ~10M req/month.</div>
        <div className="flex items-center gap-1">
          <div className="h-1 w-1 rounded-full bg-green-400" />
          <span className="text-[10px] text-zinc-500">Live web search</span>
        </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LogoLockup />
            </div>
          </div>
          <SessionNav />
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-zinc-950 pt-20 pb-28 lg:pt-28 lg:pb-36">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Gradient blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Powered by OpenAI · Anthropic · Google Gemini · xAI
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                Make better<br />
                <span className="text-indigo-400">decisions</span>, faster.
              </h1>
              <p className="mt-5 text-lg text-zinc-400 leading-relaxed max-w-lg">
                AI-powered decision analysis that maps risks, surfaces blind spots,
                stress-tests your thinking, and produces a structured brief — across multiple AI perspectives.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/intake"
                  className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Start a decision →
                </Link>
                <Link
                  href="/intake"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Try a demo scenario
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
                {["Risk · Reversibility · People lenses", "Clarifying questions", "Research integration", "PDF export"].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-500"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: mockup */}
            <div className="mt-14 lg:mt-0">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── What it does ── */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">Structured analysis, not just answers</h2>
            <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
              Most AI tools give you a response. Decision Copilot gives you a framework — then pushes back on it.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <IconRisk />,
                title: "Risk lens",
                desc: "Surfaces top risks, hidden assumptions, and blind spots you may not have considered.",
                color: "text-red-500 bg-red-50",
              },
              {
                icon: <IconReversibility />,
                title: "Reversibility lens",
                desc: "Identifies which steps lock you in, and what's safe to try first without full commitment.",
                color: "text-amber-500 bg-amber-50",
              },
              {
                icon: <IconPeople />,
                title: "People lens",
                desc: "Maps stakeholder impacts, execution risks, and who needs to be brought along.",
                color: "text-blue-500 bg-blue-50",
              },
              {
                icon: <IconResearch />,
                title: "Research integration",
                desc: "Ask follow-up research questions with live web search. Findings feed back into the analysis.",
                color: "text-violet-500 bg-violet-50",
              },
              {
                icon: <IconCompare />,
                title: "Cross-provider comparison",
                desc: "Run the same decision through multiple AI models and compare where they agree — and diverge.",
                color: "text-indigo-500 bg-indigo-50",
              },
              {
                icon: <IconBrief />,
                title: "Decision Brief",
                desc: "A clean, exportable summary with recommendation, key considerations, and next steps.",
                color: "text-emerald-500 bg-emerald-50",
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

      {/* ── Use cases ── */}
      <section className="bg-zinc-50 py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">Built for real decisions</h2>
            <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
              Not hypotheticals. The kind of calls that keep you up at night.
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

      {/* ── How it works ── */}
      <section className="bg-white py-20 border-b border-zinc-100">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">How it works</h2>
          </div>
          <div className="space-y-8">
            <Step n="1" title="Describe your decision" desc="Paste in your situation, constraints, and what you know. Choose a posture: explore, pressure test, surface risks, or generate alternatives." />
            <Step n="2" title="Choose your analysis lens" desc="Select which AI provider to use — or run all four simultaneously and compare outputs." />
            <Step n="3" title="Answer clarifying questions" desc="The model asks what it needs to know: missing context, unstated assumptions, key unknowns. Your answers sharpen the analysis." />
            <Step n="4" title="Get a structured brief" desc="A decision brief with risks, tradeoffs, stakeholder impacts, recommendation, and next steps — ready to export as a PDF." />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-zinc-950 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Ready to decide better?</h2>
          <p className="mt-3 text-zinc-400 max-w-md mx-auto">
            Paste in your situation and get a structured multi-lens analysis in minutes.
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
          <span className="text-sm text-zinc-600">Decision Copilot</span>
          <span className="text-sm text-zinc-600">Powered by OpenAI · Anthropic · Google Gemini · xAI</span>
        </div>
      </footer>

    </div>
  );
}
