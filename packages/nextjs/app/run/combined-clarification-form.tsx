"use client";

import { useEffect, useMemo, useState } from "react";
import type { DecisionRunResult } from "@/types/decision";
import {
  ClarificationDemoQuickFill,
  CLARIFICATION_REGENERATION_STEPS,
  type ClarificationAnswersMap,
} from "./clarification-form";
import {
  LENS_THEME_LABELS,
  listCombinedClarificationQuestions,
  type CombinedClarificationQuestion,
} from "@/lib/merge-clarification-questions";
import {
  dedupedToLensQuestions,
  expandDedupedAnswersToEntryIds,
  type ClarificationDedupeResult,
  type DedupedClarificationQuestion,
} from "@/lib/clarification-dedupe-types";
import { runProviderLabel } from "@/lib/run-display-name";
import { resolveClarificationUiAnswerType } from "@/lib/clarification-answer-type";
import { persistClarificationSnapshotsForRuns } from "@/lib/clarification-snapshot";
import { CollapsibleBlock } from "./collapsible-block";

const PROVIDER_ORDER = ["openai", "anthropic", "gemini", "xai"] as const;

const PROVIDER_BADGE: Record<string, string> = {
  openai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anthropic: "bg-orange-50 text-orange-700 border-orange-200",
  gemini: "bg-blue-50 text-blue-700 border-blue-200",
  xai: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

type FormTab = "unique" | "all";

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

function ProviderChips({ providers }: { providers: string[] }) {
  if (providers.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {providers.map((p) => (
        <ProviderAttribution key={p} provider={p} />
      ))}
    </span>
  );
}

function AnswerField({
  id,
  question,
  value,
  onChange,
}: {
  id: string;
  question: Pick<
    CombinedClarificationQuestion,
    "question_text" | "answer_type" | "options" | "required"
  >;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const uiType = resolveClarificationUiAnswerType(
    question.question_text,
    question.answer_type,
    question.options
  );

  return (
    <>
      <label htmlFor={id} className="mt-2 block text-sm font-medium text-slate-700">
        {question.question_text}
        {question.required && <span className="text-red-500"> *</span>}
      </label>
      {uiType === "enum" && question.options && question.options.length > 0 ? (
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
      ) : uiType === "numeric" ? (
        <input
          id={id}
          type="number"
          required={question.required}
          value={value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ) : uiType === "percentage" ? (
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
        <textarea
          id={id}
          required={question.required}
          rows={4}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer — include context the analysis can use, not just yes or no"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      )}
    </>
  );
}

function UniqueQuestionField({
  question,
  value,
  onChange,
}: {
  question: DedupedClarificationQuestion;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
      <ProviderChips providers={question.providers} />
      {question.lenses && question.lenses.length > 1 && (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
          Cross-lens:{" "}
          {question.lenses.map((l) => LENS_THEME_LABELS[l] ?? l).join(", ")}
        </p>
      )}
      <AnswerField
        id={question.merge_id}
        question={question}
        value={value}
        onChange={onChange}
      />
      {question.entry_ids.length > 1 && (
        <p className="mt-2 text-xs text-slate-500">
          One answer applies to {question.entry_ids.length} equivalent questions across{" "}
          {question.providers.length} provider{question.providers.length === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}

function OriginalQuestionReadOnly({ question }: { question: CombinedClarificationQuestion }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
      <ProviderAttribution provider={question.provider} />
      <p className="mt-2 text-sm text-slate-700">{question.question_text}</p>
      <p className="mt-1 text-xs text-slate-400">
        {LENS_THEME_LABELS[question.lens] ?? question.lens} · {question.answer_type}
      </p>
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
  const allQuestions = listCombinedClarificationQuestions(runs);
  const [dedupe, setDedupe] = useState<ClarificationDedupeResult | null>(null);
  const [dedupeLoading, setDedupeLoading] = useState(true);
  const [dedupeError, setDedupeError] = useState<string | null>(null);
  const [tab, setTab] = useState<FormTab>("unique");
  const [answers, setAnswers] = useState<ClarificationAnswersMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runIdKey = useMemo(() => runs.map((r) => r.run_id).join(","), [runs]);

  useEffect(() => {
    if (allQuestions.length === 0) {
      setDedupeLoading(false);
      return;
    }
    setDedupeLoading(true);
    setDedupeError(null);
    fetch("/api/decision/run/clarification-dedupe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision_id: decisionId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to combine questions (${res.status})`);
        }
        setDedupe(data as ClarificationDedupeResult);
      })
      .catch((e) => {
        setDedupeError(e instanceof Error ? e.message : "Failed to combine questions");
      })
      .finally(() => setDedupeLoading(false));
  }, [decisionId, runIdKey, allQuestions.length]);

  const uniqueByLens = useMemo(() => {
    const unique = dedupe?.unique ?? [];
    const groups: { lens: DedupedClarificationQuestion["lens"]; questions: DedupedClarificationQuestion[] }[] =
      [];
    for (const q of unique) {
      const last = groups[groups.length - 1];
      if (last?.lens === q.lens) {
        last.questions.push(q);
      } else {
        groups.push({ lens: q.lens, questions: [q] });
      }
    }
    return groups;
  }, [dedupe?.unique]);

  const allByProvider = useMemo(() => {
    const list = dedupe?.all ?? allQuestions;
    const groups: { provider: string; questions: CombinedClarificationQuestion[] }[] = [];
    const sorted = [...list].sort((a, b) => {
      const pa = PROVIDER_ORDER.indexOf(a.provider as (typeof PROVIDER_ORDER)[number]);
      const pb = PROVIDER_ORDER.indexOf(b.provider as (typeof PROVIDER_ORDER)[number]);
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });
    for (const q of sorted) {
      const last = groups[groups.length - 1];
      if (last?.provider === q.provider) {
        last.questions.push(q);
      } else {
        groups.push({ provider: q.provider, questions: [q] });
      }
    }
    return groups;
  }, [dedupe?.all, allQuestions]);

  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setSubmittingStep((prev) => (prev + 1) % CLARIFICATION_REGENERATION_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [submitting]);

  if (allQuestions.length === 0) return null;

  if (dedupeLoading) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-6 text-sm text-blue-900">
        <p className="font-medium">Combining similar questions…</p>
        <p className="mt-1 text-blue-700">
          Google Gemini is reviewing {allQuestions.length} follow-up questions from {runs.length} providers
          to find unique ones you can answer once.
        </p>
      </div>
    );
  }

  if (dedupeError || !dedupe) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
        {dedupeError ?? "Could not combine questions."}
      </div>
    );
  }

  const demoQuestions = dedupedToLensQuestions(dedupe.unique);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittingStep(0);
    setSubmitting(true);
    try {
      const answersByEntryId = expandDedupedAnswersToEntryIds(answers, dedupe.unique, dedupe.all);
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "batch_clarification",
          decision_id: decisionId,
          answers: answersByEntryId,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
        <p>
          <span className="font-medium">{dedupe.original_count} original questions</span> from{" "}
          {runs.length} providers →{" "}
          <span className="font-medium">{dedupe.unique_count} unique</span> to answer
          {dedupe.dedupe_method === "heuristic" ? (
            <span className="text-amber-800"> (exact-text fallback — Gemini unavailable)</span>
          ) : (
            <>
              {" "}
              via {dedupe.dedupe_model.replace("gemini-", "Gemini ").replace(/-/g, " ")}
            </>
          )}
          ).
        </p>
        <p className="mt-1 text-blue-800/80">
          Your answers on the unique list are sent to every provider that asked an equivalent question.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("unique")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "unique"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Unique questions ({dedupe.unique_count})
        </button>
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "all"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          All by provider ({dedupe.original_count})
        </button>
      </div>

      {tab === "unique" ? (
        <>
          <ClarificationDemoQuickFill
            questions={demoQuestions}
            decisionId={decisionId}
            onApply={(samples) => {
              const mapped: ClarificationAnswersMap = {};
              for (const q of demoQuestions) {
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
            {uniqueByLens.map((group) => (
              <CollapsibleBlock
                key={group.lens}
                id={`combined-lens-${group.lens}`}
                title={LENS_THEME_LABELS[group.lens] ?? group.lens}
                titleClassName="text-sm font-semibold uppercase tracking-wide text-slate-600"
                subtitle={`${group.questions.length} unique question${group.questions.length === 1 ? "" : "s"}`}
                defaultOpen
                bodyClassName="space-y-4 px-3 py-4"
              >
                {group.questions.map((q) => (
                  <UniqueQuestionField
                    key={q.merge_id}
                    question={q}
                    value={answers[q.merge_id]}
                    onChange={(v) => setAnswers((prev) => ({ ...prev, [q.merge_id]: v }))}
                  />
                ))}
              </CollapsibleBlock>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Original wording from each AI model. Answer on the <strong>Unique questions</strong> tab — this
            view is read-only.
          </p>
          {allByProvider.map((group) => (
            <CollapsibleBlock
              key={group.provider}
              id={`combined-provider-${group.provider}`}
              title={runProviderLabel(group.provider)}
              titleClassName="text-sm font-semibold text-slate-700"
              subtitle={`${group.questions.length} question${group.questions.length === 1 ? "" : "s"}`}
              defaultOpen={false}
              bodyClassName="space-y-3 px-3 py-4"
            >
              {group.questions.map((q) => (
                <OriginalQuestionReadOnly key={q.entry_id} question={q} />
              ))}
            </CollapsibleBlock>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {submitting && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <p className="font-medium">{CLARIFICATION_REGENERATION_STEPS[submittingStep]}</p>
          <p className="mt-1 text-indigo-600">
            Updating all {runs.length} runs. This may take 30–90 seconds.
          </p>
        </div>
      )}
      {tab === "unique" && (
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
            `Submit ${dedupe.unique_count} answers for all ${runs.length} providers`
          )}
        </button>
      )}
      {tab === "all" && (
        <p className="text-center text-xs text-slate-500">
          Switch to <button type="button" className="text-indigo-600 underline" onClick={() => setTab("unique")}>Unique questions</button> to submit answers.
        </p>
      )}
    </form>
  );
}
