"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  harnessBatchKey,
  harnessBatchPurpose,
  harnessBatchTitle,
  harnessCanonicalCaseIndex,
  harnessCaseLabel,
  harnessCaseNote,
  HARNESS_STUDY_TABS,
  harnessStudyTabForKind,
  resolveHarnessBatchKind,
  shortHarnessBatchId,
  type HarnessStudyTab,
  type RunsStudyTab,
} from "@/lib/harness-meta";
import {
  formatHarnessBatchModelsDescription,
  resolveHarnessBatchModels,
} from "@/lib/harness-provider-models";
import type { HarnessKind, LLMProviderName } from "@/types/decision";

interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

function ConfirmModal({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-xl p-6">
        <h2 className="text-base font-semibold text-zinc-900">{state.title}</h2>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{state.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={state.onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const POSTURE_LABELS: Record<string, string> = {
  explore: "Explore",
  pressure_test: "Pressure test",
  surface_risks: "Surface risks",
  generate_alternatives: "Generate alternatives",
  show_opposition: "Show opposition",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  xai: "xAI",
};

function PostureBadge({ posture }: { posture: string }) {
  const colors: Record<string, string> = {
    explore: "bg-blue-50 text-blue-700",
    pressure_test: "bg-amber-50 text-amber-700",
    surface_risks: "bg-red-50 text-red-700",
    generate_alternatives: "bg-violet-50 text-violet-700",
    show_opposition: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[posture] ?? "bg-zinc-100 text-zinc-600"}`}>
      {POSTURE_LABELS[posture] ?? posture}
    </span>
  );
}

function FreeformBadge() {
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700">
      Free-form
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    openai: "bg-emerald-50 text-emerald-700",
    anthropic: "bg-orange-50 text-orange-700",
    gemini: "bg-blue-50 text-blue-700",
    xai: "bg-zinc-100 text-zinc-800",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[provider] ?? "bg-zinc-100 text-zinc-600"}`}>
      {PROVIDER_LABELS[provider] ?? provider}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    complete: { label: "Complete", cls: "bg-emerald-50 text-emerald-700" },
    pending_brief: { label: "Pending brief", cls: "bg-amber-50 text-amber-700" },
    awaiting_clarification: { label: "Awaiting answers", cls: "bg-amber-50 text-amber-700" },
    processing_clarification: { label: "Processing", cls: "bg-indigo-50 text-indigo-700" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

export interface RunRow {
  run_id: string;
  status: string;
  llm_provider?: string;
  intake?: { posture?: string };
  createdAt?: Date | string;
  updatedAt?: Date | string;
  is_freeform?: boolean;
}

export interface DecisionGroup {
  decision_id: string;
  title: string;
  situation: string;
  latestAt: Date;
  runs: RunRow[];
  hasUnifiedBrief: boolean;
  unifiedBriefRunId?: string;
  /** Structured AI-behavior study runs — shown on the Studies tab. */
  isHarness?: boolean;
  harnessTrial?: number;
  /** Batch id for one harness script invocation (groups Trials 1–N). */
  harnessRunNumber?: number;
  /** Stable UUID for the harness invocation. */
  harnessBatchId?: string;
  /** Which harness CLI produced these runs. */
  harnessKind?: HarnessKind;
  /** Voice/frame or demo scenario id when stored on harness runs. */
  demoScenarioId?: string;
  /** Distinct llm_model ids seen on provider runs in this decision (harness). */
  providerModels?: Partial<Record<LLMProviderName, string[]>>;
}

type RunsTab = RunsStudyTab;

type HarnessBatchSection = {
  batchKey: string;
  batchId: string;
  kind?: HarnessKind;
  runNumber?: number;
  latestAt: Date;
  trials: DecisionGroup[];
};

function groupHarnessByBatch(groups: DecisionGroup[]): HarnessBatchSection[] {
  const map = new Map<string, HarnessBatchSection>();
  for (const group of groups) {
    const batchKey = harnessBatchKey({
      harnessBatchId: group.harnessBatchId,
      harnessRunNumber: group.harnessRunNumber,
      harnessKind: group.harnessKind,
      decisionId: group.decision_id,
    });
    let section = map.get(batchKey);
    if (!section) {
      section = {
        batchKey,
        batchId: group.harnessBatchId?.trim() || batchKey,
        kind: group.harnessKind,
        runNumber: group.harnessRunNumber,
        latestAt: group.latestAt,
        trials: [],
      };
      map.set(batchKey, section);
    }
    if (group.latestAt > section.latestAt) section.latestAt = group.latestAt;
    if (group.harnessKind) section.kind = group.harnessKind;
    if (typeof group.harnessRunNumber === "number") {
      section.runNumber = group.harnessRunNumber;
    }
    if (group.harnessBatchId?.trim()) section.batchId = group.harnessBatchId.trim();
    section.trials.push(group);
  }
  for (const section of map.values()) {
    if (!section.kind) {
      for (const trial of section.trials) {
        const kind = resolveHarnessBatchKind({
          kind: trial.harnessKind,
          demoScenarioId: trial.demoScenarioId,
        });
        if (kind) {
          section.kind = kind;
          break;
        }
      }
    }
    section.trials.sort((a, b) => {
      const aIdx =
        harnessCanonicalCaseIndex(a.demoScenarioId) ?? a.harnessTrial ?? Number.MAX_SAFE_INTEGER;
      const bIdx =
        harnessCanonicalCaseIndex(b.demoScenarioId) ?? b.harnessTrial ?? Number.MAX_SAFE_INTEGER;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return b.latestAt.getTime() - a.latestAt.getTime();
    });
  }
  return [...map.values()].sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function harnessBatchStudy(batch: HarnessBatchSection): HarnessStudyTab | "other" {
  const kind =
    batch.kind ??
    resolveHarnessBatchKind({
      demoScenarioId: batch.trials[0]?.demoScenarioId,
    });
  return harnessStudyTabForKind(kind);
}

function groupHarnessBatchesByStudy(
  batches: HarnessBatchSection[]
): Map<HarnessStudyTab | "other", HarnessBatchSection[]> {
  const map = new Map<HarnessStudyTab | "other", HarnessBatchSection[]>();
  for (const batch of batches) {
    const study = harnessBatchStudy(batch);
    const list = map.get(study) ?? [];
    list.push(batch);
    map.set(study, list);
  }
  return map;
}

async function deleteRun(run_id: string): Promise<boolean> {
  const res = await fetch("/api/decision/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "delete_run", run_id }),
  });
  return res.ok;
}

export function RunsClient({
  initialGroups,
  newDecisionId,
  initialTab = "decisions",
  initialHarnessStudy,
}: {
  initialGroups: DecisionGroup[];
  newDecisionId?: string;
  initialTab?: RunsTab;
  initialHarnessStudy?: HarnessStudyTab;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [tab, setTab] = useState<RunsTab>(initialTab);
  const [pending, startTransition] = useTransition();
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [deletingDecisionId, setDeletingDecisionId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // Keep local optimistic state aligned with server refreshes (pagination / new runs).
  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const decisionGroups = groups.filter((g) => !g.isHarness);
  const harnessGroups = groups.filter((g) => g.isHarness);
  const harnessBatches = useMemo(() => groupHarnessByBatch(harnessGroups), [harnessGroups]);
  const harnessBatchesByStudy = useMemo(
    () => groupHarnessBatchesByStudy(harnessBatches),
    [harnessBatches]
  );
  const visibleHarnessStudies = useMemo(
    () =>
      HARNESS_STUDY_TABS.filter(
        (t) => (harnessBatchesByStudy.get(t.id)?.length ?? 0) > 0
      ),
    [harnessBatchesByStudy]
  );
  const effectiveHarnessStudy = useMemo((): HarnessStudyTab | undefined => {
    if (visibleHarnessStudies.length === 0) return undefined;
    if (
      initialHarnessStudy &&
      visibleHarnessStudies.some((t) => t.id === initialHarnessStudy)
    ) {
      return initialHarnessStudy;
    }
    return visibleHarnessStudies[0]!.id;
  }, [initialHarnessStudy, visibleHarnessStudies]);
  const activeHarnessBatches = useMemo(() => {
    if (!effectiveHarnessStudy) return [];
    return harnessBatchesByStudy.get(effectiveHarnessStudy) ?? [];
  }, [effectiveHarnessStudy, harnessBatchesByStudy]);
  const activeStudyMeta = HARNESS_STUDY_TABS.find((t) => t.id === effectiveHarnessStudy);
  const showTabs = true;

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!newDecisionId) return;
    const batch = harnessBatches.find((b) =>
      b.trials.some((t) => t.decision_id === newDecisionId)
    );
    if (!batch) return;
    setExpandedBatches((prev) => {
      if (prev.has(batch.batchKey)) return prev;
      const next = new Set(prev);
      next.add(batch.batchKey);
      return next;
    });
  }, [newDecisionId, harnessBatches]);

  function toggleBatch(batchKey: string) {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchKey)) next.delete(batchKey);
      else next.add(batchKey);
      return next;
    });
  }

  function selectTab(next: RunsTab) {
    setTab(next);
    const url =
      next === "studies" && effectiveHarnessStudy
        ? `/runs?tab=studies&study=${effectiveHarnessStudy}`
        : next === "studies"
          ? "/runs?tab=studies"
          : "/runs";
    router.replace(url, { scroll: false });
  }

  function selectHarnessStudy(study: HarnessStudyTab) {
    setTab("studies");
    router.replace(`/runs?tab=studies&study=${study}`, { scroll: false });
  }

  function removeRun(run_id: string) {
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, runs: g.runs.filter((r) => r.run_id !== run_id) }))
        .filter((g) => g.runs.length > 0)
    );
  }

  function removeDecision(decision_id: string) {
    setGroups((prev) => prev.filter((g) => g.decision_id !== decision_id));
  }

  function handleDeleteRun(run_id: string) {
    setConfirm({
      title: "Delete run?",
      message: "This analysis will be permanently deleted and cannot be recovered.",
      onConfirm: async () => {
        setConfirm(null);
        setDeletingRunId(run_id);
        try {
          const ok = await deleteRun(run_id);
          if (ok) {
            removeRun(run_id);
            startTransition(() => router.refresh());
          }
        } finally {
          setDeletingRunId(null);
        }
      },
    });
  }

  function handleDeleteDecision(group: DecisionGroup) {
    const runCount = group.runs.length;
    const label = group.title || group.situation.slice(0, 60) || "this decision";
    setConfirm({
      title: "Delete decision?",
      message: `"${label}" and ${runCount === 1 ? "its 1 run" : `all ${runCount} runs`} will be permanently deleted and cannot be recovered.`,
      onConfirm: async () => {
        setConfirm(null);
        setDeletingDecisionId(group.decision_id);
        try {
          await Promise.all(group.runs.map((r) => deleteRun(r.run_id)));
          removeDecision(group.decision_id);
          startTransition(() => router.refresh());
        } finally {
          setDeletingDecisionId(null);
        }
      },
    });
  }

  function renderDecisionGroup(group: DecisionGroup, opts: { nestedInBatch?: boolean } = {}) {
    const isNew = newDecisionId === group.decision_id;
    const headline = group.title || group.situation.slice(0, 80) || "Untitled decision";
    const snippet =
      group.title && group.situation
        ? group.situation.slice(0, 140) + (group.situation.length > 140 ? "…" : "")
        : null;
    const groupDate =
      group.latestAt && new Date(group.latestAt).getTime() > 0
        ? new Date(group.latestAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
    const isDeletingDecision = deletingDecisionId === group.decision_id;
    const awaitingClarificationCount = group.runs.filter(
      (r) => r.status === "awaiting_clarification"
    ).length;
    const showCombinedClarification = awaitingClarificationCount >= 2;

    const caseLabel = group.isHarness
      ? harnessCaseLabel({
          kind: group.harnessKind,
          demoScenarioId: group.demoScenarioId,
          trial: group.harnessTrial,
        })
      : null;
    const caseNote = group.isHarness
      ? harnessCaseNote({
          kind: group.harnessKind,
          demoScenarioId: group.demoScenarioId,
          trial: group.harnessTrial,
        })
      : undefined;

    return (
      <div
        key={group.decision_id}
        className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-opacity ${isDeletingDecision ? "opacity-50" : ""} ${isNew ? "border-indigo-400 ring-2 ring-indigo-200" : "border-zinc-200"}`}
      >
        <div
          className={`px-5 pt-4 pb-4 border-b ${isNew ? "border-indigo-100 bg-indigo-50/40" : "border-zinc-100"}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {isNew && (
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white shrink-0">
                    New
                  </span>
                )}
                {group.isHarness && caseLabel && (
                  <span
                    className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-semibold text-white shrink-0 max-w-[min(100%,28rem)] truncate"
                    title={caseLabel}
                  >
                    {caseLabel}
                  </span>
                )}
                <p className="text-sm font-semibold text-zinc-900 leading-snug">{headline}</p>
              </div>
              {snippet && (
                <p className="mt-1 text-xs text-zinc-500 leading-relaxed line-clamp-2">{snippet}</p>
              )}
              {caseNote && (
                <p className="mt-1 text-xs text-zinc-500 leading-relaxed line-clamp-2">{caseNote}</p>
              )}
              {opts.nestedInBatch && (
                <p className="mt-1 font-mono text-[10px] text-zinc-400 truncate" title={group.decision_id}>
                  {group.decision_id}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {groupDate && <time className="text-xs text-zinc-400">{groupDate}</time>}
              <button
                onClick={() => handleDeleteDecision(group)}
                disabled={isDeletingDecision || pending}
                title="Delete decision"
                className="rounded p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>

        {showCombinedClarification && (
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/80 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">
              {awaitingClarificationCount} provider runs are waiting for follow-up answers. You can answer
              on each run below, or answer every provider&apos;s questions on one screen.
            </p>
            <Link
              href={`/run/clarify-all?decision_id=${encodeURIComponent(group.decision_id)}`}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors text-center"
            >
              Answer unique questions together
            </Link>
          </div>
        )}

        <div className="divide-y divide-zinc-100">
          {group.runs.map((run) => {
            const runDate = run.createdAt
              ? new Date(run.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : null;
            const isDeletingRun = deletingRunId === run.run_id;

            return (
              <div
                key={run.run_id}
                className={`flex items-center justify-between gap-3 px-5 py-3 group transition-opacity ${isDeletingRun ? "opacity-50" : ""}`}
              >
                <Link
                  href={
                    run.is_freeform ? `/run/freeform?run_id=${run.run_id}` : `/run/chat?run_id=${run.run_id}`
                  }
                  className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1"
                >
                  {run.is_freeform && <FreeformBadge />}
                  {run.intake?.posture && <PostureBadge posture={run.intake.posture} />}
                  {run.llm_provider && <ProviderBadge provider={run.llm_provider} />}
                  <StatusBadge status={run.status} />
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  {runDate && <time className="text-xs text-zinc-400">{runDate}</time>}
                  <button
                    onClick={() => handleDeleteRun(run.run_id)}
                    disabled={isDeletingRun || pending}
                    title="Delete run"
                    className="rounded p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {(group.runs.length > 1 || group.hasUnifiedBrief) && (
          <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-400 shrink-0"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-xs text-zinc-500">
                {group.hasUnifiedBrief ? "Unified Brief available" : "Combine all runs into one brief"}
              </span>
            </div>
            <Link
              href={`/run/best-of-worlds?decision_id=${encodeURIComponent(group.decision_id)}`}
              className={`text-xs font-semibold transition-colors ${group.hasUnifiedBrief ? "text-indigo-600 hover:text-indigo-500" : "text-zinc-500 hover:text-indigo-600"}`}
            >
              {group.hasUnifiedBrief ? "View Unified Brief →" : "Generate Unified Brief →"}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    {confirm && <ConfirmModal state={confirm} onCancel={() => setConfirm(null)} />}

    {showTabs && (
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-px">
        <button
          type="button"
          onClick={() => selectTab("decisions")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "decisions"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Decisions
          <span className="ml-1.5 tabular-nums text-zinc-400">{decisionGroups.length}</span>
        </button>
        <button
          type="button"
          onClick={() => selectTab("studies")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "studies"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Studies
          <span className="ml-1.5 tabular-nums text-zinc-400">
            {harnessBatches.length > 0
              ? `${harnessBatches.length} batch${harnessBatches.length === 1 ? "" : "es"}`
              : harnessGroups.length}
          </span>
        </button>
      </div>
    )}

    {tab === "studies" && harnessGroups.length > 0 && visibleHarnessStudies.length > 0 && (
      <>
        <div
          className="mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-px"
          role="tablist"
          aria-label="Study type"
        >
          {visibleHarnessStudies.map((study) => {
            const count = harnessBatchesByStudy.get(study.id)?.length ?? 0;
            const active = effectiveHarnessStudy === study.id;
            return (
              <button
                key={study.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectHarnessStudy(study.id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {study.label}
                <span className="ml-1.5 tabular-nums text-zinc-400">{count}</span>
              </button>
            );
          })}
        </div>
        {activeStudyMeta && (
          <p className="mb-4 text-sm text-zinc-500">
            {activeStudyMeta.blurb}{" "}
            {activeStudyMeta.findingsStudy ? (
              <>
                <Link
                  href={`/harness/findings?study=${activeStudyMeta.findingsStudy}`}
                  className="font-medium text-indigo-700 hover:text-indigo-900"
                >
                  View findings
                </Link>
                .
              </>
            ) : null}
          </p>
        )}
      </>
    )}

    {tab === "studies" && harnessGroups.length > 0 && visibleHarnessStudies.length === 0 && (
      <p className="mb-4 text-sm text-zinc-500">
        Study runs are present but could not be grouped by test type (missing metadata).
      </p>
    )}

    {tab === "studies" && harnessGroups.length === 0 ? (
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/harness/findings" className="font-medium text-indigo-700 hover:text-indigo-900">
          Study findings
        </Link>{" "}
        — authorship influence (live) and voice influence · Meridian IC (committed snapshots).
      </p>
    ) : null}

    {(tab === "studies" ? harnessGroups.length === 0 : decisionGroups.length === 0) ? (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        {tab === "studies" ? (
          <>
            <p className="text-zinc-500 text-sm">No study trials yet.</p>
            <p className="mt-2 text-xs text-zinc-400">
              Run <code className="rounded bg-zinc-100 px-1 py-0.5">npm run harness:demos:authorship</code> with{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">HARNESS_USER_EMAIL</code> set to your
              account.
            </p>
          </>
        ) : (
          <>
            <p className="text-zinc-500 text-sm">No decisions yet.</p>
            <Link
              href="/intake"
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Start your first →
            </Link>
          </>
        )}
      </div>
    ) : tab === "studies" ? (
      <div className="space-y-5">
        {activeHarnessBatches.map((batch) => {
          const isOpen = expandedBatches.has(batch.batchKey);
          const batchDate =
            batch.latestAt.getTime() > 0
              ? batch.latestAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : null;
          const runCount = batch.trials.reduce((n, t) => n + t.runs.length, 0);
          const shortId = shortHarnessBatchId(batch.batchId);
          const showFullId = batch.batchId.includes("-") && batch.batchId.length >= 32;
          const modelLines = formatHarnessBatchModelsDescription(
            resolveHarnessBatchModels({
              batchId: batch.batchId,
              harnessKind: batch.kind,
              trialModels: batch.trials.map((t) => t.providerModels),
            })
          );

          return (
            <section
              key={batch.batchKey}
              className="rounded-xl border border-zinc-300 bg-zinc-100/70 shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleBatch(batch.batchKey)}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-zinc-100 transition-colors"
              >
                <ChevronIcon open={isOpen} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">
                      {harnessBatchTitle({ kind: batch.kind, runNumber: batch.runNumber })}
                    </h2>
                    {shortId && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-100">
                        {shortId}
                      </span>
                    )}
                  </div>
                  {showFullId && (
                    <p
                      className="mt-1 font-mono text-[10px] text-zinc-500 truncate"
                      title={batch.batchId}
                    >
                      {batch.batchId}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                    {harnessBatchPurpose(batch.kind)}
                  </p>
                  {modelLines.map((line) => (
                    <p key={line} className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                      {line}
                    </p>
                  ))}
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {batch.trials.length} case{batch.trials.length === 1 ? "" : "s"} · {runCount} provider
                    run{runCount === 1 ? "" : "s"}
                    {batchDate ? ` · ${batchDate}` : ""}
                  </p>
                </div>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-zinc-200 bg-zinc-50/80 px-3 py-3">
                  {batch.trials.map((group) => renderDecisionGroup(group, { nestedInBatch: true }))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    ) : (
      <div className="space-y-4">{decisionGroups.map((group) => renderDecisionGroup(group))}</div>
    )}
    </>
  );
}
