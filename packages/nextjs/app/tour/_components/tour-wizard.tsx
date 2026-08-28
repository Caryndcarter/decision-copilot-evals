"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  tourDecision as data,
  PROVIDER_META,
  postureLabel,
  getRun,
  getLens,
  type TourProvider,
  type TourLensName,
  type TourBrief,
  type TourLensOutput,
} from "@/app/tour/_data/tour-decision";
import { TOUR_CONTRIBUTIONS, type TourInfluence } from "@/app/tour/_data/tour-contributions";

// ── Static step metadata ──────────────────────────────────────────────────────

const STEPS = [
  { key: "describe", label: "Describe", title: "Describe the decision" },
  { key: "convene", label: "Convene", title: "Convene your think tank" },
  { key: "clarify", label: "Clarify", title: "Answer what the models need to know" },
  { key: "brief", label: "Brief", title: "Get a structured brief" },
  { key: "unify", label: "Compare & unify", title: "Compare models, then synthesize" },
  { key: "start", label: "Your turn", title: "Bring your own decision" },
] as const;

const LENS_META: Record<
  TourLensName,
  { label: string; question: string; text: string; chip: string; ring: string }
> = {
  risk: {
    label: "Risk",
    question: "What could go wrong?",
    text: "text-red-300",
    chip: "bg-red-950/50 border-red-900/50 text-red-300",
    ring: "border-red-900/40",
  },
  reversibility: {
    label: "Reversibility",
    question: "Can I undo this?",
    text: "text-amber-300",
    chip: "bg-amber-950/50 border-amber-900/50 text-amber-300",
    ring: "border-amber-900/40",
  },
  people: {
    label: "People",
    question: "Who does this affect?",
    text: "text-blue-300",
    chip: "bg-blue-950/50 border-blue-900/50 text-blue-300",
    ring: "border-blue-900/40",
  },
};

const INFLUENCE_BADGE: Record<TourInfluence, string> = {
  high: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  medium: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  low: "bg-zinc-700/40 text-zinc-400 border-zinc-600/40",
};

// Curated, coherent sample Q&A drawn from the real clarification round (anonymized).
const CLARIFICATIONS: { lens: TourLensName; q: string; a: string }[] = [
  {
    lens: "risk",
    q: "What is the formal legal assessment of whether these AI features are 'high-risk' under the EU AI Act?",
    a: "Our outside counsel completed an initial assessment in March 2026: none of the three features meet Article 6 high-risk criteria, with a conditional risk if 'ask your data' Q&A outputs feed credit or clinical decisions. Interim mitigations: contractual use restrictions, UI disclaimers, and a human-in-the-loop clause.",
  },
  {
    lens: "reversibility",
    q: "Have you analyzed what a VPC / in-house inference path would take versus a hosted API?",
    a: "Not in depth yet. We plan a two-week feasibility spike on self-hosted inference to quantify latency, cost, and engineering effort before committing to an architecture.",
  },
  {
    lens: "people",
    q: "Who owns compliance and AI governance decisions internally?",
    a: "Legal owns the classification memo and DPA; Security co-owns subprocessor and logging policy. There is no dedicated AI-governance owner yet — a gap we're closing with a fractional consultant.",
  },
];

// ── Small presentational atoms ────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-400">
        {label}
      </div>
      <div className="text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}

