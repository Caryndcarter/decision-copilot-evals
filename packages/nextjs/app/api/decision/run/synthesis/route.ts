import { NextRequest, NextResponse } from "next/server";
import { getRunsByDecisionId, replaceRun } from "@/lib/db/runs";
import { runProviderSynthesis } from "@/lenses/synthesis";
import {
  buildSynthesisInputFingerprint,
  countSynthesisInputs,
  filterEligibleForSynthesis,
  selectCanonicalRunsForSynthesis,
} from "@/lib/synthesis-inputs";
import type { ProviderSynthesis } from "@/types/decision";

/**
 * POST /api/decision/run/synthesis
 *
 * Generates (or returns cached) a cross-provider synthesis for runs sharing
 * a decision_id + posture. Uses one canonical run per provider lane (same as Unified Brief).
 * Stores the result on every eligible run for that posture.
 *
 * Body: { decision_id: string; posture: string; force?: boolean }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { decision_id?: string; posture?: string; force?: boolean };

    if (!body.decision_id?.trim()) {
      return NextResponse.json({ error: "decision_id is required" }, { status: 400 });
    }
    if (!body.posture?.trim()) {
      return NextResponse.json({ error: "posture is required" }, { status: 400 });
    }

    const allRuns = await getRunsByDecisionId(body.decision_id.trim());
    const eligible = filterEligibleForSynthesis(allRuns, body.posture!.trim());
    const { canonical, uniqueProviderCount } = selectCanonicalRunsForSynthesis(eligible);

    if (uniqueProviderCount < 2) {
      return NextResponse.json(
        {
          error:
            "At least 2 different AI providers with analysis available for this posture are needed for synthesis",
        },
        { status: 400 }
      );
    }

    const input_inventory = countSynthesisInputs(canonical, allRuns);
    const input_fingerprint = buildSynthesisInputFingerprint(canonical, allRuns);

    if (!body.force) {
      const cached = eligible.find(
        (r) => r.synthesis?.input_fingerprint === input_fingerprint
      );
      if (cached?.synthesis) {
        return NextResponse.json({ synthesis: cached.synthesis });
      }
    }

    const synthesis: ProviderSynthesis = await runProviderSynthesis(canonical, allRuns, {
      input_fingerprint,
      input_inventory,
    });

    await Promise.all(
      eligible.map((run) => replaceRun(run.run_id, { ...run, synthesis }))
    );

    return NextResponse.json({ synthesis });
  } catch (error) {
    console.error("Synthesis error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
