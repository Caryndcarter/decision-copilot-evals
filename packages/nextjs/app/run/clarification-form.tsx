"use client";

import { useState, useEffect, useRef } from "react";
import type { DecisionRunResult, LensQuestion } from "@/types/decision";
import {
  buildClarificationAnswersForSubmit,
  clarificationQuestionKey as questionKey,
  type ClarificationAnswersMap,
} from "@/lib/clarification-answers";
import { resolveClarificationUiAnswerType } from "@/lib/clarification-answer-type";

export { buildClarificationAnswersForSubmit, type ClarificationAnswersMap };

export const CLARIFICATION_REGENERATION_STEPS = [
  "Updating risk analysis…",
  "Updating reversibility…",
  "Updating stakeholder impact…",
  "Preparing your recommendation…",
];

/** Sample answers for demo / testing (same logic as “Fill sample answers” in the form). */
export function buildDemoClarificationSamples(questions: LensQuestion[]): ClarificationAnswersMap {
  const samples: ClarificationAnswersMap = {};
  for (const q of questions) {
    const key = questionKey(q);
    const uiType = resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options);
    if (uiType === "percentage") samples[key] = 50;
    else if (uiType === "numeric") samples[key] = 5;
    else if (uiType === "enum" && q.options?.length) samples[key] = q.options[0];
    else samples[key] = "Moderate impact expected. Need more data to assess fully.";
  }
  return samples;
}

export function buildDemoClarificationUnknowns(questions: LensQuestion[]): ClarificationAnswersMap {
  const unknowns: ClarificationAnswersMap = {};
  for (const q of questions) {
    const key = questionKey(q);
    const uiType = resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options);
    if (uiType === "percentage" || uiType === "numeric") unknowns[key] = 0;
    else if (uiType === "enum" && q.options?.length)
      unknowns[key] = q.options[q.options.length - 1];
    else unknowns[key] = "Unknown";
  }
  return unknowns;
}

