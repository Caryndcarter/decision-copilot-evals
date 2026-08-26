import { RunsClient } from "./runs-client";
import {
  harnessBatchKey,
  parseHarnessStudyTab,
  parseRunsTab,
  type RunsStudyTab,
} from "@/lib/harness-meta";
import { getDashboardDecisionGroups } from "@/lib/runs-dashboard";

export async function RunsList({
  userId,
  isAdmin,
  newDecisionId,
  tab,
  studyParam,
}: {
  userId: string;
  isAdmin: boolean;
  newDecisionId?: string;
  tab?: string;
  studyParam?: string;
}) {
  const initialHarnessStudy = parseHarnessStudyTab(studyParam);
  const { groups, runCount } = await getDashboardDecisionGroups(userId, isAdmin);

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
    <>
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
                }, ${runCount} run${runCount === 1 ? "" : "s"} across your think tank`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <RunsClient
          initialGroups={orderedGroups}
          newDecisionId={newDecisionId}
          initialTab={initialTab}
          initialHarnessStudy={initialHarnessStudy}
        />
      </div>
    </>
  );
}
