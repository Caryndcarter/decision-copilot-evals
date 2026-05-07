import { NextRequest, NextResponse } from "next/server";
import { getRunsByDecisionId, replaceRun } from "@/lib/db/runs";
import { runProviderSynthesis } from "@/lenses/synthesis";
import type { ProviderSynthesis } from "@/types/decision";

/**
 * POST /api/decision/run/synthesis
 *
 * Generates (or returns cached) a cross-provider synthesis for runs sharing
 * a decision_id + posture. Includes both complete and pre-clarification (draft) runs.
 * Stores the result on every participating run.
 *
 * Body: { decision_id: string; posture: string }
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

    // Include any run that has analysis available (draft or final).
    // Exclude runs still in initial processing with no outputs yet.
    const eligible = allRuns.filter((r) => {
      if (r.intake.posture !== body.posture) return false;
      if (r.status === "awaiting_intake" || r.status === "processing_initial") return false;
      const hasOutputs =
        (r.lens_outputs?.length ?? 0) > 0 ||
        (r.lens_outputs_first_draft?.length ?? 0) > 0;
      return hasOutputs;
    });

    if (eligible.length < 2) {
      return NextResponse.json(
        { error: "At least 2 runs with analysis available for this posture are needed for synthesis" },
        { status: 400 }
      );
    }

    // Cache hit: if any run already has synthesis covering these exact run_ids, reuse it (unless force=true)
    const runIdSet = new Set(eligible.map((r) => r.run_id));
    if (!body.force) {
      const cached = eligible.find(
        (r) =>
          r.synthesis &&
          r.synthesis.run_ids.length === runIdSet.size &&
          r.synthesis.run_ids.every((id) => runIdSet.has(id))
      );
      if (cached?.synthesis) {
        return NextResponse.json({ synthesis: cached.synthesis });
      }
    }

    // Generate
    const synthesis: ProviderSynthesis = await runProviderSynthesis(eligible);

    // Store on every participating run so any of them can surface it
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