export function ClarificationDemoQuickFill({
  questions,
  onApply,
  className = "",
}: {
  questions: LensQuestion[];
  onApply: (answers: ClarificationAnswersMap) => void;
  className?: string;
}) {
  if (questions.length === 0) return null;
  return (
    <div
      className={`rounded-md border-2 border-dashed border-violet-300 bg-violet-50/50 p-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-violet-200 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-700">
          Demo
        </span>
        <span className="text-sm text-violet-700">Quick-fill for testing</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onApply(buildDemoClarificationSamples(questions))}
          className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
        >
          Fill sample answers
        </button>
        <button
          type="button"
          onClick={() => onApply(buildDemoClarificationUnknowns(questions))}
          className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
        >
          Mark all unknown
        </button>
      </div>
    </div>
  );
}

export interface ClarificationFormProps {
  result: DecisionRunResult;
  onUpdatedResult: (updated: DecisionRunResult, submitted?: { questions: LensQuestion[]; answers: ClarificationAnswersMap }) => void;
  /** Optional: compact/sidebar layout (e.g. for chat page) */
  variant?: "default" | "sidebar";
  /** When true with variant=sidebar, render without outer Card (for use inside a unified section) */
  embedded?: boolean;
  /** Omit “Follow-up questions” section title (e.g. parent CollapsibleBlock supplies the heading) */
  hideOuterTitle?: boolean;
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function ClarificationForm({
  result,
  onUpdatedResult,
  variant = "default",
  embedded = false,
  hideOuterTitle = false,
}: ClarificationFormProps) {
  const [clarificationAnswers, setClarificationAnswers] = useState<ClarificationAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const prefillInitializedRef = useRef(false);

  const questions = result.clarification_questions ?? [];
  if (questions.length === 0) return null;

  // Reset when run changes so we can prefill again for a different run
  useEffect(() => {
    prefillInitializedRef.current = false;
    setClarificationAnswers({});
  }, [result.run_id]);

  // Prefill from existing clarification answers (e.g. after "run with different posture" when we carry over old Q&A)
  useEffect(() => {
    const lastClar = result.clarifications?.[result.clarifications.length - 1];
    if (!lastClar?.answers?.length || questions.length === 0 || prefillInitializedRef.current) return;
    const prefilled: ClarificationAnswers = {};
    for (const a of lastClar.answers) {
      const key = questionKey({ lens: a.lens, question_id: a.question_id });
      if (questions.some((q) => q.lens === a.lens && q.question_id === a.question_id)) {
        prefilled[key] = a.answer;
      }
    }
    if (Object.keys(prefilled).length > 0) {
      setClarificationAnswers((prev) => ({ ...prefilled, ...prev }));
      prefillInitializedRef.current = true;
    }
  }, [result?.clarification_questions, result?.clarifications, questions]);

  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setSubmittingStep((prev) => (prev + 1) % CLARIFICATION_REGENERATION_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittingStep(0);
    setSubmitting(true);
    try {
      const answers = buildClarificationAnswersForSubmit(questions, clarificationAnswers);
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "clarification",
          decision_id: result.decision_id,
          run_id: result.run_id,
          clarification: { clarification_round: 1, answers },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      onUpdatedResult(data as DecisionRunResult, { questions, answers: clarificationAnswers });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const isSidebar = variant === "sidebar";
  const isEmbedded = embedded && isSidebar;
  const Wrapper = isEmbedded ? "div" : Card;
  const wrapperClassName = isEmbedded ? "pt-0" : isSidebar ? "border-indigo-200 bg-indigo-50/50" : "mt-6 border-indigo-200 bg-indigo-50/50";

  const sections = result.clarification_question_sections ?? [];
  const questionsByKey = new Map(questions.map((q) => [questionKey(q), q]));

  const renderQuestion = (q: LensQuestion) => {
    const uiType = resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options);
    return (
            <div>
              <label htmlFor={questionKey(q)} className="block text-sm font-medium text-slate-700">
                {q.question_text}
                {q.required && <span className="text-red-500"> *</span>}
              </label>
              {uiType === "enum" && q.options && q.options.length > 0 ? (
                <select
                  id={questionKey(q)}
                  required={q.required}
                  value={String(clarificationAnswers[questionKey(q)] ?? "")}
                  onChange={(e) =>
                    setClarificationAnswers((prev) => ({ ...prev, [questionKey(q)]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select…</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : uiType === "numeric" ? (
                <input
                  id={questionKey(q)}
                  type="number"
                  required={q.required}
                  value={
                    clarificationAnswers[questionKey(q)] !== undefined
                      ? String(clarificationAnswers[questionKey(q)])
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setClarificationAnswers((prev) => ({
                      ...prev,
                      [questionKey(q)]: v === "" ? 0 : Number(v),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : uiType === "percentage" ? (
                <div className="flex items-center gap-2">
                  <input
                    id={questionKey(q)}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required={q.required}
                    value={
                      clarificationAnswers[questionKey(q)] !== undefined
                        ? String(clarificationAnswers[questionKey(q)])
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setClarificationAnswers((prev) => ({
                        ...prev,
                        [questionKey(q)]: v === "" ? 0 : Number(v),
                      }));
                    }}
                    placeholder="0–100"
                    className="mt-1 w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-slate-500">%</span>
                </div>
              ) : (
                <textarea
                  id={questionKey(q)}
                  required={q.required}
                  rows={4}
                  value={String(clarificationAnswers[questionKey(q)] ?? "")}
                  onChange={(e) =>
                    setClarificationAnswers((prev) => ({ ...prev, [questionKey(q)]: e.target.value }))
                  }
                  placeholder="Your answer — include context the analysis can use, not just yes or no"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
    );
  };

  const clarificationInner = (
    <>
      <p className="mb-4 text-sm text-slate-600">
        Answer these to refine the analysis. We&apos;ll re-run and show an updated result.
      </p>
      <ClarificationDemoQuickFill
        questions={questions}
        onApply={setClarificationAnswers}
        className="mb-4"
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        {sections.length > 0
          ? sections.map((section, idx) => {
              const sectionQuestions = section.keys
                .map((k) => questionsByKey.get(k))
                .filter((q): q is LensQuestion => q != null);
              if (sectionQuestions.length === 0) return null;
              return (
                <div key={`${section.postureLabel}-${idx}`} className={idx > 0 ? "mt-6 space-y-4" : "space-y-4"}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {section.postureLabel}
                  </h3>
                  {sectionQuestions.map((q) => (
                    <div key={questionKey(q)}>{renderQuestion(q)}</div>
                  ))}
                </div>
              );
            })
          : questions.map((q) => (
              <div key={questionKey(q)}>{renderQuestion(q)}</div>
            ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {submitting && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <p className="font-medium">{CLARIFICATION_REGENERATION_STEPS[submittingStep]}</p>
            <p className="mt-1 text-indigo-600">This usually takes 5–15 seconds.</p>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
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
            "Submit answers & refresh analysis"
          )}
        </button>
      </form>
    </>
  );

  return (
    <Wrapper className={wrapperClassName}>
      {hideOuterTitle ? (
        clarificationInner
      ) : (
        <Section title="Follow-up questions">{clarificationInner}</Section>
      )}
    </Wrapper>
  );
}
