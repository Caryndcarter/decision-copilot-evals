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
import { SessionNav } from "@/app/components/session-nav";

const RUN_RESULT_KEY = "decisionRunResult";

/** Rotating status while Anthropic merges all runs (same cadence as intake). */
const UNIFIED_BRIEF_GENERATING_STEPS = [
  "Gathering every provider and posture on this decision…",
  "Merging lens analyses and briefs…",
  "Pulling in research and saved variants…",
  "Building the consolidated prompt for Anthropic…",
  "Synthesizing your Unified Brief…",
  "Shaping recommendation and next steps…",
  "Almost there…",
];

function formatBriefDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
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

  const incomplete = listIncompleteRunsForBestOfWorlds(allRuns);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setGeneratingStep((prev) => (prev + 1) % UNIFIED_BRIEF_GENERATING_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [generating]);

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
        body: JSON.stringify(decisionId ? { decision_id: decisionId } : { run_id: runId }),
      });
      const data = await res.json();
      if (regenSeq !== regenSeqRef.current) return;
      if (!res.ok) {
        setGenError(data.error || "Generation failed");
        return;
      }
      const next = data.run as DecisionRunResult;
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
  const brief = persistRun?.decision_brief_best_of_worlds;
  const navRunId = persistRun?.run_id ?? (runId || "");

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
          One Anthropic brief that merges the strongest ideas from every provider and posture on this decision, plus all
          research and saved variants. Regenerate whenever your inputs change.
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
                  All provider and posture runs on this decision feed the brief above.
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

              {generating && (
                <div
                  className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 print:hidden"
                  role="status"
                  aria-live="polite"
                >
                  <p className="font-medium">{UNIFIED_BRIEF_GENERATING_STEPS[generatingStep]}</p>
                  <p className="mt-1 text-indigo-600">
                    Anthropic reads every run, research, and variants in one pass—similar to a full intake. This often
                    takes 30–60 seconds and can run longer on large decisions.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => void handleRegenerate()}
                  disabled={generating}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating ? (
                    <>
                      <span
                        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      {UNIFIED_BRIEF_GENERATING_STEPS[generatingStep]}
                    </>
                  ) : brief ? (
                    "Regenerate"
                  ) : (
                    "Generate"
                  )}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void load()}
                    disabled={generating}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh data
                  </button>
                  {lastSyncedAt != null ? (
                    <span className="text-xs text-zinc-500" title="Last successful reload of this decision and its runs">
                      Updated {new Date(lastSyncedAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={!brief || generating}
                  onClick={() => {
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
                  }}
                  className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download PDF
                </button>
              </div>

              {genError && <p className="mt-3 text-sm text-red-600 print:hidden">{genError}</p>}

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
                    {brief.generated_at && (
                      <p className="mt-1 text-xs text-zinc-500">Generated {formatBriefDate(brief.generated_at)}</p>
                    )}
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
                  No Unified Brief yet. Choose <span className="font-medium">Generate</span> to have Anthropic read
                  every run, all research, and all variants, then write one structured brief.
                </p>
              )}
            </div>

            <aside
              id="unified-brief-chat-panel"
              className="min-w-0 lg:max-w-[440px] lg:sticky lg:top-6 lg:self-start print:hidden"
            >
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                  <h2 className="text-base font-semibold text-slate-800">Discuss this Unified Brief</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose Anthropic, OpenAI, Gemini, or xAI below. Each model sees the Unified Brief and the same merged
                    inputs used to build it. The brief itself is always Anthropic-authored; other models are prompted to
                    discuss that artifact honestly. Chat is saved per model on this decision.
                  </p>
                </div>
                <UnifiedBriefChat
                  runId={navRunId}
                  unifiedBrief={brief}
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
            </aside>
          </div>
        )}
      </div>
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
