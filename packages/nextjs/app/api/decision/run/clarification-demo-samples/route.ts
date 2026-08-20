import { NextRequest, NextResponse } from "next/server";
import { getRunsByDecisionId } from "@/lib/db/runs";
import { buildDemoSampleQuestions } from "@/lib/clarification-demo-request";
import type { DemoSampleQuestion } from "@/lib/clarification-demo-samples-types";
import { generateClarificationDemoSamplesWithGemini } from "@/lenses/clarification-demo-samples";
import type { DecisionIntake, DemoScenarioId, LensQuestion } from "@/types/decision";

export const maxDuration = 60;

const DEMO_SCENARIO_LABELS: Partial<Record<DemoScenarioId, string>> = {
  "healthcare-pe-acquisition": "Healthcare PE acquisition (demo)",
  "meridian-civitas-saas-rollup": "Meridian / Civitas SaaS roll-up (demo)",
  "meridian-ic-lp-voice-neutral": "Meridian IC · LP voice, neutral (demo)",
  "meridian-ic-neutral-vocab-confident":
    "Meridian IC · neutral vocab, confident (demo)",
  "meridian-ic-dire-inflated": "Meridian IC · inflated urgency (demo)",
  "meridian-ic-false-harm-protected": "Meridian IC · optimistic fast-path (demo)",
  "meridian-ic-honest-aggressive": "Meridian IC · honest aggressive (demo)",
};

/**
 * POST /api/decision/run/clarification-demo-samples
 * Body: { decision_id?: string, intake?: partial DecisionIntake, questions?: DemoSampleQuestion[] }
 *   OR { decision_id, questions as LensQuestion-shaped with standard fields }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      decision_id?: string;
      intake?: Partial<DecisionIntake>;
      questions?: DemoSampleQuestion[];
      lens_questions?: LensQuestion[];
    };

    let intake: (Pick<
      DecisionIntake,
      "situation" | "constraints" | "knowns_assumptions" | "unknowns" | "posture"
    > & { leaning_direction?: string }) | null = null;
    let scenarioHint: string | undefined;

    const decision_id = body.decision_id?.trim();
    if (decision_id) {
      const runs = await getRunsByDecisionId(decision_id);
      const run = runs.find((r) => r.intake?.situation) ?? runs[0];
      if (run?.intake) {
        intake = {
          situation: run.intake.situation,
          constraints: run.intake.constraints,
          knowns_assumptions: run.intake.knowns_assumptions,
          unknowns: run.intake.unknowns,
          posture: run.intake.posture,
          ...("leaning_direction" in run.intake && run.intake.leaning_direction
            ? { leaning_direction: run.intake.leaning_direction }
            : {}),
        };
        if (run.demo_scenario_id) {
          scenarioHint = DEMO_SCENARIO_LABELS[run.demo_scenario_id as DemoScenarioId];
        }
      }
    }

    if (!intake && body.intake?.situation && body.intake?.constraints && body.intake?.posture) {
      const bodyIntake = body.intake;
      intake = {
        situation: bodyIntake.situation!,
        constraints: bodyIntake.constraints!,
        knowns_assumptions: bodyIntake.knowns_assumptions,
        unknowns: bodyIntake.unknowns,
        posture: bodyIntake.posture!,
        ...("leaning_direction" in bodyIntake && typeof bodyIntake.leaning_direction === "string"
          ? { leaning_direction: bodyIntake.leaning_direction }
          : {}),
      };
    }

    if (!intake) {
      return NextResponse.json(
        { error: "decision_id with intake, or intake in body, is required" },
        { status: 400 }
      );
    }

    const questions =
      body.questions ??
      (body.lens_questions?.length ? buildDemoSampleQuestions(body.lens_questions) : []);

    if (questions.length === 0) {
      return NextResponse.json({ error: "questions is required" }, { status: 400 });
    }

    const result = await generateClarificationDemoSamplesWithGemini(intake, questions, scenarioHint);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[clarification-demo-samples]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
