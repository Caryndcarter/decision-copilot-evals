import { NextRequest, NextResponse } from "next/server";
import { getRun, getRunsByDecisionId, replaceRun } from "@/lib/db/runs";
import { runBestOfWorldsBriefSynthesis } from "@/lenses/brief";
import {
  canonicalRunsForUnifiedBriefDecision,
  listIncompleteRunsForBestOfWorlds,
} from "@/lib/best-of-worlds-incomplete";
import { pickPersistRunForUnifiedBrief } from "@/lib/unified-brief-persist-run";
import { runHasAnalysisForUnifiedBrief } from "@/lib/unified-brief-eligibility";
import {
  authorshipModeFromFlags,
  isUnifiedBriefSynthesizer,
  mergeUnifiedBriefIntoRun,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import type { DecisionRunResult } from "@/types/decision";

export const maxDuration = 60;

/**
 * POST /api/decision/run/best-of-worlds-brief
 * Body: `{ decision_id }` or `{ run_id }`, optional `synthesizer`, optional `blind` / `reassigned`.
 * Persists on `unified_briefs_by_author[author].open|blind|reassigned`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: {
    run_id?: string;
    decision_id?: string;
    synthesizer?: string;
    blind?: boolean;
    reassigned?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision_id = typeof body.decision_id === "string" ? body.decision_id.trim() : "";
  const run_id = typeof body.run_id === "string" ? body.run_id.trim() : "";
  const synthesizerRaw = typeof body.synthesizer === "string" ? body.synthesizer.trim() : "anthropic";
  const synthesizer: UnifiedBriefSynthesizer = isUnifiedBriefSynthesizer(synthesizerRaw)
    ? synthesizerRaw
    : "anthropic";
  const blind = body.blind === true;
  const reassigned = body.reassigned === true;
  const authorshipMode = authorshipModeFromFlags(blind, reassigned);

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

  const canonicalRuns = canonicalRunsForUnifiedBriefDecision(allRuns);
  const eligible = canonicalRuns.filter(runHasAnalysisForUnifiedBrief);
  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "No runs with analysis found for this decision yet." },
      { status: 400 }
    );
  }

  const incomplete_runs = listIncompleteRunsForBestOfWorlds(allRuns);

  try {
    const brief = await runBestOfWorldsBriefSynthesis(
      persistRun,
      eligible,
      allRuns,
      synthesizer,
      authorshipMode
    );
    const updated = mergeUnifiedBriefIntoRun(persistRun, synthesizer, brief, authorshipMode);
    await replaceRun(persistRun.run_id, updated);
    return NextResponse.json({
      run: updated,
      incomplete_runs,
      synthesizer,
      blind,
      reassigned,
      authorshipMode,
    });
  } catch (err) {
    console.error("[best-of-worlds-brief]", err);
    const message = err instanceof Error ? err.message : "Brief synthesis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
