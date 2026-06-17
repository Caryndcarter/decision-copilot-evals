"use client";

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import { LogoLockup } from "@/app/components/logo-icon";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionNav } from "@/app/components/session-nav";
import type { DecisionRunResult, LensQuestion, Posture, DecisionBrief, ProviderSynthesis, SynthesisPoint } from "@/types/decision";
import type { ClarificationAnswersMap } from "../clarification-form";
import { ResultContent } from "../result-content";
import { CollapsibleBlock } from "../collapsible-block";
import { ResultChat, type ResultChatHandle } from "../result-chat";
import { ResearchStarterDemos } from "../research-starter-demos";
import { VariantStarterDemos } from "../variant-starter-demos";
import { ResearchOutputPanel, type ResearchOutputPanelHandle } from "../research-output-panel";
import { researchCompletionNavLines } from "@/lib/research-structured-response";
import {
  runHeadline,
  runPostureLabel,
  runProviderLabel,
  runShortChromeLabel,
  resolveSynthesisProviderRunId,
} from "@/lib/run-display-name";
import { scrollToAnalysisVersion } from "@/lib/run-analysis-scroll";
import { runHasAnalysisForUnifiedBrief } from "@/lib/unified-brief-eligibility";
import { synthesisSourceRefHref, synthesisSourceRefLabel } from "@/lib/synthesis-source-links";
import {
  SYNTHESIS_HIGHLIGHT_QUERY_KEY,
  tryHighlightQuotedText,
  stripHighlightQueryFromUrl,
} from "@/lib/synthesis-in-page-highlight";
import {
  ClarificationForm,
  ClarificationDemoQuickFill,
  buildClarificationAnswersForSubmit,
  CLARIFICATION_REGENERATION_STEPS,
} from "../clarification-form";
import { resolveClarificationUiAnswerType } from "@/lib/clarification-answer-type";
import { ClarificationAnswerEditor } from "../tiptap-dynamic";
import { AlertModal, ConfirmModal } from "../confirm-modal";
import {
  getClarificationSnapshot,
  removeClarificationSnapshot,
  setClarificationSnapshot,
} from "@/lib/clarification-snapshot";

const RUN_RESULT_KEY = "decisionRunResult";

function statusTextColor(status: string): string {
  if (status === "complete" || status === "pending_brief") return "text-emerald-700";
  if (status === "awaiting_clarification" || status === "processing_clarification") return "text-amber-600";
  return "text-slate-600";
}

const POSTURES: Posture[] = ["explore", "pressure_test", "surface_risks", "generate_alternatives"];

function questionKey(q: { lens: string; question_id: string }) {
  return `${q.lens}-${q.question_id}`;
}

function formatAnswerDisplay(q: LensQuestion, value: string | number | boolean | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  const uiType = resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options);
  if (uiType === "percentage") return `${value}%`;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

type ClarificationSection = { postureLabel: string; keys: string[] };

/** Clarification answers: always inline editable (Tiptap for short_text, inputs for others). Saves on change/blur via onSave (parent persists to state + sessionStorage). */
function AnsweredQuestionsSidebar({
  questions,
  answers,
  sections = [],
  embedded = false,
  hideOuterTitle = false,
  decisionId,
  onSave,
}: {
  questions: LensQuestion[];
  answers: ClarificationAnswersMap;
  sections?: ClarificationSection[];
  embedded?: boolean;
  /** Omit top “Follow-up questions” heading (parent supplies title, e.g. CollapsibleBlock) */
  hideOuterTitle?: boolean;
  decisionId?: string;
  onSave?: (answers: ClarificationAnswersMap) => void;
}) {
  const [draftAnswers, setDraftAnswers] = useState<ClarificationAnswersMap>({ ...answers });

  useEffect(() => {
    setDraftAnswers({ ...answers });
  }, [answers]);

  const persist = (next: ClarificationAnswersMap) => {
    setDraftAnswers(next);
    onSave?.(next);
  };

  const wrapperClass = embedded ? "pt-0" : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm border-indigo-200 bg-indigo-50/50";
  const questionsByKey = new Map(questions.map((q) => [questionKey(q), q]));

  const renderOne = (q: LensQuestion) => {
    const uiType = resolveClarificationUiAnswerType(q.question_text, q.answer_type, q.options);
    return (
          <div key={questionKey(q)}>
            <label htmlFor={questionKey(q)} className="block text-sm font-medium text-slate-700">
              {q.question_text}
            </label>
            {uiType === "enum" && q.options && q.options.length > 0 ? (
              <select
                id={questionKey(q)}
                value={String(draftAnswers[questionKey(q)] ?? "")}
                onChange={(e) => {
                  const next = { ...draftAnswers, [questionKey(q)]: e.target.value };
                  persist(next);
                }}
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
                value={
                  draftAnswers[questionKey(q)] !== undefined
                    ? String(draftAnswers[questionKey(q)])
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  persist({ ...draftAnswers, [questionKey(q)]: v === "" ? 0 : Number(v) });
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
                  value={
                    draftAnswers[questionKey(q)] !== undefined
                      ? String(draftAnswers[questionKey(q)])
                      : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    persist({ ...draftAnswers, [questionKey(q)]: v === "" ? 0 : Number(v) });
                  }}
                  placeholder="0–100"
                  className="mt-1 w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-500">%</span>
              </div>
            ) : (
              <div className="mt-1">
                <ClarificationAnswerEditor
                  editorKey={`clarification-${questionKey(q)}`}
                  value={String(draftAnswers[questionKey(q)] ?? "")}
                  onChange={(value) => persist({ ...draftAnswers, [questionKey(q)]: value })}
                />
              </div>
            )}
          </div>
    );
  };

  return (
    <div className={wrapperClass}>
      {hideOuterTitle ? (
        <p className="mb-4 text-sm text-slate-600">
          Edit your answers below; changes save when you leave a field. Use{" "}
          <span className="font-medium text-slate-700">Regenerate analysis &amp; brief</span> below when you want
          the lenses and decision brief on the left to reflect your edits.
        </p>
      ) : (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Follow-up questions
          </h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">
            The analysis on the left has been updated with your answers below. Edit inline; changes save when you click away.
          </p>
        </>
      )}
      <ClarificationDemoQuickFill
        questions={questions}
        decisionId={decisionId}
        onApply={(next) => persist(next)}
        className="mb-4"
      />
      <div className="space-y-3">
        {sections.length > 0
          ? sections.map((section, idx) => {
              const sectionQuestions = section.keys
                .map((k) => questionsByKey.get(k))
                .filter((q): q is LensQuestion => q != null);
              if (sectionQuestions.length === 0) return null;
              return (
                <CollapsibleBlock
                  key={`${section.postureLabel}-${idx}`}
                  title={section.postureLabel}
                  defaultOpen={idx === 0}
                  className="border-slate-200 bg-white"
                  bodyClassName="space-y-4 px-3 pb-4 pt-2"
                >
                  {sectionQuestions.map((q) => renderOne(q))}
                </CollapsibleBlock>
              );
            })
          : questions.map((q) => renderOne(q))}
      </div>
    </div>
  );
}