function ProviderPill({ provider }: { provider: TourProvider }) {
  const m = PROVIDER_META[provider];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${m.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function BulletList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-300">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function LensPanel({ lens }: { lens: TourLensOutput }) {
  const meta = LENS_META[lens.lens];
  return (
    <div className={`rounded-xl border bg-zinc-900/60 p-4 ${meta.ring}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <div className={`text-sm font-semibold ${meta.text}`}>{meta.label}</div>
          <div className="text-xs text-zinc-500">{meta.question}</div>
        </div>
        {lens.confidence && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${meta.chip}`}>
            {lens.confidence} confidence
          </span>
        )}
      </div>

      {lens.lens === "risk" && lens.top_risks && <BulletList items={lens.top_risks.slice(0, 4)} />}

      {lens.lens === "reversibility" && (
        <div className="space-y-3">
          {lens.irreversible_steps && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Hard to undo
              </div>
              <BulletList items={lens.irreversible_steps.slice(0, 3)} />
            </div>
          )}
          {lens.safe_to_try_first && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Safe to try first
              </div>
              <BulletList items={lens.safe_to_try_first.slice(0, 3)} />
            </div>
          )}
        </div>
      )}

      {lens.lens === "people" && lens.stakeholder_impacts && (
        <ul className="space-y-2.5">
          {lens.stakeholder_impacts.slice(0, 5).map((s, i) => (
            <li key={i} className="text-sm leading-relaxed text-zinc-300">
              <span className="font-medium text-zinc-100">{s.stakeholder}</span>
              <span
                className={`ml-2 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                  s.sentiment === "negative"
                    ? "border-red-900/50 bg-red-950/40 text-red-300"
                    : s.sentiment === "positive"
                      ? "border-emerald-900/50 bg-emerald-950/40 text-emerald-300"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
                }`}
              >
                {s.sentiment}
              </span>
              <div className="mt-0.5 text-zinc-400">{s.impact}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BriefCard({ brief, badge }: { brief: TourBrief; badge?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
          Decision brief
        </div>
        {badge}
      </div>
      <h4 className="text-base font-semibold text-white">{brief.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{brief.summary}</p>
      <div className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
          Recommendation
        </div>
        <p className="mt-1 text-sm leading-relaxed text-zinc-200">{brief.recommendation}</p>
      </div>
      {brief.key_considerations && brief.key_considerations.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Key considerations
          </div>
          <BulletList items={brief.key_considerations.slice(0, 4)} />
        </div>
      )}
      {brief.next_steps && brief.next_steps.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Next steps
          </div>
          <BulletList items={brief.next_steps.slice(0, 4)} />
        </div>
      )}
    </div>
  );
}

// ── Step bodies ───────────────────────────────────────────────────────────────

function StepDescribe() {
  const { intake } = data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        You start by briefing your think tank — the same intake every model reads. This one is
        pre-filled so you can see the level of detail that works well.
      </p>
      <Field label="The decision">{intake.situation}</Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Constraints">{intake.constraints}</Field>
        <Field label="Analysis posture">
          <span className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
            {postureLabel(intake.posture)}
          </span>
        </Field>
        <Field label="What we know / assume">{intake.knowns_assumptions}</Field>
        <Field label="Open questions">{intake.unknowns}</Field>
      </div>
    </div>
  );
}

function StepConvene() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">
        Pick one model or convene your full think tank. Each model reads the <em>same</em> brief and
        produces its own independent analysis — so you&apos;re not relying on a single voice.
      </p>
      <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-5">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-400">
          Think tank — all four selected
        </div>
        <div className="flex flex-wrap gap-2">
          {data.providers.map((p) => (
            <ProviderPill key={p} provider={p} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-px w-8 bg-indigo-500/40" />
          each runs the Risk / Reversibility / People lenses on the same brief
          <span className="h-px w-8 bg-indigo-500/40" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["risk", "reversibility", "people"] as TourLensName[]).map((l) => (
          <div key={l} className={`rounded-xl border bg-zinc-900/60 p-4 ${LENS_META[l].ring}`}>
            <div className={`text-sm font-semibold ${LENS_META[l].text}`}>{LENS_META[l].label}</div>
            <div className="mt-1 text-xs text-zinc-500">{LENS_META[l].question}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepClarify() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Before finalizing, the models ask follow-up questions — missing context and unstated
        assumptions. Similar questions from different models are merged so you answer each once. Your
        answers sharpen the analysis on the re-run.
      </p>
      {CLARIFICATIONS.map((c, i) => {
        const meta = LENS_META[c.lens];
        return (
          <div key={i} className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${meta.chip}`}>
                {meta.label}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                Model follow-up
              </span>
            </div>
            <div className="text-sm font-medium text-zinc-100">{c.q}</div>
            <div className="mt-2 rounded-lg border border-white/5 bg-zinc-950/60 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                Your answer
              </div>
              <div className="text-sm leading-relaxed text-zinc-300">{c.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepBrief() {
  const run = getRun(data, "gemini") ?? data.runs[0];
  const lenses = (["risk", "reversibility", "people"] as TourLensName[])
    .map((l) => getLens(run, l))
    .filter((x): x is TourLensOutput => Boolean(x));
  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">
        Each model returns a structured brief on the same rubric — Risk, Reversibility, and People —
        then a recommendation and next steps. Here&apos;s one model&apos;s analysis (
        <span className="text-zinc-300">{PROVIDER_META[run.provider].label}</span>).
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {lenses.map((l) => (
          <LensPanel key={l.lens} lens={l} />
        ))}
      </div>
      <BriefCard brief={run.decision_brief} badge={<ProviderPill provider={run.provider} />} />
    </div>
  );
}

function MarkdownSection({ heading, content }: { heading: string; content: string }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-zinc-900/70 p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-200 marker:content-none">
        <span className="text-indigo-400 group-open:hidden">▸ </span>
        <span className="hidden text-indigo-400 group-open:inline">▾ </span>
        {heading}
      </summary>
      <div className="mt-3 overflow-x-auto text-sm leading-relaxed text-zinc-300">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: (props) => (
              <table className="w-full border-collapse text-left text-xs" {...props} />
            ),
            thead: (props) => <thead className="text-indigo-300" {...props} />,
            th: (props) => (
              <th className="border border-white/10 px-2 py-1.5 font-semibold" {...props} />
            ),
            td: (props) => (
              <td className="border border-white/10 px-2 py-1.5 align-top text-zinc-400" {...props} />
            ),
            p: (props) => <p className="mb-2" {...props} />,
            strong: (props) => <strong className="text-zinc-200" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </details>
  );
}

function StepUnify() {
  const { synthesis, unified_brief } = data;
  const consensus = (synthesis.consensus ?? []).slice(0, 4);
  const firstSection = unified_brief.custom_sections?.[0];
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        With several models on the same brief, you can see where they agree, where they diverge, and
        merge the strongest thinking into one <span className="text-indigo-300">Unified Brief</span>.
      </p>

      {/* Per-model recommendations */}
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Each model&apos;s recommendation
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.runs.map((r) => (
            <div key={r.provider} className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
              <ProviderPill provider={r.provider} />
              <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-zinc-300">
                {r.decision_brief.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Consensus */}
      {consensus.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80">
            Where all models agreed
          </div>
          <div className="space-y-2">
            {consensus.map((c, i) => (
              <div key={i} className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2">
                <div className="text-sm font-medium text-emerald-200">{c.area}</div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                  {c.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified brief */}
      <BriefCard
        brief={unified_brief}
        badge={
          <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
            Unified Brief
          </span>
        }
      />
      {firstSection && <MarkdownSection heading={firstSection.heading} content={firstSection.content} />}

      {/* Contributions (illustrative) */}
      <div className="rounded-xl border border-violet-500/25 bg-violet-950/15 p-5">
        <div className="mb-1 flex items-center gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">
            Contributions — whose ideas made the cut
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-zinc-400">
            illustrative
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {TOUR_CONTRIBUTIONS.map((c) => (
            <div key={c.provider} className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <ProviderPill provider={c.provider} />
                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${INFLUENCE_BADGE[c.influence]}`}>
                  {c.influence} influence
                </span>
              </div>
              <div className="text-sm text-zinc-300">
                <span className="text-zinc-500">Adopted: </span>
                {c.adopted}
              </div>
              <div className="text-xs text-zinc-500">
                <span className="text-zinc-600">Unique angle: </span>
                {c.unique_angle}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepStart() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto max-w-lg">
        <h3 className="text-xl font-semibold text-white">That&apos;s the whole flow.</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          You just walked a real decision from intake to a synthesized recommendation — no sign-up
          required. When you have a decision worth defending, bring it to your own think tank.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/request-access"
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-500"
        >
          Request access →
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          Sign up with an invite
        </Link>
        <Link
          href="/auth/signin"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          Sign in
        </Link>
      </div>
      <p className="text-xs text-zinc-600">
        Prefer to browse first? See the{" "}
        <Link href="/model-studies" className="text-indigo-400 hover:text-indigo-300">
          Model Studies research
        </Link>
        .
      </p>
    </div>
  );
}

// ── Wizard shell ──────────────────────────────────────────────────────────────

export function TourWizard() {
  const [step, setStep] = useState(0);
  const last = STEPS.length - 1;
  const pct = Math.round((step / last) * 100);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Step indicators */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={s.key}
                onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-indigo-500 bg-indigo-500/15 text-indigo-200"
                    : done
                      ? "border-indigo-500/30 bg-indigo-500/5 text-indigo-300/80 hover:bg-indigo-500/10"
                      : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                }`}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                    active || done ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Step header */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-400">
          Step {step + 1} of {STEPS.length}
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{STEPS[step].title}</h2>
      </div>

      {/* Step body */}
      <div className="min-h-[20rem]">
        {step === 0 && <StepDescribe />}
        {step === 1 && <StepConvene />}
        {step === 2 && <StepClarify />}
        {step === 3 && <StepBrief />}
        {step === 4 && <StepUnify />}
        {step === 5 && <StepStart />}
      </div>

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Back
        </button>
        {step < last ? (
          <button
            onClick={() => setStep((s) => Math.min(last, s + 1))}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-500"
          >
            {step === 0 ? "Start the tour" : "Next"} →
          </button>
        ) : (
          <Link
            href="/request-access"
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-500"
          >
            Request access →
          </Link>
        )}
      </div>
    </div>
  );
}
