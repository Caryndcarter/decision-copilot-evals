"use client";

import { useEffect, useState } from "react";
import type { DecisionRunResult } from "@/types/decision";
import {
  ClarificationDemoQuickFill,
  CLARIFICATION_REGENERATION_STEPS,
  type ClarificationAnswersMap,
} from "./clarification-form";
import {
  mergeClarificationQuestions,
  mergedToLensQuestions,
  type MergedClarificationQuestion,
} from "@/lib/merge-clarification-questions";
import { runProviderLabel } from "@/lib/run-display-name";
import { persistClarificationSnapshotsForRuns } from "@/lib/clarification-snapshot";

const LENS_LABELS: Record<string, string> = {
  risk: "Risk",
  reversibility: "Reversibility",
  people: "People",
};

function ProviderChips({ providers }: { providers: string[] }) {
  if (providers.length <= 1) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {providers.map((p) => (
        <span
          key={p}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600"
        >
          {runProviderLabel(p)}
        </span>
      ))}
    </span>
  );
}

function MergedQuestionField({
  question,
  value,
  onChange,
}: {
  question: MergedClarificationQuestion;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const id = question.merge_id;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {LENS_LABELS[question.lens] ?? question.lens}
        </span>
        <span className="mt-0.5 block">{question.question_text}</span>
        {question.required && <span className="text-red-500"> *</span>}
      </label>
      <ProviderChips providers={question.providers} />
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
  const merged = mergeClarificationQuestions(runs);
  const [answers, setAnswers] = useState<ClarificationAnswersMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setSubmittingStep((prev) => (prev + 1) % CLARIFICATION_REGENERATION_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [submitting]);

  if (merged.length === 0) return null;

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

  const demoQuestions = mergedToLensQuestions(merged);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-slate-600 leading-relaxed">
        {merged.length} unique question{merged.length === 1 ? "" : "s"} merged from{" "}
        {runs.length} provider run{runs.length === 1 ? "" : "s"}. Similar questions are shown once;
        your answers apply to every provider that asked them.
      </p>
      <ClarificationDemoQuickFill
        questions={demoQuestions}
        onApply={(samples) => {
          const mapped: ClarificationAnswersMap = {};
          for (const q of demoQuestions) {
            if (samples[q.question_id] !== undefined) {
              mapped[q.question_id] = samples[q.question_id];
            }
          }
          setAnswers(mapped);
        }}
        className="mb-2"
      />
      <div className="space-y-5">
        {merged.map((q) => (
          <MergedQuestionField
            key={q.merge_id}
            question={q}
            value={answers[q.merge_id]}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [q.merge_id]: v }))}
          />
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
