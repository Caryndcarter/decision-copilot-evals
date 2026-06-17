import { NextRequest, NextResponse } from "next/server";
import { getRunsByDecisionId } from "@/lib/db/runs";
import {
  canCombineClarifications,
  getAwaitingClarificationRuns,
  listCombinedClarificationQuestions,
} from "@/lib/merge-clarification-questions";
import { dedupeClarificationQuestionsWithGemini } from "@/lenses/clarification-dedupe";
import type { ClarificationDedupeResult } from "@/lib/clarification-dedupe-types";

export const maxDuration = 60;

/**
 * POST /api/decision/run/clarification-dedupe
 * Body: { decision_id: string }
 *
 * Returns Gemini-merged unique questions plus the full per-provider list.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { decision_id?: string };
    const decision_id = body.decision_id?.trim();
    if (!decision_id) {
      return NextResponse.json({ error: "decision_id is required" }, { status: 400 });
    }

    const allRuns = await getRunsByDecisionId(decision_id);
    if (!canCombineClarifications(allRuns)) {
      return NextResponse.json(
        {
          error:
            "Combined clarification requires two or more provider runs awaiting answers for the same posture.",
        },
        { status: 400 }
      );
    }

    const awaiting = getAwaitingClarificationRuns(allRuns);
    const combined = listCombinedClarificationQuestions(awaiting);
    const result: ClarificationDedupeResult = await dedupeClarificationQuestionsWithGemini(combined);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[clarification-dedupe]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
