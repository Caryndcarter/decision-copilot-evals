"use client";

import { useCallback, useState } from "react";
import { ResearchMarkdownInline } from "./research-markdown";
import type {
  ContributionInfluence,
  DecisionBrief,
  DecisionRunResult,
  LLMProviderName,
  ProviderContribution,
  UnifiedBriefContributions,
} from "@/types/decision";
import { unifiedBriefSynthesizerLabel, type UnifiedBriefSynthesizer } from "@/lib/unified-briefs";

interface UnifiedBriefContributionsPanelProps {
  runId: string;
  decisionId: string;
  brief: DecisionBrief | undefined;
  contributions: UnifiedBriefContributions | undefined;
  synthesizer: UnifiedBriefSynthesizer;
  className?: string;
  listMaxHeightClassName?: string;
  onUpdated: (run: DecisionRunResult) => void;
  /** Opens the full-width influence charts overlay (heatmap + averages). */
  onOpenInfluenceCharts?: () => void;
  /** When true, anonymize model brands in the contributions analysis prompt. */
  blindAuthorship?: boolean;
}

const PROVIDER_BADGE: Record<LLMProviderName, string> = {
  openai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anthropic: "bg-amber-50 text-amber-800 border-amber-200",
  gemini: "bg-sky-50 text-sky-700 border-sky-200",
  xai: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

const INFLUENCE_STYLE: Record<ContributionInfluence, { label: string; cls: string }> = {
  high: { label: "High influence", cls: "bg-emerald-600 text-white" },
  medium: { label: "Medium influence", cls: "bg-indigo-600 text-white" },
  low: { label: "Low influence", cls: "bg-slate-500 text-white" },
  minimal: { label: "Minimal influence", cls: "bg-zinc-300 text-zinc-700" },
};

function ContributionCard({ c, id }: { c: ProviderContribution; id?: string }) {
  const influence = INFLUENCE_STYLE[c.influence] ?? INFLUENCE_STYLE.low;
  const badge = PROVIDER_BADGE[c.provider] ?? PROVIDER_BADGE.openai;
  return (
    <div id={id} className="scroll-mt-2 rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${badge}`}>
          {c.provider_label}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${influence.cls}`}>
          {influence.label}
        </span>
      </div>

      {c.summary ? (
        <p className="mt-2 text-sm leading-snug text-slate-700">
          <ResearchMarkdownInline source={c.summary} />
        </p>
      ) : null}

      {c.adopted_ideas.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Made the cut</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
            {c.adopted_ideas.map((idea, i) => (
              <li key={i}>
                <ResearchMarkdownInline source={idea} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.distinct_contributions.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Only this model raised</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
            {c.distinct_contributions.map((idea, i) => (
              <li key={i}>
                <ResearchMarkdownInline source={idea} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.not_adopted.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Considered, not used</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-500">
            {c.not_adopted.map((idea, i) => (
              <li key={i}>
                <ResearchMarkdownInline source={idea} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function UnifiedBriefContributionsPanel({
  runId,
  decisionId,
  brief,
  contributions,
  synthesizer,
  className = "",
  listMaxHeightClassName = "max-h-[min(560px,calc(100vh-13rem))]",
  onUpdated,
  onOpenInfluenceCharts,
  blindAuthorship = false,
}: UnifiedBriefContributionsPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !brief;
  const stale =
    !!contributions?.brief_generated_at &&
    !!brief?.generated_at &&
    contributions.brief_generated_at !== brief.generated_at;

  const generate = useCallback(async () => {
    if (disabled || generating) return;
    if (!runId && !decisionId) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/decision/run/unified-brief-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(decisionId ? { decision_id: decisionId } : { run_id: runId }),
          synthesizer,
          blind: blindAuthorship,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Contributions analysis failed");
        return;
      }
      onUpdated(data.run as DecisionRunResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }, [disabled, generating, runId, decisionId, synthesizer, blindAuthorship, onUpdated]);

  const scrollToProvider = useCallback((provider: string) => {
    document
      .getElementById(`contribution-${provider}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className={`flex flex-col ${className}`.trim()}>
      <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
        <p className="text-sm text-slate-600">
          {unifiedBriefSynthesizerLabel(synthesizer)} — author of this Unified Brief — explains which think
          tank members&apos; ideas made the cut: what each model contributed, how much it shaped the final
          brief, and what was left out. Once generated, this is included as an appendix in the downloaded
          PDF.
        </p>
        {onOpenInfluenceCharts ? (
          <button
            type="button"
            onClick={onOpenInfluenceCharts}
            title="Open heatmap and average influence scores across brief authors"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            View influence charts
            <span aria-hidden>→</span>
          </button>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={disabled || generating}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <>
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
                Analyzing…
              </>
            ) : contributions ? (
              "Regenerate"
            ) : (
              "Analyze contributions"
            )}
          </button>
          {disabled ? (
            <span className="text-xs text-slate-500">Generate the Unified Brief first.</span>
          ) : null}
        </div>
        {stale && !generating ? (
          <p className="mt-2 text-xs text-amber-700">
            The Unified Brief changed since this analysis. Regenerate for an up-to-date attribution.
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

        {contributions && contributions.contributions.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Jump to</span>
            {contributions.contributions.map((c) => (
              <button
                key={c.provider}
                type="button"
                onClick={() => scrollToProvider(c.provider)}
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${
                  PROVIDER_BADGE[c.provider] ?? PROVIDER_BADGE.openai
                }`}
              >
                {c.provider_label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`overflow-y-auto px-4 py-4 ${listMaxHeightClassName}`}>
        {contributions ? (
          <div className="space-y-4">
            {contributions.overall ? (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">How the blend came together</p>
                <p className="mt-1 text-sm leading-snug text-slate-700">
                  <ResearchMarkdownInline source={contributions.overall} />
                </p>
              </div>
            ) : null}
            {contributions.contributions.map((c) => (
              <ContributionCard key={c.provider} c={c} id={`contribution-${c.provider}`} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {disabled
              ? "No Unified Brief yet — generate it on the left, then come back to see which model's ideas made the cut."
              : "No contribution analysis yet. Choose Analyze contributions to see how each think tank member's ideas shaped the brief."}
          </p>
        )}
      </div>
    </div>
  );
}
