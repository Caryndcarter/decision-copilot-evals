import { NextRequest, NextResponse } from "next/server";
import { getRunsByDecisionId } from "@/lib/db/runs";
import { buildDemoSampleQuestions } from "@/lib/clarification-demo-request";
import type { DemoSampleQuestion } from "@/lib/clarification-demo-samples-types";
import { generateClarificationDemoSamplesWithGemini } from "@/lenses/clarification-demo-samples";
import type { DecisionIntake, DemoScenarioId, LensQuestion } from "@/types/decision";

export const maxDuration = 60;

const DEMO_SCENARIO_LABELS: Partial<Record<DemoScenarioId, string>> = {
  "slack-to-teams": "Slack → Teams migration (demo)",
  "vp-sales-underperforming": "Underperforming VP Sales (demo)",
  "vercel-to-aws": "Vercel to AWS (demo)",
  "gen-ai-product-compliance": "Gen-AI product compliance (demo)",
  "healthcare-pe-acquisition": "Healthcare PE acquisition (demo)",
  "hybrid-office-lease": "Hybrid office lease (demo)",
  "legacy-core-modernization": "Legacy core modernization (demo)",
  "hubspot-crm-fintech": "HubSpot CRM for white-label fintech (demo)",
  "meridian-civitas-saas-rollup": "Meridian / Civitas SaaS roll-up (demo)",
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

    let intake: Pick<
      DecisionIntake,
      "situation" | "constraints" | "knowns_assumptions" | "unknowns" | "posture"
    > | null = null;
    let scenarioHint: string | undefined;

    const decision_id = body.decision_id?.trim();
    if (decision_id) {
      const runs = await getRunsByDecisionId(decision_id);
      const run = runs.find((r) => r.intake?.situation) ?? runs[0];
      if (run?.intake) {
        intake = run.intake;
        if (run.demo_scenario_id) {
          scenarioHint = DEMO_SCENARIO_LABELS[run.demo_scenario_id as DemoScenarioId];
        }
      }
    }

    if (!intake && body.intake?.situation && body.intake?.constraints && body.intake?.posture) {
      intake = body.intake as DecisionIntake;
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
