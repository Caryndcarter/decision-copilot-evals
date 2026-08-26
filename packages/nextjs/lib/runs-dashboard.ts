import "server-only";
import { unstable_cache } from "next/cache";
import type { DecisionRunResult } from "@/types/decision";
import type { DecisionGroup } from "@/app/runs/runs-client";
import { decisionGroupTitleFromRuns } from "@/lib/run-display-name";
import { inferHarnessKindFromDemoScenario } from "@/lib/harness-meta";
import { listRunsForUser } from "@/lib/db/runs";
import { coerceLatestAt } from "@/lib/decision-group-dates";

type RunWithMeta = DecisionRunResult & { createdAt?: Date | string; updatedAt?: Date | string };

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
      if (typeof run.harness_trial === "number") group.harnessTrial = run.harness_trial;
      if (typeof run.harness_run_number === "number") {
        group.harnessRunNumber = run.harness_run_number;
      }
      if (run.harness_batch_id?.trim()) group.harnessBatchId = run.harness_batch_id.trim();
      if (run.harness_kind) group.harnessKind = run.harness_kind;
      if (run.demo_scenario_id?.trim()) group.demoScenarioId = run.demo_scenario_id.trim();
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
    if (run.decision_brief_best_of_worlds) {
      group.hasUnifiedBrief = true;
      group.unifiedBriefRunId = run.run_id;
    } else if (!group.unifiedBriefRunId) {
      group.unifiedBriefRunId = run.run_id;
    }
    group.runs.push({
      run_id: run.run_id,
      status: run.status,
      llm_provider: run.llm_provider,
      intake: run.intake ? { posture: run.intake.posture } : undefined,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      is_freeform: false,
    });
  }

  for (const group of map.values()) {
    if (group.isHarness && !group.harnessKind && group.demoScenarioId) {
      group.harnessKind = inferHarnessKindFromDemoScenario(group.demoScenarioId);
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

async function fetchDashboardDecisionGroups(
  userId: string,
  isAdmin: boolean
): Promise<{ groups: DecisionGroup[]; runCount: number }> {
  const runs = (await listRunsForUser(userId, {
    asAdmin: isAdmin,
    limit: 500,
    dashboard: true,
  })) as RunWithMeta[];
  return { groups: groupByDecision(runs), runCount: runs.length };
}

/** Cached dashboard list — 45s TTL avoids hammering Atlas on every navigation. */
function rehydrateGroupDates(groups: DecisionGroup[]): DecisionGroup[] {
  return groups.map((g) => ({ ...g, latestAt: coerceLatestAt(g.latestAt) }));
}

export async function getDashboardDecisionGroups(
  userId: string,
  isAdmin: boolean
): Promise<{ groups: DecisionGroup[]; runCount: number }> {
  const cached = await unstable_cache(
    () => fetchDashboardDecisionGroups(userId, isAdmin),
    ["runs-dashboard", userId, isAdmin ? "admin" : "user"],
    { revalidate: 45, tags: [`runs-dashboard-${userId}`] }
  )();
  return { ...cached, groups: rehydrateGroupDates(cached.groups) };
}
