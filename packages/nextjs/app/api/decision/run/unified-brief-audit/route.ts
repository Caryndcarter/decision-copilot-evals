import { NextRequest, NextResponse } from "next/server";
import { getRun, getRunsByDecisionId, replaceRun } from "@/lib/db/runs";
import {
  runUnifiedBriefAudit,
  unifiedBriefAuditJudgeEnvKey,
  unifiedBriefAuditJudgeProvider,
} from "@/lenses/unified-brief-audit";
import { pickPersistRunForUnifiedBrief } from "@/lib/unified-brief-persist-run";
import {
  getUnifiedBriefForAuthor,
  isUnifiedBriefSynthesizer,
  mergeUnifiedBriefAuditIntoRun,
  unifiedBriefSynthesizerLabel,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import type { DecisionRunResult } from "@/types/decision";

export const maxDuration = 120;

/**
 * POST /api/decision/run/unified-brief-audit
 * Body: `{ decision_id }` or `{ run_id }`, optional `synthesizer`.
 * Requires the matching Unified Brief. Persists on `unified_brief_audits_by_author`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { run_id?: string; decision_id?: string; synthesizer?: string };
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

  if (!decision_id && !run_id) {
    return NextResponse.json({ error: "decision_id or run_id is required" }, { status: 400 });
  }

  const judge = unifiedBriefAuditJudgeProvider();
  const judgeKey = unifiedBriefAuditJudgeEnvKey(judge);
  if (!process.env[judgeKey]?.trim()) {
    return NextResponse.json(
      { error: `Audit judge unavailable (missing ${judgeKey} for ${judge}).` },
      { status: 503 }
    );
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

  const brief = getUnifiedBriefForAuthor(persistRun, synthesizer);
  if (!brief) {
    return NextResponse.json(
      {
        error: `Generate the Unified Brief with ${unifiedBriefSynthesizerLabel(synthesizer)} first, then run the audit.`,
      },
      { status: 400 }
    );
  }

  try {
    const audit = await runUnifiedBriefAudit(persistRun.intake, brief);
    const fresh = (await getRun(persistRun.run_id)) ?? persistRun;
    const updated = mergeUnifiedBriefAuditIntoRun(fresh, synthesizer, audit);
    await replaceRun(persistRun.run_id, updated);
    return NextResponse.json({ run: updated, synthesizer });
  } catch (err) {
    console.error("[unified-brief-audit]", err);
    const message = err instanceof Error ? err.message : "Brief audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
