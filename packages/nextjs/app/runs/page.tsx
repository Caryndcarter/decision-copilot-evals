import "server-only";
import { LogoLockup } from "@/app/components/logo-icon";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { clientPromise } from "@/server/config/database";
import { SessionNav } from "@/app/components/session-nav";
import { RunsClient } from "./runs-client";
import type { DecisionRunResult } from "@/types/decision";
import type { DecisionGroup } from "./runs-client";
import { decisionGroupTitleFromRuns } from "@/lib/run-display-name";

type RunWithMeta = DecisionRunResult & { createdAt?: Date | string };

function groupByDecision(runs: RunWithMeta[]): DecisionGroup[] {
  const map = new Map<string, DecisionGroup>();

  for (const run of runs) {
    const id = run.decision_id;
    if (!map.has(id)) {
      map.set(id, {
        decision_id: id,
        title: "",
        situation: "",
        latestAt: run.createdAt ? new Date(run.createdAt) : new Date(0),
        runs: [],
        hasUnifiedBrief: false,
        unifiedBriefRunId: undefined,
      });
    }
    const group = map.get(id)!;
    const runDate = run.createdAt ? new Date(run.createdAt) : new Date(0);
    if (runDate > group.latestAt) group.latestAt = runDate;
    // Track unified brief: prefer the run that already has one
    if (run.decision_brief_best_of_worlds) {
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
      is_freeform: !!run.freeform_output,
    });
  }

  for (const group of map.values()) {
    group.runs.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    const decisionRuns = runs.filter((r) => r.decision_id === group.decision_id);
    group.title = decisionGroupTitleFromRuns(decisionRuns);
    const sortedByNewest = [...decisionRuns].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    group.situation = sortedByNewest[0]?.intake?.situation ?? "";
  }

  return Array.from(map.values()).sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}

async function getUserRuns(userId: string, isAdmin: boolean): Promise<RunWithMeta[]> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "decision-copilot");
    const query = isAdmin ? {} : { user_id: userId };
    const docs = await db
      .collection("runs")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return docs as unknown as RunWithMeta[];
  } catch (err) {
    console.error("[runs page] Error fetching runs:", err);
    return [];
  }
}

export default async function RunsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/runs");
  }

  const { new: newDecisionId } = await searchParams;
  const isAdmin = (session.user as { is_admin?: boolean }).is_admin ?? false;
  const runs = await getUserRuns(session.user.id, isAdmin);
  const groups = groupByDecision(runs);

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoLockup />
          </Link>
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
            {groups.length === 0
              ? "No decisions yet"
              : `${groups.length} decision${groups.length === 1 ? "" : "s"}, ${runs.length} run${runs.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Groups */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <RunsClient initialGroups={groups} newDecisionId={newDecisionId} />
      </div>
    </main>
  );
}
