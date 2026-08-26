import "server-only";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { listRunsForUser } from "@/lib/db/runs";
import { SessionNav } from "@/app/components/session-nav";
import { RunsClient } from "./runs-client";
import type { DecisionRunResult } from "@/types/decision";
import type { DecisionGroup } from "./runs-client";
import { decisionGroupTitleFromRuns } from "@/lib/run-display-name";
import { harnessBatchKey, inferHarnessKindFromDemoScenario, parseHarnessStudyTab, parseRunsTab, type RunsStudyTab } from "@/lib/harness-meta";
import { runHasAnyUnifiedBrief } from "@/lib/unified-briefs";

// Per-user dashboard: always render fresh so newly created sibling runs (e.g. a
// just-added provider) show up immediately rather than from a stale cache.
export const dynamic = "force-dynamic";

type RunWithMeta = DecisionRunResult & { createdAt?: Date | string; updatedAt?: Date | string };

/** Latest activity for ordering (matches GSI sort on `updatedAt`). */
function activityDate(run: RunWithMeta): Date {
  const c = run.createdAt ? new Date(run.createdAt as string | Date).getTime() : 0;
  const u = run.updatedAt ? new Date(run.updatedAt as string | Date).getTime() : 0;
  const ms = Math.max(c, u);
  return ms > 0 ? new Date(ms) : new Date(0);
}

function groupByDecision(runs: RunWithMeta[]): DecisionGroup[] {
  const map = new Map<string, DecisionGroup>();

  for (const run of runs) {
    const id = run.decision_id;
    if (!map.has(id)) {
      map.set(id, {
        decision_id: id,
        title: "",
        situation: "",
        latestAt: activityDate(run),
        runs: [],
        hasUnifiedBrief: false,
        unifiedBriefRunId: undefined,
        isHarness: false,
        harnessTrial: undefined,
        harnessRunNumber: undefined,
        harnessBatchId: undefined,
        harnessKind: undefined,
        demoScenarioId: undefined,
        providerModels: undefined,
      });
    }
    const group = map.get(id)!;
    const runDate = activityDate(run);
    if (runDate > group.latestAt) group.latestAt = runDate;
    if (run.harness_run) {
      group.isHarness = true;
      if (typeof run.harness_trial === "number") {
        group.harnessTrial = run.harness_trial;
      }
      if (typeof run.harness_run_number === "number") {
        group.harnessRunNumber = run.harness_run_number;
      }
      if (run.harness_batch_id?.trim()) {
        group.harnessBatchId = run.harness_batch_id.trim();
      }
      if (run.harness_kind) {
        group.harnessKind = run.harness_kind;
      }
      if (run.demo_scenario_id?.trim()) {
        group.demoScenarioId = run.demo_scenario_id.trim();
      }
      if (run.llm_provider && run.llm_model?.trim()) {
        const provider = run.llm_provider;
        const model = run.llm_model.trim();
        const prev = group.providerModels?.[provider] ?? [];
        if (!prev.includes(model)) {
          group.providerModels = {
            ...group.providerModels,
            [provider]: [...prev, model],
          };
        }
      }
    }
    // Track unified brief: prefer the run that already has one
    if (runHasAnyUnifiedBrief(run)) {
      group.hasUnifiedBrief = true;
      group.unifiedBriefRunId = run.run_id;
    } else if (!group.unifiedBriefRunId) {
      // Fall back to most recent run as anchor for generation
      group.unifiedBriefRunId = run.run_id;
    }
    group.runs.push({
      run_id: run.run_id,
      status: run.status,
      llm_provider: run.llm_provider,
      intake: run.intake ? { posture: run.intake.posture } : undefined,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      is_freeform: !!run.freeform_output,
    });
  }

  for (const group of map.values()) {
    if (group.isHarness) {
      if (!group.harnessKind && group.demoScenarioId) {
        group.harnessKind = inferHarnessKindFromDemoScenario(group.demoScenarioId);
      }
    }
  }

  for (const group of map.values()) {
    group.runs.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const ua = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const ub = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return Math.max(db, ub) - Math.max(da, ua);
    });
    const decisionRuns = runs.filter((r) => r.decision_id === group.decision_id);
    group.title = decisionGroupTitleFromRuns(decisionRuns);
    const sortedByNewest = [...decisionRuns].sort(
      (a, b) => activityDate(b).getTime() - activityDate(a).getTime()
    );
    group.situation = sortedByNewest[0]?.intake?.situation ?? "";
  }

  return Array.from(map.values());
}

async function getUserRuns(userId: string, isAdmin: boolean): Promise<RunWithMeta[]> {
  try {
    // One lightweight query. The old N× getRunsByDecisionId fan-out pulled full documents
    // (variants, research, lens_outputs) and timed out Mongo with ~144 harness runs.
    return (await listRunsForUser(userId, {
      asAdmin: isAdmin,
      limit: 500,
      dashboard: true,
    })) as RunWithMeta[];
  } catch (err) {
    console.error("[runs page] Error fetching runs:", err);
    return [];
  }
}

export default async function RunsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; tab?: string; study?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/runs");
  }

  const { new: newDecisionId, tab, study: studyParam } = await searchParams;
  const initialHarnessStudy = parseHarnessStudyTab(studyParam);
  const isAdmin = (session.user as { is_admin?: boolean }).is_admin ?? false;
  const runs = await getUserRuns(session.user.id, isAdmin);
  const groups = groupByDecision(runs);
  const decisionGroups = groups
    .filter((g) => !g.isHarness)
    .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
  const harnessGroups = groups
    .filter((g) => g.isHarness)
    .sort((a, b) => {
      const rn = (b.harnessRunNumber ?? 0) - (a.harnessRunNumber ?? 0);
      if (rn !== 0) return rn;
      const t = (a.harnessTrial ?? 0) - (b.harnessTrial ?? 0);
      if (t !== 0) return t;
      return b.latestAt.getTime() - a.latestAt.getTime();
    });
  const harnessBatchCount = new Set(
    harnessGroups.map((g) =>
      harnessBatchKey({
        harnessBatchId: g.harnessBatchId,
        harnessRunNumber: g.harnessRunNumber,
        harnessKind: g.harnessKind,
        decisionId: g.decision_id,
      })
    )
  ).size;
  // Stable list order for the client: decisions by recency, then harness by run/trial.
  const orderedGroups = [...decisionGroups, ...harnessGroups];
  const newGroup = newDecisionId
    ? orderedGroups.find((g) => g.decision_id === newDecisionId)
    : undefined;
  const initialTab: RunsStudyTab =
    newGroup?.isHarness
      ? "studies"
      : decisionGroups.length === 0 && harnessGroups.length > 0
        ? "studies"
        : parseRunsTab(tab);

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <AppNavBrand />
          <div className="flex items-center gap-3">
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

      {/* Page header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">My Decisions</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {orderedGroups.length === 0
              ? "No decisions yet — brief your think tank to get started"
              : `${decisionGroups.length} decision${decisionGroups.length === 1 ? "" : "s"}${
                  harnessGroups.length > 0
                    ? ` · ${harnessBatchCount} study batch${harnessBatchCount === 1 ? "" : "es"} (${harnessGroups.length} case${harnessGroups.length === 1 ? "" : "s"})`
                    : ""
                }, ${runs.length} run${runs.length === 1 ? "" : "s"} across your think tank`}
          </p>
        </div>
      </div>

      {/* Groups */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <RunsClient
          initialGroups={orderedGroups}
          newDecisionId={newDecisionId}
          initialTab={initialTab}
          initialHarnessStudy={initialHarnessStudy}
        />
      </div>
    </main>
  );
}
