"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogoLockup } from "@/app/components/logo-icon";
import type { DecisionRunResult } from "@/types/decision";
import { ResearchMarkdown, ResearchMarkdownInline } from "../research-markdown";
import { listIncompleteRunsForBestOfWorlds } from "@/lib/best-of-worlds-incomplete";
import { pickPersistRunForUnifiedBrief } from "@/lib/unified-brief-persist-run";
import { decisionGroupTitleFromRuns } from "@/lib/run-display-name";
import { UnifiedBriefChat } from "../unified-brief-chat";
import { UnifiedBriefContributionsPanel } from "../unified-brief-contributions-panel";
import {
  UnifiedBriefInfluenceChartsBody,
  UnifiedBriefInfluenceChartsOverlay,
} from "../unified-brief-influence-charts";
import { buildInfluenceMatrix } from "@/lib/unified-brief-influence-matrix";
import { SessionNav } from "@/app/components/session-nav";
import { BriefGeneratedDateLine } from "@/app/components/brief-generated-date";
import {
  authorshipModeFromFlags,
  getUnifiedBriefContributionsByAuthor,
  getUnifiedBriefContributionsForAuthor,
  getUnifiedBriefForAuthor,
  isUnifiedBriefSynthesizer,
  listAvailableUnifiedBriefAuthors,
  UNIFIED_BRIEF_SYNTHESIZERS,
  unifiedBriefSynthesizerLabel,
  type UnifiedBriefAuthorshipMode,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import type { LLMProviderName } from "@/types/decision";

const RUN_RESULT_KEY = "decisionRunResult";

function unifiedBriefGeneratingSteps(synthesizer: UnifiedBriefSynthesizer): string[] {
  const label = unifiedBriefSynthesizerLabel(synthesizer);
  return [
    "Gathering analyses from your think tank…",
    "Merging lens outputs and individual briefs…",
    "Pulling in research and saved variants…",
    `Building the consolidated prompt for ${label}…`,
    "Synthesizing your Unified Brief…",
    "Shaping recommendation and next steps…",
    "Almost there…",
  ];
}

/** Reads `decision_id` and/or `run_id` from the URL; remounts when either changes. */
function UnifiedBriefShell() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("run_id")?.trim() ?? "";
  const decisionId = searchParams.get("decision_id")?.trim() ?? "";
  return (
    <UnifiedBriefPageInner
      key={decisionId || runId ? `${decisionId}|${runId}` : "__missing__"}
      runId={runId}
      decisionId={decisionId}
    />
  );
}