function RunWithDifferentAIButton({
  result,
  availableProviders,
  onRerun,
}: {
  result: DecisionRunResult;
  availableProviders: string[];
  onRerun: (newRunId: string) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(availableProviders[0] ?? "openai");

  useEffect(() => {
    if (availableProviders.length > 0 && !availableProviders.includes(selectedProvider)) {
      setSelectedProvider(availableProviders[0]);
    }
  }, [availableProviders]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRerun() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rerun_provider", run_id: result.run_id, llm_provider: selectedProvider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to run");
        return;
      }
      setShowModal(false);
      onRerun((data as DecisionRunResult).run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
      >
        Different AI
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-900/50" aria-hidden onClick={() => !submitting && setShowModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Run with different AI</h2>
            <p className="mt-1 text-sm text-slate-600">
              Re-run the same analysis (same posture and clarifications) using a different AI provider.
            </p>
            <div className="mt-4">
              <label htmlFor="rerun-provider" className="block text-sm font-medium text-slate-700">
                AI provider
              </label>
              <select
                id="rerun-provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {availableProviders.map((p) => (
                  <option key={p} value={p}>{runProviderLabel(p)}</option>
                ))}
              </select>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !submitting && setShowModal(false)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRerun}
                disabled={submitting}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running…
                  </span>
                ) : `Run with ${runProviderLabel(selectedProvider)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const SYNTHESIS_COLORS = {
  emerald: { section: "border-emerald-200 bg-emerald-50/60", badge: "bg-emerald-100 text-emerald-800", title: "text-emerald-900", sub: "text-emerald-700" },
  sky: { section: "border-indigo-200 bg-indigo-50/60", badge: "bg-indigo-100 text-indigo-800", title: "text-indigo-900", sub: "text-indigo-700" },
  amber: { section: "border-amber-200 bg-amber-50/60", badge: "bg-amber-100 text-amber-800", title: "text-amber-900", sub: "text-amber-700" },
};

function SynthesisSection({ title, subtitle, points, color, providerRunIds }: {
  title: string;
  subtitle: string;
  points: SynthesisPoint[];
  color: keyof typeof SYNTHESIS_COLORS;
  providerRunIds: Record<string, string>;
}) {
  const c = SYNTHESIS_COLORS[color];
  return (
    <div className={`rounded-lg border p-4 ${c.section}`}>
      <div className="mb-3">
        <h3 className={`text-sm font-semibold ${c.title}`}>{title}</h3>
        <p className={`text-xs mt-0.5 ${c.sub}`}>{subtitle}</p>
      </div>
      <ul className="space-y-3">
        {points.map((point, i) => (
          <li key={i}>
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="text-sm font-medium text-slate-800">{point.area}</span>
              {(point.source_refs && point.source_refs.length > 0
                ? point.source_refs.map((ref, ri) => {
                    const { runId } = resolveSynthesisProviderRunId(ref.provider, providerRunIds);
                    const href = synthesisSourceRefHref(runId, ref);
                    const label = `${ref.provider} · ${synthesisSourceRefLabel(ref)}`;
                    return href ? (
                      <Link
                        key={`${i}-sr-${ri}`}
                        href={href}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.badge} hover:opacity-75 underline underline-offset-2`}
                      >
                        {label}
                      </Link>
                    ) : (
                      <span key={`${i}-sr-${ri}`} className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.badge}`}>
                        {label}
                      </span>
                    );
                  })
                : point.providers.map((p, pi) => {
                    const { displayLabel, runId } = resolveSynthesisProviderRunId(p, providerRunIds);
                    return runId ? (
                      <Link
                        key={`${i}-${pi}-${displayLabel}`}
                        href={`/run/chat?run_id=${runId}`}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.badge} hover:opacity-75 underline underline-offset-2`}
                      >
                        {displayLabel}
                      </Link>
                    ) : (
                      <span key={`${i}-${pi}-${displayLabel}`} className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.badge}`}>
                        {displayLabel}
                      </span>
                    );
                  }))}
            </div>
            <p className="text-sm text-slate-600">{point.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<DecisionRunResult | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Keep showing questions + answers on the right after user submits (right side unchanged, left refreshes) */
  const [lastClarificationQuestions, setLastClarificationQuestions] = useState<LensQuestion[] | null>(null);
  const [lastClarificationAnswers, setLastClarificationAnswers] = useState<ClarificationAnswersMap | null>(null);
  const prevRunIdRef = useRef<string | null>(null);
  /** All runs for this decision (for posture dropdown) */
  const [otherRuns, setOtherRuns] = useState<DecisionRunResult[]>([]);
  const [postureDropdownOpen, setPostureDropdownOpen] = useState(false);
  const [researchDropdownOpen, setResearchDropdownOpen] = useState(false);
  const [researchPanelFocusNavId, setResearchPanelFocusNavId] = useState<string | null>(null);
  const [researchOutputOpen, setResearchOutputOpen] = useState(true);
  const [synthesisOpen, setSynthesisOpen] = useState(true);
  const chatRef = useRef<ResultChatHandle>(null);
  const researchPanelRef = useRef<ResearchOutputPanelHandle>(null);
  const [researchStarterTag, setResearchStarterTag] = useState<{ label: string; groupTitle: string } | null>(null);
  const [variantStarterTag, setVariantStarterTag] = useState<{ label: string; groupTitle: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [reapplyClarificationSubmitting, setReapplyClarificationSubmitting] = useState(false);
  const [reapplyClarificationStep, setReapplyClarificationStep] = useState(0);
  const [reapplyClarificationError, setReapplyClarificationError] = useState<string | null>(null);

  const handleResearchNavHandled = useCallback(() => {
    setResearchPanelFocusNavId(null);
  }, []);

  function scrollToResearchOutputPanel() {
    document.getElementById("research-output-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const navigateToResearchCompletion = useCallback((researchCompletionId: string) => {
    setResearchOutputOpen(true);
    setResearchPanelFocusNavId(researchCompletionId);
    scrollToResearchOutputPanel();
  }, []);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [rerunPosture, setRerunPosture] = useState<Posture>("explore");
  const [rerunLeaningDirection, setRerunLeaningDirection] = useState("");
  const [rerunSubmitting, setRerunSubmitting] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  /** When true, rerun posture with OpenAI, Anthropic, Gemini, and xAI in parallel (same as intake "all"). */
  const [rerunAllProviders, setRerunAllProviders] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  // Variant state
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [variantCreated, setVariantCreated] = useState<string | null>(null); // variant label
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [requestedSuggestion, setRequestedSuggestion] = useState<string | null>(null);
  const [requestingSuggestion, setRequestingSuggestion] = useState(false);
  /** Suggestions the user dismissed ("No thanks") or skipped via "Try another" — sent to reflect so the model picks a different angle */
  const [declinedVariantSuggestions, setDeclinedVariantSuggestions] = useState<string[]>([]);
  /** True after we created a variant from the "Suggest a variant" block (so we show "Variant created" until Dismiss) */
  const [createdVariantFromBlock, setCreatedVariantFromBlock] = useState(false);
  const [deleteVariantConfirm, setDeleteVariantConfirm] = useState<{ variantId: string; label: string } | null>(null);
  const [deleteVariantError, setDeleteVariantError] = useState<string | null>(null);
  const [deleteRunConfirm, setDeleteRunConfirm] = useState<{ run_id: string; label: string } | null>(null);
  const [deleteRunError, setDeleteRunError] = useState<string | null>(null);
  // Track current brief (including unsaved edits) for chat context
  const [currentBrief, setCurrentBrief] = useState<DecisionBrief | null>(null);
  const [synthesis, setSynthesis] = useState<ProviderSynthesis | null>(null);
  const [synthesisFetching, setSynthesisFetching] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/decision/providers")
      .then((res) => res.json())
      .then((data: { providers?: string[] }) => {
        setConfiguredProviders(Array.isArray(data?.providers) ? data.providers : []);
      })
      .catch(() => setConfiguredProviders([]));
  }, []);

  useEffect(() => {
    const run_id = searchParams.get("run_id");
    if (run_id?.trim()) {
      setLoadError(null);
      fetch(`/api/decision/run?run_id=${encodeURIComponent(run_id.trim())}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            setLoadError(data.error || "Failed to load run");
            setMissing(true);
            return;
          }
          setResult(data as DecisionRunResult);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(data));
          }
        })
        .catch(() => {
          setLoadError("Failed to load run");
          setMissing(true);
        });
      return;
    }
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(RUN_RESULT_KEY);
    if (!raw) {
      setMissing(true);
      return;
    }
    try {
      const data = JSON.parse(raw) as DecisionRunResult;
      setResult(data);
    } catch {
      setMissing(true);
    }
  }, [searchParams]);

  // When opening rerun modal, default to first available (not-yet-run) posture
  useEffect(() => {
    if (showRerunModal && result) {
      const posturesRun = new Set((otherRuns.length > 0 ? otherRuns : [result]).map((r) => r.intake.posture));
      const available = POSTURES.filter((p) => !posturesRun.has(p));
      if (available[0]) setRerunPosture(available[0]);
      setRerunLeaningDirection("");
      setRerunError(null);
      setRerunAllProviders(false);
    }
  }, [showRerunModal, result?.intake.posture, otherRuns]);

  // Load cached synthesis from current run if available; clear if run has none (e.g. switched posture)
  useEffect(() => {
    setSynthesis(result?.synthesis ?? null);
  }, [result?.run_id, result?.synthesis?.generated_at, result?.synthesis?.input_fingerprint]);

  useEffect(() => {
    setDeclinedVariantSuggestions([]);
    setVariantCreated(null);
    setCreatedVariantFromBlock(false);
    setActiveVariantId(null);
    setRequestedSuggestion(null);
    setRequestingSuggestion(false);
    setCreatingVariant(false);
    setReapplyClarificationError(null);
    setReapplyClarificationSubmitting(false);
  }, [result?.run_id]);

  /** When the URL includes `variant`, select that saved analysis version (synthesis deep links). */
  useEffect(() => {
    if (!result) return;
    if (!searchParams.has("variant")) return;
    const v = searchParams.get("variant")?.trim() ?? "";
    if (v && result.variants?.some((x) => x.variant_id === v)) {
      setActiveVariantId(v);
    } else {
      setActiveVariantId(null);
    }
  }, [result, searchParams]);

  /** Open research panel and focus a completion when the URL hash targets it. */
  useEffect(() => {
    if (typeof window === "undefined" || !result) return;
    const applyResearchHash = () => {
      const h = window.location.hash;
      if (h.startsWith("#research-completion-")) {
        const id = decodeURIComponent(h.slice("#research-completion-".length)).trim();
        if (id) navigateToResearchCompletion(id);
        return;
      }
      if (h === "#research-output-panel") {
        setResearchOutputOpen(true);
        scrollToResearchOutputPanel();
      }
    };
    applyResearchHash();
    window.addEventListener("hashchange", applyResearchHash);
    return () => window.removeEventListener("hashchange", applyResearchHash);
  }, [result?.run_id, navigateToResearchCompletion]);

  /** Flash-highlight a verbatim phrase inside the hash target (?hlq= from synthesis source_refs). */
  useEffect(() => {
    if (typeof window === "undefined" || !result) return;
    const hlq = searchParams.get(SYNTHESIS_HIGHLIGHT_QUERY_KEY)?.trim();
    if (!hlq || hlq.length < 8) return;
    const runIdInUrl = searchParams.get("run_id")?.trim();
    if (runIdInUrl && runIdInUrl !== result.run_id) return;

    const applyHighlight = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (!raw) return;
      const id = decodeURIComponent(raw);
      const host = document.getElementById(id);
      if (!host) return;
      const ok = tryHighlightQuotedText(host, hlq);
      if (ok) stripHighlightQueryFromUrl();
    };

    const t1 = window.setTimeout(applyHighlight, 320);
    const t2 = window.setTimeout(applyHighlight, 800);
    window.addEventListener("hashchange", applyHighlight);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("hashchange", applyHighlight);
    };
  }, [result, searchParams, activeVariantId]);

  // Fetch all runs for this decision (for posture switcher dropdown). Refetch when run_id changes so new runs (e.g. after rerun) appear.
  useEffect(() => {
    if (!result?.decision_id) return;
    fetch(`/api/decision/run?decision_id=${encodeURIComponent(result.decision_id)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && Array.isArray(data.runs)) setOtherRuns(data.runs);
        else setOtherRuns([]);
      })
      .catch(() => setOtherRuns([]));
  }, [result?.decision_id, result?.run_id]);

  // Persist questions (and answers after submit) for the right panel; restore from sessionStorage or run data when returning to chat
  useEffect(() => {
    if (!result) return;

    prevRunIdRef.current = result.run_id;
    const questions = result.clarification_questions?.length ? result.clarification_questions : null;
    if (questions) {
      setLastClarificationQuestions(questions);
      // Prefer sessionStorage snapshot (has latest edits), fall back to persisted clarifications on the run
      const snapshot = getClarificationSnapshot(result.run_id);
      if (snapshot?.answers && Object.keys(snapshot.answers).length > 0) {
        setLastClarificationAnswers(snapshot.answers);
      } else if (result.clarifications?.length) {
        const last = result.clarifications[result.clarifications.length - 1];
        const answersMap: ClarificationAnswersMap = {};
        for (const a of last.answers) {
          answersMap[`${a.lens}-${a.question_id}`] = a.answer as string | number | boolean;
        }
        setLastClarificationAnswers(Object.keys(answersMap).length ? answersMap : null);
      }
    } else {
      setLastClarificationQuestions(null);
      setLastClarificationAnswers(null);
    }
  }, [result]);

  const handleUpdatedResult = (
    updated: DecisionRunResult,
    submitted?: { questions: LensQuestion[]; answers: ClarificationAnswersMap }
  ) => {
    setResult(updated);
    if (submitted) {
      setLastClarificationQuestions(submitted.questions);
      setLastClarificationAnswers(submitted.answers);
      setClarificationSnapshot(updated.run_id, submitted.questions, submitted.answers);
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(updated));
    }
  };

  useEffect(() => {
    if (!reapplyClarificationSubmitting) return;
    const interval = setInterval(() => {
      setReapplyClarificationStep((prev) => (prev + 1) % CLARIFICATION_REGENERATION_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [reapplyClarificationSubmitting]);

  async function handleReapplyClarificationFromEdits() {
    if (!result?.run_id || !lastClarificationQuestions?.length || !lastClarificationAnswers) return;
    setReapplyClarificationError(null);
    setReapplyClarificationStep(0);
    setReapplyClarificationSubmitting(true);
    try {
      const answers = buildClarificationAnswersForSubmit(lastClarificationQuestions, lastClarificationAnswers);
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reapply_clarification",
          run_id: result.run_id,
          clarification: { answers },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReapplyClarificationError(data.error || `Request failed (${res.status})`);
        return;
      }
      const updated = data as DecisionRunResult;
      handleUpdatedResult(updated);
      const last = updated.clarifications?.[updated.clarifications.length - 1];
      if (last?.answers?.length && lastClarificationQuestions.length) {
        const map: ClarificationAnswersMap = {};
        for (const a of last.answers) {
          map[`${a.lens}-${a.question_id}`] = a.answer as string | number | boolean;
        }
        setLastClarificationAnswers(map);
        setClarificationSnapshot(updated.run_id, lastClarificationQuestions, map);
      }
    } catch (e) {
      setReapplyClarificationError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setReapplyClarificationSubmitting(false);
    }
  }

  const researchCompletions = useMemo(
    () => result?.research_completions ?? [],
    [result?.research_completions]
  );

  useEffect(() => {
    setResearchOutputOpen(true);
  }, [result?.run_id]);

  if (missing) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <LogoLockup />
            </Link>
          </div>
        </nav>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <p className="mt-4 text-zinc-600">
            {loadError ?? "No run result in this session. Start from the intake form."}
          </p>
          <p className="mt-6">
            <Link href="/intake" className="text-indigo-600 underline hover:text-indigo-700">
              Go to intake →
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (result === null) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <LogoLockup />
            </Link>
          </div>
        </nav>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <p className="text-zinc-600">Loading…</p>
        </div>
      </main>
    );
  }

  const hasPendingQuestions =
    result.clarification_needed &&
    result.clarification_questions &&
    result.clarification_questions.length > 0;
  const hasAnsweredSnapshot =
    lastClarificationQuestions &&
    lastClarificationQuestions.length > 0 &&
    lastClarificationAnswers &&
    Object.keys(lastClarificationAnswers).length > 0;

  // Always include current run in dropdown; merge in if missing (e.g. freshly created run not yet in list).
  // Replace the current run's entry with live `result` so status color reflects latest state without waiting for a refetch.
  const runsList = otherRuns.length > 0 ? otherRuns : (result ? [result] : []);
  const hasCurrent = result && runsList.some((r) => r.run_id === result.run_id);
  const runsForDropdownBase = hasCurrent ? runsList : result ? [result, ...runsList] : runsList;
  const runsForDropdown = result
    ? runsForDropdownBase.map((r) => r.run_id === result.run_id ? result : r)
    : runsForDropdownBase;
  const awaitingProviderRuns = runsForDropdown.filter(
    (r) => !r.freeform_output && r.status === "awaiting_clarification"
  );
  const showCombinedClarificationLink = awaitingProviderRuns.length >= 2;
  const currentRunLabel = runShortChromeLabel(result);
  const activeVariant = activeVariantId
    ? result.variants?.find((v) => v.variant_id === activeVariantId)
    : null;
  const posturesAlreadyRun = new Set(runsForDropdown.map((r) => r.intake.posture));
  const availablePostures = POSTURES.filter((p) => !posturesAlreadyRun.has(p));
  const usedProviders = new Set<string>(
    runsForDropdown
      .filter((r) => r.intake.posture === result.intake.posture)
      .map((r) => r.llm_provider ?? "openai")
  );
  const availableOtherProviders = configuredProviders.filter((p) => !usedProviders.has(p));

  // Runs with the same posture as the current run (different providers) — synthesis candidates.
  // Include any run with analysis available (draft or final), not just complete ones.
  const hasAnalysis = (r: DecisionRunResult) =>
    (r.lens_outputs?.length ?? 0) > 0 || (r.lens_outputs_first_draft?.length ?? 0) > 0;
  const samePostureSiblings = runsForDropdown.filter(
    (r) => r.intake.posture === result.intake.posture && r.run_id !== result.run_id && hasAnalysis(r)
  );
  const canSynthesize = samePostureSiblings.length >= 1 && hasAnalysis(result);
  const synthesisProviderRunIds: Record<string, string> = synthesis
    ? Object.fromEntries(synthesis.providers.map((p, i) => [runProviderLabel(p), synthesis.run_ids[i]]))
    : {};

  async function handleFetchSynthesis(force = false) {
    if (!result) return;
    setSynthesisError(null);
    setSynthesisFetching(true);
    try {
      const res = await fetch("/api/decision/run/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision_id: result.decision_id, posture: result.intake.posture, ...(force && { force: true }) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSynthesisError(data.error || "Failed to generate synthesis");
        return;
      }
      setSynthesis((data as { synthesis: ProviderSynthesis }).synthesis);
      setTimeout(() => {
        document.getElementById("synthesis-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setSynthesisError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSynthesisFetching(false);
    }
  }

  async function handleRerunPosture() {
    if (!result) return;
    if (rerunPosture === "pressure_test" && !rerunLeaningDirection.trim()) {
      setRerunError("Leaning direction is required for Pressure test");
      return;
    }
    setRerunError(null);
    setRerunSubmitting(true);
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rerun_posture",
          run_id: result.run_id,
          posture: rerunPosture,
          ...(rerunPosture === "pressure_test" && { leaning_direction: rerunLeaningDirection.trim() }),
          ...(rerunAllProviders ? { llm_provider: "all" } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRerunError(data.error || "Failed to run");
        return;
      }
      setShowRerunModal(false);
      setRerunLeaningDirection("");
      setRerunAllProviders(false);
      const multi = data as { runs?: DecisionRunResult[]; primary_run_id?: string };
      if (multi.runs && multi.primary_run_id && typeof window !== "undefined") {
        sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(multi.runs[0]));
        router.push(`/run/chat?run_id=${multi.primary_run_id}`);
        return;
      }
      router.push(`/run/chat?run_id=${(data as DecisionRunResult).run_id}`);
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRerunSubmitting(false);
    }
  }

  // Handle variant creation from chat suggestion
  async function handleCreateVariant(formatInstruction: string, fromSuggestBlock?: boolean) {
    if (!result?.run_id || creatingVariant) return;
    if (result.status !== "complete" && result.status !== "pending_brief") return;
    setCreatingVariant(true);
    if (fromSuggestBlock) setCreatedVariantFromBlock(false);
    try {
      const res = await fetch("/api/decision/run/variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: result.run_id, format_instruction: formatInstruction }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to create variant:", data.error);
        setCreatingVariant(false);
        return;
      }
      // Update result with new variant
      const updated = data.run as DecisionRunResult;
      setResult(updated);
      setSynthesis(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(updated));
      }
      // Show success feedback and switch to the new variant
      const newVariant = updated.variants?.find((v) => v.variant_id === data.variant_id);
      setVariantCreated(newVariant?.label ?? "New variant");
      setActiveVariantId(data.variant_id);
      if (fromSuggestBlock) setCreatedVariantFromBlock(true);
    } catch (err) {
      console.error("Failed to create variant:", err);
    } finally {
      setCreatingVariant(false);
    }
  }

  async function executeDeleteVariant() {
    const pending = deleteVariantConfirm;
    if (!pending || !result?.run_id) return;
    const { variantId, label: victimLabel } = pending;
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "delete_variant", run_id: result.run_id, variant_id: variantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteVariantConfirm(null);
        setDeleteVariantError(data.error || "Failed to delete variant");
        return;
      }
      const updated = data as DecisionRunResult;
      setResult(updated);
      setSynthesis(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(updated));
      }
      if (activeVariantId === variantId) {
        setActiveVariantId(null);
      }
      if (variantCreated === victimLabel) {
        setVariantCreated(null);
        setCreatedVariantFromBlock(false);
      }
      setDeleteVariantConfirm(null);
    } catch {
      setDeleteVariantConfirm(null);
      setDeleteVariantError("Failed to delete variant");
    }
  }

  async function executeDeleteRun() {
    const pending = deleteRunConfirm;
    if (!pending || !result?.decision_id) return;
    const { run_id: targetId } = pending;
    const wasCurrent = result.run_id === targetId;
    const decisionId = result.decision_id;
    try {
      const res = await fetch("/api/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "delete_run", run_id: targetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteRunConfirm(null);
        setDeleteRunError(data.error || "Failed to delete analysis");
        return;
      }
      removeClarificationSnapshot(targetId);
      setDeleteRunConfirm(null);

      const listRes = await fetch(`/api/decision/run?decision_id=${encodeURIComponent(decisionId)}`);
      const listData = await listRes.json();
      const runs: DecisionRunResult[] = listRes.ok && Array.isArray(listData.runs) ? listData.runs : [];
      setOtherRuns(runs);

      if (wasCurrent) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(RUN_RESULT_KEY);
        }
        if (runs.length > 0) {
          router.push(`/run/chat?run_id=${runs[0].run_id}`);
        } else {
          router.push("/intake");
        }
      }
    } catch {
      setDeleteRunConfirm(null);
      setDeleteRunError("Failed to delete analysis");
    }
  }

  /** Matches POST /variant and reflect APIs — not during clarification or other interim states. */
  const canCreateVariants = result.status === "complete" || result.status === "pending_brief";

  async function requestVariantReflection(avoidList: string[]) {
    if (!result?.run_id || !canCreateVariants) return;
    setRequestingSuggestion(true);
    setRequestedSuggestion(null);
    const capped = avoidList.slice(-15);
    try {
      const res = await fetch("/api/decision/run/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: result.run_id,
          avoid_suggestions: capped.length > 0 ? capped : undefined,
        }),
      });
      const data = await res.json();
      if (data.suggestion) setRequestedSuggestion(data.suggestion);
      else setRequestedSuggestion("");
    } catch {
      setRequestedSuggestion("");
    } finally {
      setRequestingSuggestion(false);
    }
  }

  async function requestSuggestion() {
    await requestVariantReflection(declinedVariantSuggestions);
  }

  async function tryAnotherVariantSuggestion() {
    const last = requestedSuggestion?.trim();
    const nextAvoid = last
      ? [...declinedVariantSuggestions, last].slice(-15)
      : declinedVariantSuggestions.slice(-15);
    setDeclinedVariantSuggestions(nextAvoid);
    setCreatedVariantFromBlock(false);
    await requestVariantReflection(nextAvoid);
  }

  function declineVariantSuggestion() {
    const last = requestedSuggestion?.trim();
    if (last) {
      setDeclinedVariantSuggestions((prev) => [...prev, last].slice(-15));
    }
    setRequestedSuggestion(null);
    setCreatedVariantFromBlock(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Nav — matches landing/intake */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <LogoLockup />
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={`/run/result${result.run_id ? `?run_id=${result.run_id}` : ""}`}
              className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Decision Brief
            </Link>
            {!activeVariantId && runHasAnalysisForUnifiedBrief(result) ? (
              <Link
                href={`/run/best-of-worlds?decision_id=${encodeURIComponent(result.decision_id)}`}
                title="One brief merging every provider run, research, and variants (Anthropic)"
                className="inline-flex items-center rounded-lg border border-sky-600/80 bg-sky-950/40 px-3 py-1.5 text-sm font-medium text-sky-100 hover:bg-sky-900/60 hover:text-white transition-colors"
              >
                Unified Brief
              </Link>
            ) : null}
            <Link
              href="/intake"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              New decision
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>

      {/* Toolbar — title + analysis controls */}
      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-base font-semibold text-zinc-900">
            <span className={`font-medium ${statusTextColor(result.status)}`}>{currentRunLabel}</span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Analyses switcher — same control pattern as Research (label + badges + ▾) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPostureDropdownOpen((o) => !o);
                  setResearchDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                aria-expanded={postureDropdownOpen}
                aria-haspopup="listbox"
                aria-label={`Analyses for this decision, ${runsForDropdown.length} total. Current: ${currentRunLabel}`}
              >
                <span>Analyses</span>
                <span className="rounded-full bg-indigo-100 px-1.5 py-0 text-xs font-semibold tabular-nums text-indigo-800">
                  {runsForDropdown.length}
                </span>
                <span className="hidden sm:inline rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {runPostureLabel(result.intake.posture)}
                </span>
                <span className="hidden sm:inline rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  {runProviderLabel(result.llm_provider)}
                </span>
                <span
                  className={`hidden md:inline h-2 w-2 shrink-0 rounded-full ${
                    result.status === "complete" || result.status === "pending_brief"
                      ? "bg-emerald-500"
                      : result.status === "awaiting_clarification" || result.status === "processing_clarification"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                  }`}
                  title={result.status.replace(/_/g, " ")}
                  aria-hidden
                />
                <span className="text-slate-400">▾</span>
              </button>
              {postureDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setPostureDropdownOpen(false)} />
                  <ul
                    className="absolute left-0 top-full z-40 mt-1 max-h-72 min-w-[min(100vw-2rem,280px)] overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg sm:min-w-[300px]"
                    role="listbox"
                  >
                    <li className="px-3 py-1.5 text-xs font-semibold leading-snug text-slate-600">
                      {runHeadline(result)}
                    </li>
                    {runsForDropdown.map((r) => (
                      <li key={r.run_id} className="flex items-stretch border-b border-slate-100 last:border-0">
                        <Link
                          href={`/run/chat?run_id=${r.run_id}`}
                          className={`min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-zinc-50 ${
                            r.run_id === result.run_id ? "bg-indigo-50" : ""
                          }`}
                          onClick={() => setPostureDropdownOpen(false)}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                              {runPostureLabel(r.intake.posture)}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              {runProviderLabel(r.llm_provider)}
                            </span>
                            {r.run_id === result.run_id ? (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                                Current
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={`mt-1 text-xs ${
                              r.status === "complete" || r.status === "pending_brief"
                                ? "text-emerald-700"
                                : r.status === "awaiting_clarification" || r.status === "processing_clarification"
                                  ? "text-amber-600"
                                  : "text-slate-500"
                            }`}
                          >
                            {r.status.replace(/_/g, " ")}
                          </p>
                        </Link>
                        <button
                          type="button"
                          className="shrink-0 self-center px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                          aria-label={`Delete analysis: ${runShortChromeLabel(r)}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setDeleteRunConfirm({ run_id: r.run_id, label: runShortChromeLabel(r) });
                            setPostureDropdownOpen(false);
                          }}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setResearchDropdownOpen((o) => !o);
                  setPostureDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                aria-expanded={researchDropdownOpen}
                aria-haspopup="listbox"
              >
                Research
                {researchCompletions.length > 0 && (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0 text-xs font-semibold tabular-nums text-violet-800">
                    {researchCompletions.length}
                  </span>
                )}
                <span className="text-slate-400">▾</span>
              </button>
              {researchDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setResearchDropdownOpen(false)} />
                  <ul
                    className="absolute left-0 top-full z-40 mt-1 max-h-72 min-w-[min(100vw-2rem,320px)] overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg sm:min-w-[320px]"
                    role="listbox"
                  >
                    {researchCompletions.length > 0 && (
                      <>
                        <li className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Completed
                        </li>
                        {researchCompletions.map((r) => {
                          const { primary, secondary } = researchCompletionNavLines(r);
                          return (
                          <li key={r.research_id}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-slate-50"
                              onClick={() => {
                                setResearchDropdownOpen(false);
                                setResearchOutputOpen(true);
                                setResearchPanelFocusNavId(r.research_id);
                                scrollToResearchOutputPanel();
                              }}
                            >
                              <span className="text-sm font-semibold text-slate-800">{primary}</span>
                              {secondary ? (
                                <span className="text-xs font-normal text-slate-500">{secondary}</span>
                              ) : null}
                              <span className="text-xs text-slate-500">
                                {new Date(r.completed_at).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            </button>
                          </li>
                          );
                        })}
                        <li className="my-1 border-t border-slate-100" aria-hidden />
                      </>
                    )}
                    {researchCompletions.length === 0 && (
                      <li className="px-3 py-2 text-sm text-slate-500">No completed research yet — use a starter in chat.</li>
                    )}
                  </ul>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowRerunModal(true)}
              className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              Different posture
            </button>
            {availableOtherProviders.length > 0 && (
              <RunWithDifferentAIButton
                result={result}
                availableProviders={availableOtherProviders}
                onRerun={(newRunId) => router.push(`/run/chat?run_id=${newRunId}`)}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (!canSynthesize) return;
                synthesis
                  ? document.getElementById("synthesis-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                  : handleFetchSynthesis();
              }}
              disabled={synthesisFetching}
              title={!canSynthesize ? "Run this posture with at least one other AI provider to compare analyses" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 ${
                canSynthesize
                  ? "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  : "border-zinc-200 bg-white text-zinc-400 cursor-not-allowed"
              }`}
            >
              {synthesisFetching ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Comparing…
                </>
              ) : "Compare AI providers"}
            </button>
            {synthesisError && (
              <span className="text-xs text-red-600">{synthesisError}</span>
            )}
          </div>
        </div>
      </header>


      {/* Modal: Run with different posture */}
      {showRerunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-900/50" aria-hidden onClick={() => !rerunSubmitting && setShowRerunModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Run with different posture</h2>
            <p className="mt-1 text-sm text-slate-600">
              Re-run the same analysis (same situation, constraints, and your clarification answers) with a different posture.
            </p>
            <div className="mt-4 space-y-4">
              {availablePostures.length === 0 ? (
                <p className="text-sm text-slate-600">You&apos;ve already run all postures for this decision. Use the dropdown above to switch between them.</p>
              ) : (
              <div>
                <label htmlFor="rerun-posture" className="block text-sm font-medium text-slate-700">
                  Posture
                </label>
                <select
                  id="rerun-posture"
                  value={availablePostures.includes(rerunPosture) ? rerunPosture : availablePostures[0]}
                  onChange={(e) => setRerunPosture(e.target.value as Posture)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availablePostures.map((p) => (
                    <option key={p} value={p}>
                      {runPostureLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
              )}
              {rerunPosture === "pressure_test" && availablePostures.length > 0 && (
                <div>
                  <label htmlFor="rerun-leaning" className="block text-sm font-medium text-slate-700">
                    Leaning toward
                  </label>
                  <input
                    id="rerun-leaning"
                    type="text"
                    value={rerunLeaningDirection}
                    onChange={(e) => setRerunLeaningDirection(e.target.value)}
                    placeholder="e.g. Option A"
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
              {configuredProviders.length >= 2 && availablePostures.length > 0 && (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={rerunAllProviders}
                    onChange={(e) => setRerunAllProviders(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="font-medium">All providers (simultaneous)</span>
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      Run OpenAI, Anthropic, Google Gemini, and xAI in parallel for this posture—same as on the intake form.
                      You’ll land on the first run; switch others from the Analyses menu.
                    </span>
                  </span>
                </label>
              )}
              {rerunError && <p className="text-sm text-red-600">{rerunError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !rerunSubmitting && setShowRerunModal(false)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRerunPosture}
                disabled={rerunSubmitting || availablePostures.length === 0 || (rerunPosture === "pressure_test" && !rerunLeaningDirection.trim())}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {rerunSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running…
                  </span>
                ) : rerunAllProviders ? "Run all providers" : "Run analysis"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Variant switcher - inline buttons when variants exist */}
        {result.variants && result.variants.length > 0 && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Analysis versions</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveVariantId(null);
                  scrollToAnalysisVersion(null);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeVariantId === null
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Base analysis
              </button>
              {result.variants.map((v) => (
                <div
                  key={v.variant_id}
                  className={`inline-flex items-stretch overflow-hidden rounded-md border shadow-sm ${
                    activeVariantId === v.variant_id
                      ? "border-indigo-600 ring-1 ring-indigo-600"
                      : "border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVariantId(v.variant_id);
                      scrollToAnalysisVersion(
                        v.variant_id,
                        (v.decision_brief?.custom_sections?.length ?? 0) > 0
                      );
                    }}
                    className={`px-3 py-1.5 text-sm font-medium ${
                      activeVariantId === v.variant_id
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {v.label}
                  </button>
                  <button
                    type="button"
                    title="Delete this variant"
                    aria-label={`Delete variant ${v.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteVariantConfirm({ variantId: v.variant_id, label: v.label });
                    }}
                    className="border-l border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {activeVariant && (
              <p className="mt-2 text-xs text-slate-500">
                Viewing variant created {new Date(activeVariant.created_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Left: analysis only. Right: one chat-like section (clarification + open-ended chat). */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_440px]">
          <div className="min-w-0">
            {activeVariant ? (
              <ResultContent
                result={{
                  ...result,
                  lens_outputs: activeVariant.lens_outputs,
                  decision_brief: activeVariant.decision_brief,
                }}
                variantId={activeVariant.variant_id}
                onRunUpdate={(updated) => {
                  setResult(updated);
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(updated));
                  }
                }}
                onBriefChange={setCurrentBrief}
                onExpandAll={() => {
                  setResearchOutputOpen(true);
                  setSynthesisOpen(true);
                  researchPanelRef.current?.expandAll();
                }}
                onCollapseAll={() => {
                  setResearchOutputOpen(false);
                  setSynthesisOpen(false);
                  researchPanelRef.current?.collapseAll();
                }}
                onJumpToResearch={() => {
                  setResearchOutputOpen(true);
                  scrollToResearchOutputPanel();
                }}
                onJumpToSynthesis={
                  synthesis
                    ? () => {
                        setSynthesisOpen(true);
                        setTimeout(() => {
                          document.getElementById("synthesis-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 50);
                      }
                    : undefined
                }
              />
            ) : (
              <ResultContent
                result={result}
                onRunUpdate={(updated) => {
                  setResult(updated);
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(updated));
                  }
                }}
                onBriefChange={setCurrentBrief}
                onExpandAll={() => {
                  setResearchOutputOpen(true);
                  setSynthesisOpen(true);
                  researchPanelRef.current?.expandAll();
                }}
                onCollapseAll={() => {
                  setResearchOutputOpen(false);
                  setSynthesisOpen(false);
                  researchPanelRef.current?.collapseAll();
                }}
                onJumpToResearch={() => {
                  setResearchOutputOpen(true);
                  scrollToResearchOutputPanel();
                }}
                onJumpToSynthesis={
                  synthesis
                    ? () => {
                        setSynthesisOpen(true);
                        setTimeout(() => {
                          document.getElementById("synthesis-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 50);
                      }
                    : undefined
                }
              />
            )}

            <CollapsibleBlock
              id="research-output-panel"
              title="Research output"
              subtitle={
                researchCompletions.length === 0
                  ? "Each research starter in chat adds a task below; headings and sections come from the model."
                  : `${researchCompletions.length} task${researchCompletions.length === 1 ? "" : "s"} · headings and sections from the model`
              }
              className="mt-8 border-violet-200 bg-violet-50/40 shadow-sm"
              open={researchOutputOpen}
              onOpenChange={setResearchOutputOpen}
              bodyClassName="space-y-3 px-4 py-4"
            >
              <ResearchOutputPanel
                ref={researchPanelRef}
                completions={researchCompletions}
                focusNavId={researchPanelFocusNavId}
                onFocusNavHandled={handleResearchNavHandled}
              />
            </CollapsibleBlock>

            {/* Inline cross-provider synthesis */}
            {synthesis && (
              <CollapsibleBlock
                id="synthesis-section"
                title="Cross-provider comparison"
                subtitle={[
                  synthesis.providers.map((p) => runProviderLabel(p)).join(", "),
                  new Date(synthesis.generated_at).toLocaleString(),
                  synthesis.input_inventory
                    ? `${synthesis.input_inventory.compared_run_count} run${synthesis.input_inventory.compared_run_count === 1 ? "" : "s"} · ${synthesis.input_inventory.variant_count} variant${synthesis.input_inventory.variant_count === 1 ? "" : "s"} · ${synthesis.input_inventory.research_count} research`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                className="mt-8 border-violet-200 bg-white"
                open={synthesisOpen}
                onOpenChange={setSynthesisOpen}
                headerEnd={
                  <button
                    type="button"
                    onClick={() => handleFetchSynthesis(true)}
                    disabled={synthesisFetching}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 underline disabled:opacity-60 disabled:no-underline"
                  >
                    {synthesisFetching ? (
                      <>
                        <svg
                          className="animate-spin h-3 w-3"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Regenerating…
                      </>
                    ) : (
                      "Regenerate"
                    )}
                  </button>
                }
                bodyClassName="space-y-5 px-5 py-5"
              >
                {synthesis.input_inventory &&
                  (synthesis.input_inventory.variant_count > 0 ||
                    synthesis.input_inventory.research_count > 0) && (
                  <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
                    Compared {synthesis.input_inventory.compared_run_count} canonical provider run
                    {synthesis.input_inventory.compared_run_count === 1 ? "" : "s"} using the same lane
                    rules as Unified Brief
                    {synthesis.input_inventory.variant_count > 0
                      ? `, including ${synthesis.input_inventory.variant_count} saved format variant${synthesis.input_inventory.variant_count === 1 ? "" : "s"}`
                      : ""}
                    {synthesis.input_inventory.research_count > 0
                      ? ` and ${synthesis.input_inventory.research_count} research task${synthesis.input_inventory.research_count === 1 ? "" : "s"}`
                      : ""}
                    .
                  </div>
                )}
                {synthesis.has_drafts && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Some analyses included here are pre-clarification drafts — the model&apos;s first pass before follow-up questions were answered. Consensus points that appear across both draft and final analyses carry stronger signal.
                  </div>
                )}
                <p className="text-sm text-slate-700 leading-relaxed">{synthesis.overall_summary}</p>
                {synthesis.consensus.length > 0 && (
                  <SynthesisSection
                    title="Consensus"
                    subtitle="All (or nearly all) providers agree"
                    points={synthesis.consensus}
                    color="emerald"
                    providerRunIds={synthesisProviderRunIds}
                  />
                )}
                {synthesis.majority_view.length > 0 && (
                  <SynthesisSection
                    title="Majority view"
                    subtitle="Most providers raised this — one didn't"
                    points={synthesis.majority_view}
                    color="sky"
                    providerRunIds={synthesisProviderRunIds}
                  />
                )}
                {synthesis.minority_opinions.length > 0 && (
                  <SynthesisSection
                    title="Minority opinions"
                    subtitle="Only one provider raised this — worth a closer look"
                    points={synthesis.minority_opinions}
                    color="amber"
                    providerRunIds={synthesisProviderRunIds}
                  />
                )}
              </CollapsibleBlock>
            )}
          </div>

          <aside id="discuss-and-clarify-panel" className="min-w-0 lg:max-w-[440px]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-800">Discuss & clarify</h2>
                <p className="mt-1 text-sm text-slate-600">
                  If you have follow-up questions below, answer and submit them so this run can be recomputed with your details—the analysis on the left stays tied to your original intake until you do. If nothing is waiting for you, skip straight to chat. Use chat to question the analysis, go deeper on a topic, or ask about the follow-ups themselves.
                </p>
              </div>
              <div className="p-4 space-y-6">
                {(hasPendingQuestions || hasAnsweredSnapshot) && (
                  <CollapsibleBlock
                    key={`clarification-${result.status}`}
                    id="sidebar-clarification"
                    title="Follow-up questions"
                    subtitle={
                      hasPendingQuestions
                        ? "Grouped by posture. Submit when done to refresh the analysis."
                        : "Grouped by posture. Edit anytime; use Regenerate when you want lenses and the brief updated."
                    }
                    defaultOpen={hasPendingQuestions}
                    className="border-indigo-200 bg-white"
                    bodyClassName="px-3 py-4"
                  >
                    {showCombinedClarificationLink && hasPendingQuestions && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                        <p>
                          {awaitingProviderRuns.length} provider runs have follow-up questions. You can
                          answer here for this provider, or{" "}
                          <Link
                            href={`/run/clarify-all?decision_id=${encodeURIComponent(result.decision_id)}`}
                            className="font-semibold text-indigo-700 underline hover:text-indigo-800"
                          >
                            answer all provider questions on one screen
                          </Link>
                          .
                        </p>
                      </div>
                    )}
                    {hasPendingQuestions ? (
                      <ClarificationForm
                        result={result}
                        onUpdatedResult={handleUpdatedResult}
                        variant="sidebar"
                        embedded
                        hideOuterTitle
                      />
                    ) : (
                      <>
                        <AnsweredQuestionsSidebar
                          questions={lastClarificationQuestions!}
                          answers={lastClarificationAnswers!}
                          sections={result.clarification_question_sections ?? []}
                          embedded
                          hideOuterTitle
                          decisionId={result.decision_id}
                          onSave={(newAnswers) => {
                            setLastClarificationAnswers(newAnswers);
                            if (lastClarificationQuestions?.length) {
                              setClarificationSnapshot(result.run_id, lastClarificationQuestions, newAnswers);
                            }
                          }}
                        />
                        {(result.status === "complete" || result.status === "pending_brief") && (
                          <div className="mt-4 border-t border-slate-200 pt-4">
                            {reapplyClarificationError ? (
                              <p className="mb-2 text-sm text-red-600">{reapplyClarificationError}</p>
                            ) : null}
                            {reapplyClarificationSubmitting ? (
                              <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                                <p className="font-medium">
                                  {CLARIFICATION_REGENERATION_STEPS[
                                    reapplyClarificationStep % CLARIFICATION_REGENERATION_STEPS.length
                                  ]}
                                </p>
                                <p className="mt-1 text-indigo-600">This usually takes 5–15 seconds.</p>
                              </div>
                            ) : null}
                            <button
                              type="button"
                              disabled={reapplyClarificationSubmitting}
                              onClick={() => void handleReapplyClarificationFromEdits()}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
                            >
                              {reapplyClarificationSubmitting ? (
                                <>
                                  <span
                                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                    aria-hidden
                                  />
                                  Regenerating…
                                </>
                              ) : (
                                "Regenerate analysis & brief from answers above"
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </CollapsibleBlock>
                )}

                {/* Variant created success message */}
                {variantCreated && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-medium text-emerald-800">
                      Variant created: {variantCreated}
                    </p>
                    <Link
                      href={`/run/result?run_id=${result.run_id}`}
                      className="mt-2 inline-block text-sm text-emerald-700 underline hover:text-emerald-800"
                    >
                      View on result page →
                    </Link>
                  </div>
                )}

                {canCreateVariants && (
                  <CollapsibleBlock
                    id="sidebar-suggest-variant"
                    title="Suggest a variant"
                    subtitle="Ask the AI for an extra brief section—timeline, cost breakdown, comparison matrix, and similar. Use the switcher above to view variants once created."
                    defaultOpen
                    className="border-indigo-200 bg-white"
                    bodyClassName="space-y-3 px-3 py-4"
                  >
                    {requestingSuggestion ? (
                      <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50/80 px-3 py-2.5 text-sm text-indigo-800">
                        <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" aria-hidden />
                        <span>Thinking…</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => void requestSuggestion()}
                          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                        >
                          Suggest a variant
                        </button>
                        {declinedVariantSuggestions.length > 0 &&
                          requestedSuggestion === null &&
                          !requestingSuggestion && (
                            <p className="text-xs text-slate-500">
                              You&apos;ve passed on {declinedVariantSuggestions.length} idea
                              {declinedVariantSuggestions.length === 1 ? "" : "s"}. The next suggestion will try something
                              different.
                            </p>
                          )}
                      </div>
                    )}
                    {requestedSuggestion !== null && requestedSuggestion !== undefined && (
                      <div className="border-t border-slate-200 pt-3">
                        {requestedSuggestion === "" ? (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600">The AI didn&apos;t suggest an addition for this analysis.</p>
                            <button
                              type="button"
                              onClick={() => void requestVariantReflection(declinedVariantSuggestions)}
                              disabled={requestingSuggestion}
                              className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
                            >
                              Try again
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-700">Suggested addition:</p>
                            <p className="mt-1 text-sm text-slate-800">{requestedSuggestion}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {creatingVariant ? (
                                <div className="inline-flex items-center gap-2 rounded-md border border-indigo-300 bg-indigo-100/80 px-3 py-2 text-sm text-indigo-800">
                                  <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" aria-hidden />
                                  <span>Creating variant… (can take up to a minute)</span>
                                </div>
                              ) : createdVariantFromBlock ? (
                                <>
                                  <span className="text-sm font-medium text-green-700">Variant created — use the switcher above to view it.</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRequestedSuggestion(null);
                                      setCreatedVariantFromBlock(false);
                                    }}
                                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRequestedSuggestion(null);
                                      setCreatedVariantFromBlock(false);
                                      void requestSuggestion();
                                    }}
                                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                                  >
                                    Suggest another variant
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCreateVariant(requestedSuggestion, true)}
                                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                  >
                                    Create this variant
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void tryAnotherVariantSuggestion()}
                                    disabled={requestingSuggestion}
                                    className="rounded-md border border-indigo-400 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
                                  >
                                    Try another idea
                                  </button>
                                  <button
                                    type="button"
                                    onClick={declineVariantSuggestion}
                                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    No thanks
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CollapsibleBlock>
                )}

                <CollapsibleBlock
                  id="sidebar-chat"
                  title="Chat"
                  subtitle={
                    <>
                      <span className="font-medium text-zinc-600">Send</span>
                      {" — Q&A on this run. "}
                      <span className="font-medium text-zinc-600">Research</span>
                      {
                        " — longer investigative reply (suggested lookups, structured sections); full text is saved under Research output. Research turns may use your provider's live web search when available."
                      }
                    </>
                  }
                  defaultOpen
                  className="border-zinc-200 bg-white"
                  bodyClassName="p-0"
                >
                  <ResultChat
                    ref={chatRef}
                    runId={result.run_id}
                    hideHeader
                    className="rounded-none border-0 shadow-none"
                    initialMessages={result.chat_messages}
                    clarificationContext={
                      lastClarificationQuestions?.length && lastClarificationAnswers && Object.keys(lastClarificationAnswers).length > 0
                        ? { questions: lastClarificationQuestions, answers: lastClarificationAnswers }
                        : undefined
                    }
                    onAcceptFormatSuggestion={canCreateVariants ? handleCreateVariant : undefined}
                    creatingVariant={creatingVariant}
                    variantId={activeVariantId ?? undefined}
                    decisionBrief={currentBrief ?? undefined}
                    synthesis={synthesis}
                    researchStarterTag={researchStarterTag}
                    onClearResearchStarterTag={() => setResearchStarterTag(null)}
                    variantStarterTag={variantStarterTag}
                    onClearVariantStarterTag={() => setVariantStarterTag(null)}
                    onLoadingChange={setChatLoading}
                    onResearchCompletionsUpdated={(completions) => {
                      setResult((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev, research_completions: completions };
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(next));
                        }
                        return next;
                      });
                    }}
                    onNavigateToResearch={navigateToResearchCompletion}
                  />
                </CollapsibleBlock>

                <CollapsibleBlock
                  id="sidebar-research-starters"
                  title="Research starters"
                  subtitle="Pre-fill the chat above; tagged replies also appear in Research output on the left."
                  defaultOpen={false}
                  className="border-violet-200 bg-white"
                  bodyClassName="px-3 py-4"
                >
                  <ResearchStarterDemos
                    compact
                    demoScenarioId={result.demo_scenario_id}
                    activeStarter={researchStarterTag}
                    onPick={(pick) => {
                      setVariantStarterTag(null);
                      setResearchStarterTag({ label: pick.label, groupTitle: pick.groupTitle });
                      chatRef.current?.prefillInput(pick.prompt);
                    }}
                    onClearTag={() => setResearchStarterTag(null)}
                    disabled={chatLoading}
                  />
                </CollapsibleBlock>

                {canCreateVariants ? (
                  <CollapsibleBlock
                    id="sidebar-variant-starters"
                    title="Variant starters"
                    subtitle="Pre-fill a normal chat message to ask for an extra brief format (new tab). Use Send, not Research."
                    defaultOpen={false}
                    className="border-indigo-200 bg-white"
                    bodyClassName="px-3 py-4"
                  >
                    <VariantStarterDemos
                      compact
                      demoScenarioId={result.demo_scenario_id}
                      activeStarter={variantStarterTag}
                      onPick={(pick) => {
                        setResearchStarterTag(null);
                        setVariantStarterTag({ label: pick.label, groupTitle: pick.groupTitle });
                        chatRef.current?.prefillInput(pick.prompt);
                      }}
                      onClearTag={() => setVariantStarterTag(null)}
                      disabled={chatLoading}
                    />
                  </CollapsibleBlock>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <ConfirmModal
        open={deleteVariantConfirm !== null}
        title="Delete variant?"
        body={
          deleteVariantConfirm
            ? `Delete “${deleteVariantConfirm.label}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteVariantConfirm(null)}
        onConfirm={executeDeleteVariant}
      />
      <AlertModal
        open={deleteVariantError !== null}
        title="Couldn’t delete variant"
        body={deleteVariantError ?? ""}
        onClose={() => setDeleteVariantError(null)}
      />
      <ConfirmModal
        open={deleteRunConfirm !== null}
        title="Delete this analysis?"
        body={
          deleteRunConfirm
            ? `Delete “${deleteRunConfirm.label}”? This removes the run and its chat history for this decision. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteRunConfirm(null)}
        onConfirm={executeDeleteRun}
      />
      <AlertModal
        open={deleteRunError !== null}
        title="Couldn’t delete analysis"
        body={deleteRunError ?? ""}
        onClose={() => setDeleteRunError(null)}
      />
    </main>
  );
}

export default function RunChatPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50">
          <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white shadow-sm">
            <div className="mx-auto max-w-7xl px-6 py-4">
              <h1 className="text-xl font-semibold text-slate-900">Decision analysis</h1>
            </div>
          </header>
          <div className="mx-auto max-w-2xl px-6 py-12">
            <p className="text-slate-600">Loading…</p>
          </div>
        </main>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
