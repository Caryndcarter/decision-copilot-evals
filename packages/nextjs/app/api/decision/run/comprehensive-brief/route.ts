import { NextRequest, NextResponse } from "next/server";
import { getRun, replaceRun } from "@/lib/db/runs";
import { runComprehensiveBriefSynthesis } from "@/lenses/brief";
import type { DecisionRunResult } from "@/types/decision";

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { run_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const run_id = typeof body.run_id === "string" ? body.run_id.trim() : "";
  if (!run_id) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }

  const run = await getRun(run_id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const research = run.research_completions ?? [];
  const variants = run.variants ?? [];
  if (research.length === 0 && variants.length === 0) {
    return NextResponse.json(
      {
        error:
          "Add at least one research task or saved analysis version before generating an integrated brief.",
      },
      { status: 400 }
    );
  }

  if (!run.lens_outputs?.length) {
    return NextResponse.json({ error: "Run has no lens analysis to synthesize" }, { status: 400 });
  }

  const provider = run.llm_provider ?? "openai";
  const stableTitle =
    run.decision_title?.trim() || run.decision_brief?.title?.trim() || undefined;

  try {
    const decision_brief_comprehensive = await runComprehensiveBriefSynthesis(
      run.intake,
      run.lens_outputs,
      run.clarifications ?? [],
      {
        research_completions: research,
        variants,
        base_custom_sections: run.decision_brief?.custom_sections,
      },
      provider,
      stableTitle
    );

    const updated: DecisionRunResult = {
      ...run,
      decision_brief_comprehensive,
    };
    await replaceRun(run_id, updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[comprehensive-brief]", err);
    const message = err instanceof Error ? err.message : "Brief synthesis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
