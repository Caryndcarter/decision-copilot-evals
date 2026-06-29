import { NextRequest, NextResponse } from "next/server";
import { getRun, getRunsByDecisionId, replaceRun } from "@/lib/db/runs";
import { runUnifiedBriefContributionsAnalysis } from "@/lenses/unified-brief-contributions";
import { canonicalRunsForUnifiedBriefDecision } from "@/lib/best-of-worlds-incomplete";
import { pickPersistRunForUnifiedBrief } from "@/lib/unified-brief-persist-run";
import { runHasAnalysisForUnifiedBrief } from "@/lib/unified-brief-eligibility";
import type { DecisionRunResult } from "@/types/decision";

export const maxDuration = 60;

/**
 * POST /api/decision/run/unified-brief-contributions
 * Body: `{ decision_id }` or `{ run_id }`.
 * Requires an existing `decision_brief_best_of_worlds`. Asks Anthropic which model's ideas made
 * the cut in that brief and persists the result on `decision_brief_best_of_worlds_contributions`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { run_id?: string; decision_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision_id = typeof body.decision_id === "string" ? body.decision_id.trim() : "";
  const run_id = typeof body.run_id === "string" ? body.run_id.trim() : "";

  if (!decision_id && !run_id) {
    return NextResponse.json({ error: "decision_id or run_id is required" }, { status: 400 });
  }

  let allRuns: DecisionRunResult[];

  if (decision_id) {
    allRuns = await getRunsByDecisionId(decision_id);
  } else {
    const seed = await getRun(run_id);
    if (!seed) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    allRuns = await getRunsByDecisionId(seed.decision_id);
  }

  const persistRun = pickPersistRunForUnifiedBrief(allRuns);
  if (!persistRun) {
    return NextResponse.json({ error: "No runs found for this decision." }, { status: 404 });
  }

  const brief = persistRun.decision_brief_best_of_worlds;
  if (!brief) {
    return NextResponse.json(
      { error: "Generate the Unified Brief first, then analyze contributions." },
      { status: 400 }
    );
  }

  const canonicalRuns = canonicalRunsForUnifiedBriefDecision(allRuns);
  const eligible = canonicalRuns.filter(runHasAnalysisForUnifiedBrief);
  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "No runs with analysis found for this decision yet." },
      { status: 400 }
    );
  }

  try {
    const decision_brief_best_of_worlds_contributions = await runUnifiedBriefContributionsAnalysis(
      persistRun,
      eligible,
      brief,
      allRuns
    );
    const updated: DecisionRunResult = {
      ...persistRun,
      decision_brief_best_of_worlds_contributions,
    };
    await replaceRun(persistRun.run_id, updated);
    return NextResponse.json({ run: updated });
  } catch (err) {
    console.error("[unified-brief-contributions]", err);
    const message = err instanceof Error ? err.message : "Contributions analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
