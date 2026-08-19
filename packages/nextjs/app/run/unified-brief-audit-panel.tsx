"use client";

import { useCallback, useState } from "react";
import {
  AUDIT_DIMENSION_LABELS,
  AUDIT_VALUE_TONE,
  UNIFIED_BRIEF_AUDIT_DIMENSIONS,
  auditValueLabel,
  type UnifiedBriefAuditDimension,
} from "@/lib/unified-brief-audit/rubric";
import { runProviderLabel } from "@/lib/run-display-name";
import { unifiedBriefSynthesizerLabel, type UnifiedBriefSynthesizer } from "@/lib/unified-briefs";
import type { DecisionBrief, DecisionRunResult, UnifiedBriefAudit } from "@/types/decision";

interface UnifiedBriefAuditPanelProps {
  runId: string;
  decisionId: string;
  brief: DecisionBrief | undefined;
  audit: UnifiedBriefAudit | undefined;
  synthesizer: UnifiedBriefSynthesizer;
  className?: string;
  listMaxHeightClassName?: string;
  onUpdated: (run: DecisionRunResult) => void;
}

const TONE_CHIP: Record<
  NonNullable<(typeof AUDIT_VALUE_TONE)[string]>,
  string
> = {
  positive: "bg-emerald-50 text-emerald-800 border-emerald-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
  caution: "bg-amber-50 text-amber-900 border-amber-200",
  muted: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function AuditDimensionRow({
  dimension,
  field,
}: {
  dimension: UnifiedBriefAuditDimension;
  field: { value: string; quote: string };
}) {
  const tone = AUDIT_VALUE_TONE[field.value] ?? "neutral";
  const chip = TONE_CHIP[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{AUDIT_DIMENSION_LABELS[dimension]}</p>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${chip}`}
        >
          {auditValueLabel(field.value)}
        </span>
      </div>
      {field.quote ? (
        <blockquote className="mt-2 border-l-2 border-slate-200 pl-3 text-sm italic text-slate-600">
          &ldquo;{field.quote}&rdquo;
        </blockquote>
      ) : null}
    </div>
  );
}

export function UnifiedBriefAuditPanel({
  runId,
  decisionId,
  brief,
  audit,
  synthesizer,
  className = "",
  listMaxHeightClassName = "max-h-[min(560px,calc(100vh-13rem))]",
  onUpdated,
}: UnifiedBriefAuditPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !brief;
  const stale =
    !!audit?.brief_generated_at &&
    !!brief?.generated_at &&
    audit.brief_generated_at !== brief.generated_at;

  const runAudit = useCallback(async () => {
    if (disabled || generating) return;
    if (!runId && !decisionId) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/decision/run/unified-brief-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(decisionId ? { decision_id: decisionId } : { run_id: runId }),
          synthesizer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Brief audit failed");
        return;
      }
      onUpdated(data.run as DecisionRunResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }, [disabled, generating, runId, decisionId, synthesizer, onUpdated]);

  return (
    <div className={`flex flex-col ${className}`.trim()}>
      <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
        <p className="text-sm text-slate-600">
          A blind reviewer scores this Unified Brief on eight ethics dimensions — tradeoffs,
          filer alignment, who bears risk, uncertainty, dignity, truthfulness, premise scrutiny,
          and power balance. The synthesizer brand is hidden from the reviewer.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runAudit()}
            disabled={disabled || generating}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? (
              <>
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
                Auditing…
              </>
            ) : audit ? (
              "Re-run audit"
            ) : (
              "Run audit"
            )}
          </button>
          {disabled ? (
            <span className="text-xs text-slate-500">Generate the Unified Brief first.</span>
          ) : null}
        </div>
        {stale && !generating ? (
          <p className="mt-2 text-xs text-amber-700">
            The Unified Brief changed since this audit. Re-run for an up-to-date profile.
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        {audit ? (
          <p className="mt-2 text-xs text-slate-500">
            Reviewer: {runProviderLabel(audit.judge_provider)} · Brief author:{" "}
            {unifiedBriefSynthesizerLabel(synthesizer)} · Rubric {audit.rubric_id}
          </p>
        ) : null}
      </div>

      <div className={`overflow-y-auto px-4 py-4 ${listMaxHeightClassName}`}>
        {audit ? (
          <div className="space-y-3">
            {UNIFIED_BRIEF_AUDIT_DIMENSIONS.map((dimension) => (
              <AuditDimensionRow
                key={dimension}
                dimension={dimension}
                field={audit.codes[dimension]}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {disabled
              ? "No Unified Brief yet — generate it on the left, then run an audit here."
              : "No audit yet. Run audit to see how this brief scores on tradeoffs, alignment, and stakeholder treatment."}
          </p>
        )}
      </div>
    </div>
  );
}
