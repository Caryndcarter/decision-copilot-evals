"use client";

import { useEffect, useMemo, useState } from "react";
import type { DecisionRunResult } from "@/types/decision";
import {
  ClarificationDemoQuickFill,
  CLARIFICATION_REGENERATION_STEPS,
  type ClarificationAnswersMap,
} from "./clarification-form";
import {
  combinedToLensQuestions,
  LENS_THEME_LABELS,
  listCombinedClarificationQuestions,
  type CombinedClarificationQuestion,
} from "@/lib/merge-clarification-questions";
import { runProviderLabel } from "@/lib/run-display-name";
import { persistClarificationSnapshotsForRuns } from "@/lib/clarification-snapshot";
import { CollapsibleBlock } from "./collapsible-block";

const PROVIDER_BADGE: Record<string, string> = {
  openai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anthropic: "bg-orange-50 text-orange-700 border-orange-200",
  gemini: "bg-blue-50 text-blue-700 border-blue-200",
  xai: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

function ProviderAttribution({ provider }: { provider: string }) {
  const cls = PROVIDER_BADGE[provider] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {runProviderLabel(provider)}
    </span>
  );
}

function CombinedQuestionField({
  question,
  value,
  onChange,
}: {
  question: CombinedClarificationQuestion;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const id = question.entry_id;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
      <ProviderAttribution provider={question.provider} />
      <label htmlFor={id} className="mt-2 block text-sm font-medium text-slate-700">
        {question.question_text}
        {question.required && <span className="text-red-500"> *</span>}
      </label>
      {question.answer_type === "enum" && question.options && question.options.length > 0 ? (
        <select
          id={id}
          required={question.required}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select…</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : question.answer_type === "boolean" ? (
        <select
          id={id}
          required={question.required}
          value={
            value === true ? "yes" : value === false ? "no" : value === "unknown" ? "unknown" : ""
          }
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "yes" ? true : v === "no" ? false : v === "unknown" ? "unknown" : "");
          }}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select…</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unknown">Unknown</option>
        </select>
      ) : question.answer_type === "numeric" ? (
        <input
          id={id}
          type="number"
          required={question.required}
          value={value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ) : question.answer_type === "percentage" ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            id={id}
            type="number"
            min={0}
            max={100}
            step={1}
            required={question.required}
            value={value !== undefined ? String(value) : ""}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder="0–100"
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-slate-500">%</span>
        </div>
      ) : (
        <input
          id={id}
          type="text"
          required={question.required}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      )}
    </div>
  );
}

export function CombinedClarificationForm({
  runs,
  decisionId,
  onComplete,
}: {
  runs: DecisionRunResult[];
  decisionId: string;
  onComplete: (updatedRuns: DecisionRunResult[]) => void;
}) {
  const combined = listCombinedClarificationQuestions(runs);
  const [answers, setAnswers] = useState<ClarificationAnswersMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const questionsByLens = useMemo(() => {
    const groups: { lens: CombinedClarificationQuestion["lens"]; questions: CombinedClarificationQuestion[] }[] =
      [];
    for (const q of combined) {
      const last = groups[groups.length - 1];
      if (last?.lens === q.lens) {
        last.questions.push(q);
      } else {
        groups.push({ lens: q.lens, questions: [q] });
      }
    }
    return groups;
  }, [combined]);

  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setSubmittingStep((prev) => (prev + 1) % CLARIFICATION_REGENERATION_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [submitting]);

  if (combined.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittingStep(0);
    setSubmitting(true);
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "batch_clarification",
          decision_id: decisionId,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      const updated = (data.runs ?? []) as DecisionRunResult[];
      persistClarificationSnapshotsForRuns(updated);
      onComplete(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const demoQuestions = combinedToLensQuestions(combined);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-slate-600 leading-relaxed">
        {combined.length} follow-up question{combined.length === 1 ? "" : "s"} from {runs.length}{" "}
        provider run{runs.length === 1 ? "" : "s"}, grouped by lens theme. Each question shows which
        AI model asked it.
      </p>
      <ClarificationDemoQuickFill
        questions={demoQuestions}
        onApply={(samples) => {
          const mapped: ClarificationAnswersMap = {};
          for (const q of demoQuestions) {
            // Demo helpers key by `${lens}-${question_id}`; combined form keys by entry_id (question_id here).
            const sampleKey = `${q.lens}-${q.question_id}`;
            if (samples[sampleKey] !== undefined) {
              mapped[q.question_id] = samples[sampleKey];
            }
          }
          setAnswers(mapped);
        }}
        className="mb-2"
      />
      <div className="space-y-4">
        {questionsByLens.map((group) => (
          <CollapsibleBlock
            key={group.lens}
            id={`combined-lens-${group.lens}`}
            title={LENS_THEME_LABELS[group.lens] ?? group.lens}
            titleClassName="text-sm font-semibold uppercase tracking-wide text-slate-600"
            subtitle={`${group.questions.length} question${group.questions.length === 1 ? "" : "s"}`}
            defaultOpen
            bodyClassName="space-y-4 px-3 py-4"
          >
            {group.questions.map((q) => (
              <CombinedQuestionField
                key={q.entry_id}
                question={q}
                value={answers[q.entry_id]}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.entry_id]: v }))}
              />
            ))}
          </CollapsibleBlock>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {submitting && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <p className="font-medium">{CLARIFICATION_REGENERATION_STEPS[submittingStep]}</p>
          <p className="mt-1 text-indigo-600">
            Updating all {runs.length} runs. This may take 30–90 seconds.
          </p>
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
            {CLARIFICATION_REGENERATION_STEPS[submittingStep]}
          </>
        ) : (
          `Submit answers for all ${runs.length} providers`
        )}
      </button>
    </form>
  );
}
