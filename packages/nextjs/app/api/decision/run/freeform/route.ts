import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import {
  parseDemoScenarioId,
  type DecisionIntake,
  type DecisionRunResult,
  type DemoScenarioId,
  type LLMProviderName,
} from "@/types/decision";
import { runFreeformCardTitle } from "@/lenses/decision-title";
import { runFreeformAnalysis } from "@/lenses/freeform";
import { insertRun } from "@/lib/db/runs";
import { parseIntakeLlmSelection } from "@/lib/intake-llm-selection";
import { runForProviders } from "@/lib/run-for-providers";

/** All four providers run in parallel; wall time ≈ slowest single call, not sum. */
export const maxDuration = 180;

function isValidPosture(p: string): p is DecisionIntake["posture"] {
  return ["explore", "pressure_test", "surface_risks", "generate_alternatives"].includes(p);
}

function buildFreeformRunRecord(params: {
  intake: DecisionIntake;
  user_id: string;
  provider: LLMProviderName;
  freeform: Awaited<ReturnType<typeof runFreeformAnalysis>>;
  demo_scenario_id?: DemoScenarioId;
  decision_title?: string;
}): DecisionRunResult {
  const { intake, user_id, provider, freeform, demo_scenario_id, decision_title } = params;
  return {
    decision_id: intake.decision_id,
    run_id: randomUUID(),
    status: "complete",
    intake,
    clarification_questions: [],
    clarification_needed: false,
    clarifications: [],
    lens_outputs: [],
    llm_provider: provider,
    freeform_output: freeform.output,
    freeform_model: freeform.model,
    freeform_generated_at: freeform.generated_at,
    user_id,
    ...(demo_scenario_id ? { demo_scenario_id } : {}),
    ...(decision_title ? { decision_title } : {}),
  };
}

async function persistFreeformRun(
  intake: DecisionIntake,
  user_id: string,
  provider: LLMProviderName,
  freeformResult: Awaited<ReturnType<typeof runFreeformAnalysis>>,
  demo_scenario_id: DemoScenarioId | undefined
): Promise<DecisionRunResult> {
  let decision_title: string | undefined;
  try {
    decision_title = await runFreeformCardTitle(intake, freeformResult.output, provider);
  } catch (e) {
    console.warn("[freeform] card title failed", e);
  }
  const run = buildFreeformRunRecord({
    intake,
    user_id,
    provider,
    freeform: freeformResult,
    demo_scenario_id,
    decision_title,
  });
  await insertRun(run);
  return run;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      intake: Omit<DecisionIntake, "decision_id">;
      llm_provider?: LLMProviderName | "all";
      llm_providers?: LLMProviderName[];
      demo_scenario_id?: string;
    };
    const raw = body.intake;
    const demo_scenario_id = parseDemoScenarioId(body.demo_scenario_id);

    if (!raw?.situation?.trim()) {
      return NextResponse.json({ error: "situation is required" }, { status: 400 });
    }
    if (!raw?.constraints?.trim()) {
      return NextResponse.json({ error: "constraints is required" }, { status: 400 });
    }
    if (!raw?.posture || !isValidPosture(raw.posture)) {
      return NextResponse.json({ error: "valid posture is required" }, { status: 400 });
    }
    if (raw.posture === "pressure_test" && !raw.leaning_direction?.trim()) {
      return NextResponse.json({ error: "leaning_direction is required when posture is pressure_test" }, { status: 400 });
    }

    const selection = parseIntakeLlmSelection({
      llm_provider: body.llm_provider ?? "anthropic",
      llm_providers: body.llm_providers,
    });
    if (!selection.ok) {
      return NextResponse.json({ error: selection.error }, { status: 400 });
    }

    const decision_id = randomUUID();
    const intake: DecisionIntake = { ...raw, decision_id } as DecisionIntake;
    const user_id = session.user.id;

    if (selection.value.mode === "single") {
      const provider = selection.value.providers[0];
      const freeformResult = await runFreeformAnalysis(intake, provider);
      const run = await persistFreeformRun(intake, user_id, provider, freeformResult, demo_scenario_id);

      return NextResponse.json({
        run_id: run.run_id,
        decision_id: run.decision_id,
        model: freeformResult.model,
        generated_at: freeformResult.generated_at,
        output: freeformResult.output,
        intake,
        llm_provider: provider,
      });
    }

    const { runs, failed_providers } = await runForProviders(selection.value.providers, async (provider) => {
      const freeformResult = await runFreeformAnalysis(intake, provider);
      return persistFreeformRun(intake, user_id, provider, freeformResult, demo_scenario_id);
    });

    if (runs.length === 0) {
      return NextResponse.json(
        {
          error: `All providers failed: ${failed_providers.map((f) => `${f.provider} (${f.message})`).join("; ")}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      runs,
      primary_run_id: runs[0]!.run_id,
      decision_id: intake.decision_id,
      ...(failed_providers.length ? { failed_providers } : {}),
    });
  } catch (error) {
    console.error("[freeform]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