function UnifiedBriefPageInner({ runId, decisionId }: { runId: string; decisionId: string }) {
  /** Only `load()` bumps this — so refresh is not cancelled by starting/finishing a unified-brief POST. */
  const loadSeqRef = useRef(0);
  /** Only `handleRegenerate()` bumps this — so two Generate clicks don't apply stale responses. */
  const regenSeqRef = useRef(0);

  /** Storage run for this decision (Unified Brief + chat live here); headline is still decision-level. */
  const [persistRun, setPersistRun] = useState<DecisionRunResult | null>(null);
  const [allRuns, setAllRuns] = useState<DecisionRunResult[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  /** Shown after successful refresh/load so “Refresh data” visibly did work even when data looks unchanged. */
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  /** Right panel view: discuss (chat) or contribution attribution. */
  const [asideTab, setAsideTab] = useState<"discuss" | "contributions">("discuss");
  const [influenceChartsOpen, setInfluenceChartsOpen] = useState(false);
  /** Which synthesizer's brief is on screen and target for Generate / Regenerate. */
  const [activeSynthesizer, setActiveSynthesizer] = useState<UnifiedBriefSynthesizer>("anthropic");
  /** Synthesizers with API keys configured (subset of UNIFIED_BRIEF_SYNTHESIZERS). */
  const [configuredSynthesizers, setConfiguredSynthesizers] = useState<UnifiedBriefSynthesizer[]>([
    "anthropic",
    "openai",
    "gemini",
    "xai",
  ]);
  /** When on, prompts use AI Model 1/2/… instead of brand names; UI still shows decoded brands. */
  const [blindAuthorship, setBlindAuthorship] = useState(false);
  /** When on, brand names are randomly reassigned (unique bijection) in the prompt. Mutually exclusive with blind. */
  const [reassignedAuthorship, setReassignedAuthorship] = useState(false);

  const incomplete = listIncompleteRunsForBestOfWorlds(allRuns);
  const generatingSteps = unifiedBriefGeneratingSteps(activeSynthesizer);

  const selectSynthesizer = useCallback((author: UnifiedBriefSynthesizer) => {
    setActiveSynthesizer(author);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/decision/providers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { providers?: LLMProviderName[] }) => {
        if (cancelled || !Array.isArray(data.providers)) return;
        const configured = UNIFIED_BRIEF_SYNTHESIZERS.filter((s) => data.providers!.includes(s));
        if (configured.length > 0) setConfiguredSynthesizers(configured);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!persistRun) return;
    const available = listAvailableUnifiedBriefAuthors(persistRun);
    if (available.length === 0) return;
    setActiveSynthesizer((prev) => (available.includes(prev) ? prev : available[0]));
  }, [persistRun]);

  useEffect(() => {
    setActiveSynthesizer((prev) =>
      configuredSynthesizers.includes(prev) ? prev : configuredSynthesizers[0] ?? "anthropic"
    );
  }, [configuredSynthesizers]);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setGeneratingStep((prev) => (prev + 1) % generatingSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [generating, generatingSteps.length]);

  const load = useCallback(async () => {
    if (!runId && !decisionId) {
      loadSeqRef.current += 1;
      setLoadError(
        "Missing decision in the URL. Use ?decision_id=… from My Decisions, or open Unified Brief from Chat or an analysis page."
      );
      setPersistRun(null);
      setAllRuns([]);
      return;
    }
    const seq = ++loadSeqRef.current;
    setLoadError(null);
    try {
      let runs: DecisionRunResult[] = [];
      if (decisionId) {
        const listRes = await fetch(`/api/decision/run?decision_id=${encodeURIComponent(decisionId)}`, {
          cache: "no-store",
        });
        const listData = await listRes.json();
        if (seq !== loadSeqRef.current) return;
        if (!listRes.ok || !Array.isArray(listData.runs)) {
          setLoadError(listData.error || "Failed to load decision runs");
          setPersistRun(null);
          setAllRuns([]);
          return;
        }
        runs = listData.runs as DecisionRunResult[];
      } else {
        const res = await fetch(`/api/decision/run?run_id=${encodeURIComponent(runId)}`, { cache: "no-store" });
        const data = await res.json();
        if (seq !== loadSeqRef.current) return;
        if (!res.ok) {
          setLoadError(data.error || "Failed to load decision");
          setPersistRun(null);
          setAllRuns([]);
          return;
        }
        const r = data as DecisionRunResult;
        const listRes = await fetch(`/api/decision/run?decision_id=${encodeURIComponent(r.decision_id)}`, {
          cache: "no-store",
        });
        const listData = await listRes.json();
        if (seq !== loadSeqRef.current) return;
        if (listRes.ok && Array.isArray(listData.runs)) {
          runs = listData.runs as DecisionRunResult[];
        } else {
          runs = [r];
        }
      }
      const picked = pickPersistRunForUnifiedBrief(runs);
      if (!picked) {
        setLoadError("No runs found for this decision.");
        setPersistRun(null);
        setAllRuns([]);
        return;
      }
      setPersistRun(picked);
      setAllRuns(runs);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(picked));
      }
      setLastSyncedAt(Date.now());
    } catch {
      if (seq !== loadSeqRef.current) return;
      setLoadError("Failed to load decision");
      setPersistRun(null);
      setAllRuns([]);
    }
  }, [runId, decisionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRegenerate() {
    if (!runId && !decisionId) return;
    const regenSeq = ++regenSeqRef.current;
    setGenError(null);
    setGeneratingStep(0);
    setGenerating(true);
    try {
      const res = await fetch("/api/decision/run/best-of-worlds-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(decisionId ? { decision_id: decisionId } : { run_id: runId }),
          synthesizer: activeSynthesizer,
          blind: blindAuthorship,
          reassigned: reassignedAuthorship,
        }),
      });
      const data = await res.json();
      if (regenSeq !== regenSeqRef.current) return;
      if (!res.ok) {
        setGenError(data.error || "Generation failed");
        return;
      }
      const next = data.run as DecisionRunResult;
      const synth =
        typeof data.synthesizer === "string" && isUnifiedBriefSynthesizer(data.synthesizer)
          ? data.synthesizer
          : activeSynthesizer;
      selectSynthesizer(synth);
      setPersistRun(next);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(next));
      }
      await load();
    } catch (e) {
      if (regenSeq !== regenSeqRef.current) return;
      setGenError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
      setGeneratingStep(0);
    }
  }

  const showIncomplete = incomplete.length > 0;
  const rows = incomplete;
  const authorshipMode: UnifiedBriefAuthorshipMode = authorshipModeFromFlags(
    blindAuthorship,
    reassignedAuthorship
  );
  const brief = persistRun
    ? getUnifiedBriefForAuthor(persistRun, activeSynthesizer, authorshipMode)
    : undefined;
  const contributions = persistRun
    ? getUnifiedBriefContributionsForAuthor(persistRun, activeSynthesizer, authorshipMode)
    : undefined;
  const influenceMatrix = persistRun
    ? buildInfluenceMatrix(getUnifiedBriefContributionsByAuthor(persistRun, authorshipMode))
    : null;
  const activeSynthesizerLabel = unifiedBriefSynthesizerLabel(activeSynthesizer);
  const navRunId = persistRun?.run_id ?? (runId || "");
  const authorshipModeLabel =
    authorshipMode === "blind"
      ? "Blind authorship"
      : authorshipMode === "reassigned"
        ? "Reassigned authorship"
        : "Standard authorship";

  const handlePrintBrief = useCallback(() => {
    if (!brief || !persistRun) return;
    const prev = document.title;
    const raw = decisionGroupTitleFromRuns(allRuns.length > 0 ? allRuns : [persistRun]);
    document.title = `Unified Brief – ${raw}`;
    window.addEventListener(
      "afterprint",
      () => {
        document.title = prev;
      },
      { once: true }
    );
    window.print();
  }, [allRuns, brief, persistRun]);

  const applyPersistRun = useCallback((next: DecisionRunResult) => {
    setPersistRun(next);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(next));
    }
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm print:hidden">
        <div className="mx-auto max-w-7xl px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <LogoLockup />
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            {navRunId ? (
              <>
                <Link
                  href={`/run/chat?run_id=${encodeURIComponent(navRunId)}`}
                  className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Chat
                </Link>
                <Link
                  href={`/run/result?run_id=${encodeURIComponent(navRunId)}`}
                  title="This run only: risk, reversibility, people lenses and a single decision brief—not the unified multi-provider brief."
                  className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  Single brief
                </Link>
              </>
            ) : null}
            <Link
              href="/intake"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              New decision
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-zinc-900 print:hidden">Unified Brief</h1>
        <p className="mt-2 text-sm text-zinc-600 print:hidden">
          Merge the strongest ideas from every model and posture on this decision, plus all research and saved
          variants. Pick a synthesis model, generate a brief, and compare versions side by side.
        </p>

        {loadError && (
          <p className="mt-6 text-sm text-red-600 print:hidden">{loadError}</p>
        )}

        {(runId || decisionId) && !persistRun && !loadError ? (
          <p className="mt-6 text-sm text-zinc-500 print:hidden">Loading decision…</p>
        ) : null}

        {persistRun && !loadError && (
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_440px]">
            <div className="min-w-0">
              <div className="text-sm text-zinc-700 print:mb-2 space-y-1">
                <p className="text-base font-semibold text-zinc-900 leading-snug">
                  {decisionGroupTitleFromRuns(allRuns.length > 0 ? allRuns : [persistRun])}
                </p>
                <p className="text-xs text-zinc-500 print:hidden">
                  Each think tank member&apos;s analysis on this decision feeds the brief above.
                </p>
              </div>

              {showIncomplete && (
                <div
                  className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 print:hidden"
                  role="status"
                >
                  <p className="font-semibold text-amber-900">Some analyses are not final yet</p>
                  <p className="mt-1 text-amber-900/90">
                    Each line is one canonical analysis lane (provider · posture · leaning): the most advanced run in
                    that lane. Older duplicate runs on this decision are ignored. The Unified Brief still merges every
                    posture and provider that has usable analysis; regenerate after lines below reach{" "}
                    <code className="rounded bg-amber-100/80 px-1">complete</code> or{" "}
                    <code className="rounded bg-amber-100/80 px-1">pending_brief</code> if you want the freshest merge.
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {rows.map((r) => (
                      <li key={r.run_id}>
                        {r.label} — <span className="font-mono text-xs">{r.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm print:hidden"
                aria-label="Unified brief controls"
              >
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Active model
                    </p>
                    <p className="text-xs text-zinc-500">
                      View and generate with the same model
                    </p>
                  </div>

                  <div
                    className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
                    role="tablist"
                    aria-label="Active synthesis model"
                  >
                    {configuredSynthesizers.map((author) => {
                      const selected = author === activeSynthesizer;
                      const hasBrief = !!(
                        persistRun && getUnifiedBriefForAuthor(persistRun, author, authorshipMode)
                      );
                      return (
                        <button
                          key={author}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          disabled={generating}
                          onClick={() => selectSynthesizer(author)}
                          className={`flex min-w-[9.5rem] shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-600/20"
                              : "border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:border-zinc-300 hover:bg-white"
                          }`}
                        >
                          <span className="text-sm font-medium leading-tight">
                            {unifiedBriefSynthesizerLabel(author)}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              hasBrief
                                ? selected
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-emerald-50 text-emerald-700"
                                : selected
                                  ? "bg-zinc-200/80 text-zinc-600"
                                  : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {hasBrief ? "Saved" : "New"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => void handleRegenerate()}
                        disabled={generating}
                        title={
                          brief
                            ? `Regenerate the Unified Brief using ${activeSynthesizerLabel}`
                            : `Generate a Unified Brief using ${activeSynthesizerLabel}`
                        }
                        aria-label={
                          generating
                            ? `Generating Unified Brief with ${activeSynthesizerLabel}`
                            : brief
                              ? `Regenerate Unified Brief with ${activeSynthesizerLabel}`
                              : `Generate Unified Brief with ${activeSynthesizerLabel}`
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {generating ? (
                          <>
                            <span
                              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                              aria-hidden
                            />
                            Generating with {activeSynthesizerLabel}…
                          </>
                        ) : brief ? (
                          <>Regenerate with {activeSynthesizerLabel}</>
                        ) : (
                          <>Generate with {activeSynthesizerLabel}</>
                        )}
                      </button>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void load()}
                          disabled={generating}
                          title="Fetch the latest saved runs and briefs from the server. Does not call an AI model or rewrite the brief."
                          aria-label="Reload data from server without regenerating the brief"
                          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reload data
                        </button>
                        <button
                          type="button"
                          disabled={!brief || generating}
                          onClick={handlePrintBrief}
                          title="Download as PDF"
                          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          PDF
                        </button>
                        {lastSyncedAt != null ? (
                          <span
                            className="text-xs text-zinc-400"
                            title="Last time saved data was loaded from the server"
                          >
                            Reloaded{" "}
                            {new Date(lastSyncedAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600 select-none">
                        <input
                          type="checkbox"
                          checked={blindAuthorship}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setBlindAuthorship(on);
                            if (on) setReassignedAuthorship(false);
                          }}
                          disabled={generating}
                          className="h-4 w-4 shrink-0 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        Blind authorship
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600 select-none">
                        <input
                          type="checkbox"
                          checked={reassignedAuthorship}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setReassignedAuthorship(on);
                            if (on) setBlindAuthorship(false);
                          }}
                          disabled={generating}
                          className="h-4 w-4 shrink-0 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        Reassigned authorship
                      </label>
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-500">
                      Blind authorship hides brand names from the brief author (sources become AI Model 1, 2,
                      3…). Reassigned authorship keeps brand names but randomly remaps them—each voice gets a
                      unique wrong label (e.g. Anthropic’s run may appear as xAI). You still see real names.
                      Standard, blind, and reassigned briefs are saved separately; the toggles switch between
                      them.
                    </p>
                  </div>
                </div>

                {(generating || genError) && (
                  <div className="border-t border-zinc-100 px-4 py-3 text-sm">
                    {generating ? (
                      <div className="text-indigo-800" role="status" aria-live="polite">
                        <p className="font-medium">{generatingSteps[generatingStep]}</p>
                        <p className="mt-1 text-xs text-indigo-600">
                          {activeSynthesizerLabel} reads every member&apos;s run, research, and variants in one
                          pass. This often takes 30–60 seconds and can run longer on large decisions.
                        </p>
                      </div>
                    ) : null}
                    {genError ? <p className="text-red-600">{genError}</p> : null}
                  </div>
                )}
              </div>

              {brief ? (
                <article
                  id="unified-brief-print-root"
                  className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm print:mt-0 print:border print:shadow-none"
                >
                  <header className="border-b border-zinc-100 pb-4 print:border-zinc-200">
                    <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-zinc-500 print:block">
                      Unified decision brief
                    </p>
                    <h2 className="text-xl font-semibold text-zinc-900">{brief.title || "Decision brief"}</h2>
                    <p className="mt-1 text-xs text-zinc-500 print:hidden">
                      Synthesized by {activeSynthesizerLabel} · {authorshipModeLabel}
                    </p>
                    <BriefGeneratedDateLine iso={brief.generated_at} className="mt-1" label="Generated" />
                  </header>
                  <div className="mt-6 space-y-6">
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Summary</h3>
                      <div className="mt-2 text-zinc-800">
                        <ResearchMarkdown source={brief.summary ?? ""} />
                      </div>
                    </section>
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recommendation</h3>
                      <div className="mt-2 text-zinc-800">
                        <ResearchMarkdown source={brief.recommendation ?? ""} />
                      </div>
                    </section>
                    {brief.key_considerations && brief.key_considerations.length > 0 && (
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Key considerations
                        </h3>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-800">
                          {brief.key_considerations.map((k, i) => (
                            <li key={i}>
                              <ResearchMarkdownInline source={k} />
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {brief.next_steps && brief.next_steps.length > 0 && (
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Next steps</h3>
                        <ol className="mt-2 list-inside list-decimal space-y-1 text-zinc-800">
                          {brief.next_steps.map((n, i) => (
                            <li key={i}>
                              <ResearchMarkdownInline source={n} />
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}
                    {brief.custom_sections && brief.custom_sections.length > 0 && (
                      <section className="space-y-4">
                        {brief.custom_sections.map((s, i) => (
                          <div key={i} className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
                            <h3 className="text-sm font-semibold text-zinc-900">{s.heading}</h3>
                            <div className="mt-2 text-zinc-800">
                              <ResearchMarkdown source={s.content} />
                            </div>
                          </div>
                        ))}
                      </section>
                    )}
                  </div>
                </article>
              ) : (
                <p className="mt-8 text-sm text-zinc-600 print:hidden">
                  No {activeSynthesizerLabel} brief yet. With that model selected above, click{" "}
                  <span className="font-medium">Generate with {activeSynthesizerLabel}</span>.
                </p>
              )}

              {/* Print-only appendix: which model's ideas made the cut. Visible only in the downloaded PDF. */}
              {brief && contributions && contributions.contributions.length > 0 && (
                <section className="mt-8 hidden break-before-page print:block">
                  <header className="border-b border-zinc-200 pb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Appendix</p>
                    <h2 className="text-lg font-semibold text-zinc-900">Model contributions to this brief</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {activeSynthesizerLabel}&apos;s attribution of which model&apos;s ideas shaped the Unified
                      Brief.
                    </p>
                  </header>

                  {contributions.overall ? (
                    <div className="mt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        How the blend came together
                      </h3>
                      <div className="mt-1 text-sm text-zinc-800">
                        <ResearchMarkdownInline source={contributions.overall} />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-4">
                    {contributions.contributions.map((c) => (
                      <div key={c.provider} className="break-inside-avoid">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {c.provider_label}{" "}
                          <span className="font-normal text-zinc-600">
                            — {c.influence.charAt(0).toUpperCase() + c.influence.slice(1)} influence
                          </span>
                        </h3>
                        {c.summary ? (
                          <div className="mt-1 text-sm text-zinc-800">
                            <ResearchMarkdownInline source={c.summary} />
                          </div>
                        ) : null}
                        {c.adopted_ideas.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-zinc-700">Made the cut</p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-800">
                              {c.adopted_ideas.map((idea, i) => (
                                <li key={i}>
                                  <ResearchMarkdownInline source={idea} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {c.distinct_contributions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-zinc-700">Only this model raised</p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-800">
                              {c.distinct_contributions.map((idea, i) => (
                                <li key={i}>
                                  <ResearchMarkdownInline source={idea} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {c.not_adopted.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-zinc-500">Considered, not used</p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-zinc-600">
                              {c.not_adopted.map((idea, i) => (
                                <li key={i}>
                                  <ResearchMarkdownInline source={idea} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Print-only appendix: cross-model influence charts from all brief authors' contribution analyses. */}
              {influenceMatrix ? (
                <section
                  className="mt-8 hidden break-before-page print:block print-color-adjust-exact"
                  style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                >
                  <header className="border-b border-zinc-200 pb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Appendix</p>
                    <h2 className="text-lg font-semibold text-zinc-900">Influence charts</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      How each Unified Brief author weighted think tank members. High = 4, Medium = 3,
                      Low = 2, Minimal = 1.
                    </p>
                  </header>
                  <div className="mt-4">
                    <UnifiedBriefInfluenceChartsBody matrix={influenceMatrix} />
                  </div>
                </section>
              ) : null}
            </div>

            <aside
              id="unified-brief-chat-panel"
              className="min-w-0 lg:max-w-[440px] lg:sticky lg:top-6 lg:self-start print:hidden"
            >
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-3 py-2.5">
                  <div
                    className="flex gap-1 rounded-lg bg-slate-100 p-1"
                    role="tablist"
                    aria-label="Unified brief side panel"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={asideTab === "discuss"}
                      onClick={() => setAsideTab("discuss")}
                      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        asideTab === "discuss"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Discuss
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={asideTab === "contributions"}
                      onClick={() => setAsideTab("contributions")}
                      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        asideTab === "contributions"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Contributions
                    </button>
                  </div>
                </div>

                <div className={asideTab === "discuss" ? "" : "hidden"}>
                  <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3">
                    <p className="text-sm text-slate-600">
                      Pick any configured model below. Each one sees the Unified Brief you&apos;re viewing and the
                      same merged inputs from your think tank. The brief itself is authored by{" "}
                      {activeSynthesizerLabel}; other models discuss that artifact. Chat is saved per model on this
                      decision.
                    </p>
                  </div>
                  <UnifiedBriefChat
                    runId={navRunId}
                    unifiedBrief={brief}
                    briefSynthesizer={activeSynthesizer}
                    blindAuthorship={blindAuthorship}
                    reassignedAuthorship={reassignedAuthorship}
                    unifiedBriefChatByProvider={persistRun?.unified_brief_chat_by_provider}
                    unifiedBriefChatMessagesLegacy={persistRun?.unified_brief_chat_messages}
                    showChromeHeader={false}
                    className="rounded-none border-0 shadow-none"
                    messagesMaxHeightClassName="max-h-[min(380px,45vh)] lg:max-h-[min(560px,calc(100vh-13rem))]"
                    onMessagesUpdated={(patch) => {
                      setPersistRun((p) => {
                        if (!p) return p;
                        const next: typeof p = { ...p };
                        if (patch.unified_brief_chat_by_provider !== undefined) {
                          next.unified_brief_chat_by_provider = patch.unified_brief_chat_by_provider;
                        }
                        if (patch.unified_brief_chat_messages !== undefined) {
                          next.unified_brief_chat_messages = patch.unified_brief_chat_messages;
                        }
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem(RUN_RESULT_KEY, JSON.stringify(next));
                        }
                        return next;
                      });
                    }}
                  />
                </div>

                <div className={asideTab === "contributions" ? "" : "hidden"}>
                  <UnifiedBriefContributionsPanel
                    runId={navRunId}
                    decisionId={decisionId || persistRun?.decision_id || ""}
                    brief={brief}
                    contributions={contributions}
                    synthesizer={activeSynthesizer}
                    blindAuthorship={blindAuthorship}
                    reassignedAuthorship={reassignedAuthorship}
                    onUpdated={applyPersistRun}
                    onOpenInfluenceCharts={() => setInfluenceChartsOpen(true)}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      <UnifiedBriefInfluenceChartsOverlay
        open={influenceChartsOpen}
        onClose={() => setInfluenceChartsOpen(false)}
        persistRun={persistRun}
        authorshipMode={authorshipMode}
      />
    </main>
  );
}

export default function UnifiedBriefPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 px-6 py-12">
          <p className="text-zinc-600">Loading…</p>
        </main>
      }
    >
      <UnifiedBriefShell />
    </Suspense>
  );
}
