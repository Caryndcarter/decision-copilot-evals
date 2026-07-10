"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { LogoLockup } from "@/app/components/logo-icon";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionNav } from "@/app/components/session-nav";
import type { DecisionRunResult, Posture, DecisionBrief } from "@/types/decision";
import { ResultContent, type ResultContentHandle } from "../result-content";
import { CollapsibleBlock } from "../collapsible-block";
import { ResearchMarkdown, ResearchMarkdownInline } from "../research-markdown";
import { isMeaningfulResearchText, researchCompletionNavLines } from "@/lib/research-structured-response";
import { runHeadline, runPostureLabel, runShortChromeLabel } from "@/lib/run-display-name";
import { runHasAnalysisForUnifiedBrief } from "@/lib/unified-brief-eligibility";
import { scrollToAnalysisVersion } from "@/lib/run-analysis-scroll";
import { AlertModal, ConfirmModal } from "../confirm-modal";

const RUN_RESULT_KEY = "decisionRunResult";
const CLARIFICATION_SNAPSHOT_KEY = "decisionRunClarificationSnapshot";

function removeStoredSnapshot(run_id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CLARIFICATION_SNAPSHOT_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, unknown>;
    if (!(run_id in map)) return;
    delete map[run_id];
    if (Object.keys(map).length === 0) {
      sessionStorage.removeItem(CLARIFICATION_SNAPSHOT_KEY);
    } else {
      sessionStorage.setItem(CLARIFICATION_SNAPSHOT_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
}

const POSTURES: Posture[] = ["explore", "pressure_test", "surface_risks", "generate_alternatives"];

function RunResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<DecisionRunResult | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [otherRuns, setOtherRuns] = useState<DecisionRunResult[]>([]);
  const [postureDropdownOpen, setPostureDropdownOpen] = useState(false);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [rerunPosture, setRerunPosture] = useState<Posture>("explore");
  const [rerunLeaningDirection, setRerunLeaningDirection] = useState("");
  const [rerunSubmitting, setRerunSubmitting] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [rerunAllProviders, setRerunAllProviders] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [researchOpen, setResearchOpen] = useState(true);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [deleteVariantConfirm, setDeleteVariantConfirm] = useState<{ variantId: string; label: string } | null>(null);
  const [deleteVariantError, setDeleteVariantError] = useState<string | null>(null);
  const [deleteRunConfirm, setDeleteRunConfirm] = useState<{ run_id: string; label: string } | null>(null);
  const [deleteRunError, setDeleteRunError] = useState<string | null>(null);
  const [currentBrief, setCurrentBrief] = useState<DecisionBrief | null>(null);
  const resultContentRef = useRef<ResultContentHandle>(null);

  useEffect(() => {
    fetch("/api/decision/providers")
      .then((res) => res.json())
      .then((data: { providers?: string[] }) => {
        const list = Array.isArray(data?.providers) ? data.providers : [];
        setConfiguredProviders(list);
      })
      .catch(() => {
        setConfiguredProviders([]);
      });
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
          setRawJson(JSON.stringify(data, null, 2));
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
      setRawJson(JSON.stringify(data, null, 2));
    } catch {
      setMissing(true);
    }
  }, [searchParams]);

  // Refetch when run_id changes so dropdown stays in sync (e.g. after navigating from chat)
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

  useEffect(() => {
    setActiveVariantId(null);
  }, [result?.run_id]);

  // When switching between base and variant view, sync currentBrief for brief editors (onBriefChange)
  useEffect(() => {
    if (!result) return;
    if (activeVariantId) {
      const variant = result.variants?.find((v) => v.variant_id === activeVariantId);
      setCurrentBrief(variant?.decision_brief ? { ...variant.decision_brief } : null);
    } else {
      setCurrentBrief(result.decision_brief ? { ...result.decision_brief } : null);
    }
  }, [activeVariantId]); // Intentionally only when view switches; result/activeVariant read from closure

  const handleUpdatedResult = (updated: DecisionRunResult) => {
    setResult(updated);
    setRawJson(JSON.stringify(updated, null, 2));
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(updated));
    }
  };

  async function executeDeleteVariant() {
    const pending = deleteVariantConfirm;
    if (!pending || !result?.run_id) return;
    const { variantId } = pending;
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
      handleUpdatedResult(data as DecisionRunResult);
      if (activeVariantId === variantId) {
        setActiveVariantId(null);
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
      removeStoredSnapshot(targetId);
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
          router.push(`/run/result?run_id=${runs[0].run_id}`);
        } else {
          router.push("/intake");
        }
      }
    } catch {
      setDeleteRunConfirm(null);
      setDeleteRunError("Failed to delete analysis");
    }
  }

  // Get the active variant data if viewing a variant
  const activeVariant = activeVariantId
    ? result?.variants?.find((v) => v.variant_id === activeVariantId)
    : null;

  if (missing) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-2">
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
          <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-2">
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

  const runsList = otherRuns.length > 0 ? otherRuns : [result];
  const hasCurrent = result && runsList.some((r) => r.run_id === result.run_id);
  const runsForDropdown = hasCurrent ? runsList : result ? [result, ...runsList] : runsList;
  const currentRunLabel = runShortChromeLabel(result);
  const posturesAlreadyRun = new Set(runsForDropdown.map((r) => r.intake.posture));
  const availablePostures = POSTURES.filter((p) => !posturesAlreadyRun.has(p));

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

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Nav — matches landing/intake/chat */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm print:hidden">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <LogoLockup />
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={`/run/chat${result.run_id ? `?run_id=${result.run_id}` : ""}`}
              className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Chat view
            </Link>
            {!activeVariantId && runHasAnalysisForUnifiedBrief(result) ? (
              <Link
                href={`/run/best-of-worlds?decision_id=${encodeURIComponent(result.decision_id)}`}
                title="Best-of-all-worlds brief: merges every run, research, and variants (Anthropic)"
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

      {/* Toolbar */}
      <header className="border-b border-zinc-200 bg-white shadow-sm print:static print:shadow-none print:border-none">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-base font-semibold text-zinc-900">
            Decision Brief <span className="font-normal text-zinc-500">— {currentRunLabel}</span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <div className="relative">
              <button
                type="button"
                onClick={() => setPostureDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                aria-expanded={postureDropdownOpen}
                aria-haspopup="listbox"
              >
                {currentRunLabel}
                <span className="text-zinc-400">▾</span>
              </button>
              {postureDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setPostureDropdownOpen(false)} />
                  <ul className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-zinc-200 bg-white py-1 shadow-lg" role="listbox">
                    {runsForDropdown.length > 1 ? (
                      <li className="px-3 py-2 text-xs leading-snug text-zinc-500 border-b border-slate-100">
                        Your think tank on this decision
                      </li>
                    ) : null}
                    {runsForDropdown.map((r) => (
                      <li key={r.run_id} className="flex items-stretch border-b border-slate-100 last:border-0">
                        <Link
                          href={`/run/result?run_id=${r.run_id}`}
                          className={`min-w-0 flex-1 px-3 py-2 text-sm ${r.run_id === result.run_id ? "bg-indigo-50 font-medium text-indigo-800" : "text-zinc-700 hover:bg-zinc-50"}`}
                          onClick={() => setPostureDropdownOpen(false)}
                        >
                          {runShortChromeLabel(r)}
                          {r.run_id === result.run_id && " (current)"}
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
            <button
              type="button"
              onClick={() => {
                const prev = document.title;
                const briefTitle = result.decision_brief?.title?.trim();
                const raw = (briefTitle && briefTitle !== "Decision brief")
                  ? briefTitle
                  : (result.decision_title?.trim() || runHeadline(result));
                document.title = `Decision Brief – ${raw}`;
                window.addEventListener("afterprint", () => { document.title = prev; }, { once: true });
                window.print();
              }}
              className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {showRerunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-900/50" aria-hidden onClick={() => !rerunSubmitting && setShowRerunModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">Run with different posture</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Re-run the same analysis (same situation, constraints, and your clarification answers) with a different posture.
            </p>
            <div className="mt-4 space-y-4">
              {availablePostures.length === 0 ? (
                <p className="text-sm text-zinc-600">You&apos;ve already run all postures for this decision. Use the dropdown above to switch between them.</p>
              ) : (
              <div>
                <label htmlFor="rerun-posture-result" className="block text-sm font-medium text-zinc-700">Posture</label>
                <select
                  id="rerun-posture-result"
                  value={availablePostures.includes(rerunPosture) ? rerunPosture : availablePostures[0]}
                  onChange={(e) => setRerunPosture(e.target.value as Posture)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availablePostures.map((p) => (
                    <option key={p} value={p}>{runPostureLabel(p)}</option>
                  ))}
                </select>
              </div>
              )}
              {rerunPosture === "pressure_test" && availablePostures.length > 0 && (
                <div>
                  <label htmlFor="rerun-leaning-result" className="block text-sm font-medium text-zinc-700">Leaning toward</label>
                  <input
                    id="rerun-leaning-result"
                    type="text"
                    value={rerunLeaningDirection}
                    onChange={(e) => setRerunLeaningDirection(e.target.value)}
                    placeholder="e.g. Option A"
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-800 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
              {configuredProviders.length >= 2 && availablePostures.length > 0 && (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={rerunAllProviders}
                    onChange={(e) => setRerunAllProviders(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="font-medium">Full think tank (simultaneous)</span>
                    <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                      Run OpenAI, Anthropic, Google Gemini, and xAI in parallel for this posture—same as on the intake form.
                    </span>
                  </span>
                </label>
              )}
              {rerunError && <p className="text-sm text-red-600">{rerunError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => !rerunSubmitting && setShowRerunModal(false)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRerunPosture}
                disabled={rerunSubmitting || availablePostures.length === 0 || (rerunPosture === "pressure_test" && !rerunLeaningDirection.trim())}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {rerunSubmitting ? "Running…" : rerunAllProviders ? "Run all providers" : "Run analysis"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-8">
        {result.variants && result.variants.length > 0 && (
          <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Analysis versions</h3>
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
                      : "border-zinc-300"
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
                        : "bg-white text-zinc-700 hover:bg-zinc-50"
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
                    className="border-l border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-500 hover:bg-red-50 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {activeVariant && (
              <p className="mt-2 text-xs text-zinc-500">
                Created {new Date(activeVariant.created_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {activeVariant ? (
          <ResultContent
            ref={resultContentRef}
            result={{
              ...result,
              lens_outputs: activeVariant.lens_outputs,
              decision_brief: activeVariant.decision_brief,
            }}
            variantId={activeVariant.variant_id}
            onRunUpdate={handleUpdatedResult}
            onBriefChange={setCurrentBrief}
            onExpandAll={() => setResearchOpen(true)}
            onCollapseAll={() => setResearchOpen(false)}
            onJumpToResearch={
              (result.research_completions ?? []).length > 0
                ? () => {
                    setResearchOpen(true);
                    setTimeout(() => {
                      document
                        .getElementById("brief-research-section")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }
                : undefined
            }
          />
        ) : (
          <ResultContent
            ref={resultContentRef}
            result={result}
            onRunUpdate={(updated) => {
              setResult(updated);
              setRawJson(JSON.stringify(updated, null, 2));
              if (typeof window !== "undefined") {
                sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(updated));
              }
            }}
            onBriefChange={setCurrentBrief}
            onExpandAll={() => setResearchOpen(true)}
            onCollapseAll={() => setResearchOpen(false)}
            onJumpToResearch={
              (result.research_completions ?? []).length > 0
                ? () => {
                    setResearchOpen(true);
                    setTimeout(() => {
                      document
                        .getElementById("brief-research-section")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }
                : undefined
            }
          />
        )}

        {(result.research_completions ?? []).length > 0 && (
          <div className="mt-8">
            <CollapsibleBlock
              id="brief-research-section"
              title="Research"
              open={researchOpen}
              onOpenChange={setResearchOpen}
              className="border-violet-200 bg-white"
              bodyClassName="space-y-5 px-5 pb-5 pt-3"
            >
              {(result.research_completions ?? []).map((rc) => {
                const { primary, secondary } = researchCompletionNavLines(rc);
                const sectionsWithBody = (rc.sections ?? []).filter((s) => isMeaningfulResearchText(s.body));
                const hasMain = Boolean(rc.main_answer && isMeaningfulResearchText(rc.main_answer));
                return (
                  <div key={rc.research_id} className="rounded-md border border-violet-100 bg-zinc-50/60 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold leading-snug text-zinc-800">{primary}</p>
                      {secondary ? (
                        <p className="mt-1 text-xs font-normal text-zinc-500">{secondary}</p>
                      ) : null}
                    </div>
                    <div className="space-y-4">
                      {hasMain && <ResearchMarkdown source={rc.main_answer!} />}
                      {sectionsWithBody.map((s, j) => (
                        <section key={j}>
                          <h4 className="text-sm font-semibold text-zinc-900">
                            <ResearchMarkdownInline source={s.heading} />
                          </h4>
                          <div className="mt-1.5">
                            <ResearchMarkdown source={s.body} />
                          </div>
                        </section>
                      ))}
                      {!hasMain && sectionsWithBody.length === 0 && (
                        <p className="text-sm text-zinc-500">No content stored for this research task.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CollapsibleBlock>
          </div>
        )}

        <div className="mt-8 print:hidden">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-sm text-zinc-500 underline hover:text-zinc-700"
          >
            {showRaw ? "Hide raw JSON" : "View raw JSON"}
          </button>
          {showRaw && rawJson && (
            <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-600">
              {rawJson}
            </pre>
          )}
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

export default function RunResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50">
          <div className="mx-auto max-w-2xl px-6 py-12">
            <p className="text-zinc-600">Loading…</p>
          </div>
        </main>
      }
    >
      <RunResultContent />
    </Suspense>
  );
}
