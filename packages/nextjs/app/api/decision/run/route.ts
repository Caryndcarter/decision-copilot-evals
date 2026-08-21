import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { requireUserId } from "@/lib/require-user";

// Extend timeout for LLM-heavy operations (lenses + brief synthesis).
// "All providers" runs three full pipelines in parallel — allow extra wall-clock time.
export const maxDuration = 120; // seconds
import type {
  DecisionIntake,
  Clarification,
  ClarificationAnswer,
  DecisionRunResult,
  LensQuestion,
  LensOutput,
  DecisionBrief,
  Posture,
  DecisionRunStatus,
  LLMProviderName,
  DemoScenarioId,
} from "@/types/decision";
import { parseDemoScenarioId, isValidPosture, postureRequiresLeaning } from "@/types/decision";
import { runPostureLabel } from "@/lib/run-display-name";
import { runRiskLens } from "@/lenses/risk";
import { runReversibilityLens } from "@/lenses/reversibility";
import { runPeopleLens } from "@/lenses/people";
import { runBriefSynthesis, type BriefSynthesisPromptOptions } from "@/lenses/brief";
import { BRIEF_PROFILE_IS_DELETE } from "@/lib/brief-profile";
import { ensureBriefGeneratedAt } from "@/lib/ensure-brief-generated-at";
import { runDecisionTitle, runFreeformCardTitle } from "@/lenses/decision-title";
import { runFreeformAnalysis } from "@/lenses/freeform";
import { getRun, getRunsByDecisionId, insertRun, replaceRun, deleteRun } from "@/lib/db/runs";
import {
  canCombineClarifications,
  combinedQuestionEntryId,
  getAwaitingClarificationRuns,
} from "@/lib/merge-clarification-questions";
import { buildClarificationAnswersForSubmit } from "@/lib/clarification-answers";
import { parseIntakeLlmSelection } from "@/lib/intake-llm-selection";
import { runForProviders, type FailedProvider } from "@/lib/run-for-providers";

// ============================================
// Request Types
// ============================================

interface InitialRunRequest {
  type: "intake";
  intake: Omit<DecisionIntake, "decision_id"> & { decision_id?: string };
  /** LLM provider for this run (default: openai). Use "all" to run all configured providers simultaneously. */
  llm_provider?: LLMProviderName | "all";
  /** Run a custom subset of providers in parallel (mutually exclusive with llm_provider "all"). */
  llm_providers?: LLMProviderName[];
  /** When set, must match a known intake demo scenario id (see `DEMO_SCENARIO_IDS` in types/decision). */
  demo_scenario_id?: string;
}

interface ClarificationRequest {
  type: "clarification";
  decision_id: string;
  run_id: string;
  clarification: Omit<Clarification, "decision_id" | "run_id">;
}

interface UpdateLensOutputsRequest {
  type: "update_lens_outputs";
  run_id: string;
  lens_outputs: LensOutput[];
}

interface UpdateBriefRequest {
  type: "update_brief";
  run_id: string;
  decision_brief: Partial<DecisionBrief>;
  /** When provided, update this variant's brief instead of the base brief */
  variant_id?: string;
}

interface RerunPostureRequest {
  type: "rerun_posture";
  run_id: string;
  posture: Posture;
  leaning_direction?: string;
  /**
   * Omit: use the source run's provider. "all": run OpenAI, Anthropic, and Gemini in parallel (same as intake).
   * Or set to a specific provider for a single new run.
   */
  llm_provider?: LLMProviderName | "all";
}

/** New freeform-only sibling run(s): same decision, fresh model-chosen JSON for the selected posture. */
interface RerunFreeformRequest {
  type: "rerun_freeform";
  run_id: string;
  posture: Posture;
  leaning_direction?: string;
  llm_provider?: LLMProviderName | "all";
}

interface RerunProviderRequest {
  type: "rerun_provider";
  run_id: string;
  llm_provider: LLMProviderName;
}

interface DeleteVariantRequest {
  type: "delete_variant";
  run_id: string;
  variant_id: string;
}

interface DeleteRunRequest {
  type: "delete_run";
  run_id: string;
}

/** Replace answers on the latest clarification round, then re-run lenses + brief (same as first clarification submit). */
interface ReapplyClarificationRequest {
  type: "reapply_clarification";
  run_id: string;
  clarification: Pick<Clarification, "answers">;
}

/** Apply merged answers to every provider run awaiting clarification for one decision. */
interface BatchClarificationRequest {
  type: "batch_clarification";
  decision_id: string;
  answers: Record<string, string | number | boolean>;
}

type RunRequest =
  | InitialRunRequest
  | ClarificationRequest
  | BatchClarificationRequest
  | ReapplyClarificationRequest
  | UpdateLensOutputsRequest
  | UpdateBriefRequest
  | RerunPostureRequest
  | RerunFreeformRequest
  | RerunProviderRequest
  | DeleteVariantRequest
  | DeleteRunRequest;

// ============================================
// Validation
// ============================================

function postureLabel(posture: string): string {
  return runPostureLabel(posture);
}

function validateIntake(intake: InitialRunRequest["intake"]): string | null {
  if (!intake.situation?.trim()) {
    return "situation is required";
  }
  if (!intake.constraints?.trim()) {
    return "constraints is required";
  }
  if (!intake.posture || !isValidPosture(intake.posture)) {
    return "posture must be one of: explore, pressure_test, surface_risks, generate_alternatives, show_opposition";
  }
  if (postureRequiresLeaning(intake.posture) && !intake.leaning_direction?.trim()) {
    return `leaning_direction is required when posture is ${intake.posture}`;
  }
  return null;
}

function validateReapplyClarificationRequest(req: ReapplyClarificationRequest): string | null {
  if (!req.run_id?.trim()) {
    return "run_id is required";
  }
  if (!req.clarification?.answers?.length) {
    return "clarification.answers is required";
  }
  return null;
}

function validateClarificationRequest(req: ClarificationRequest): string | null {
  if (!req.decision_id?.trim()) {
    return "decision_id is required";
  }
  if (!req.run_id?.trim()) {
    return "run_id is required";
  }
  if (!req.clarification?.answers?.length) {
    return "clarification.answers is required";
  }
  return null;
}

function validateBatchClarificationRequest(req: BatchClarificationRequest): string | null {
  if (!req.decision_id?.trim()) {
    return "decision_id is required";
  }
  if (!req.answers || typeof req.answers !== "object" || Object.keys(req.answers).length === 0) {
    return "answers is required";
  }
  return null;
}

function buildRunAnswersFromCombined(
  run: DecisionRunResult,
  answersByEntryId: Record<string, string | number | boolean>
): ClarificationAnswer[] {
  const questions = run.clarification_questions ?? [];
  const clarificationAnswers: Record<string, string | number | boolean> = {};
  for (const q of questions) {
    const entryId = combinedQuestionEntryId(run.run_id, q);
    if (answersByEntryId[entryId] !== undefined) {
      clarificationAnswers[`${q.lens}-${q.question_id}`] = answersByEntryId[entryId];
    }
  }
  return buildClarificationAnswersForSubmit(questions, clarificationAnswers);
}

async function applyClarificationToRun(
  run: DecisionRunResult,
  answers: ClarificationAnswer[]
): Promise<DecisionRunResult> {
  const clarification: Clarification = {
    decision_id: run.decision_id,
    run_id: run.run_id,
    clarification_round: 1,
    answers,
  };

  if (!run.lens_outputs_first_draft?.length && run.lens_outputs?.length) {
    run.lens_outputs_first_draft = run.lens_outputs;
    if (run.decision_brief) {
      run.decision_brief_first_draft = run.decision_brief;
    }
  }

  run.clarifications.push(clarification);
  run.status = "processing_clarification";

  await runLensesAndBriefFromClarifications(run);
  await replaceRun(run.run_id, run);
  return run;
}

// ============================================
// Lens Processing (stubs - will integrate AI later)
// ============================================

function extractClarificationQuestions(lensOutputs: LensOutput[]): LensQuestion[] {
  return lensOutputs.flatMap((output) => output.questions_to_answer_next ?? []);
}

/** Default clarification question so we never skip the clarification step on initial intake (e.g. when Anthropic returns none). */
function getDefaultClarificationQuestions(): LensQuestion[] {
  return [
    {
      question_id: "default-timeline",
      lens: "risk",
      question_text: "What's your timeline or key milestone for this decision?",
      answer_type: "short_text",
      required: true,
    },
  ];
}

async function runLenses(
  intake: DecisionIntake,
  clarifications: Clarification[],
  provider: LLMProviderName = "openai"
): Promise<LensOutput[]> {
  const [riskOutput, reversibilityOutput, peopleOutput] = await Promise.all([
    runRiskLens(intake, clarifications, provider),
    runReversibilityLens(intake, clarifications, provider),
    runPeopleLens(intake, clarifications, provider),
  ]);
  return [riskOutput, reversibilityOutput, peopleOutput];
}

async function synthesizeBrief(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  clarifications: Clarification[] = [],
  provider: LLMProviderName = "openai",
  briefOpts?: BriefSynthesisPromptOptions
): Promise<DecisionBrief> {
  return runBriefSynthesis(intake, lensOutputs, clarifications, provider, undefined, briefOpts);
}

function isStubBrief(brief: DecisionBrief): boolean {
  return (
    brief.summary === "Pending implementation" &&
    brief.recommendation === "Pending implementation" &&
    (brief.key_considerations?.length ?? 0) === 0 &&
    (brief.next_steps?.length ?? 0) === 0
  );
}

async function runDecisionTitleSafe(
  intake: DecisionIntake,
  lens_outputs: LensOutput[],
  provider: LLMProviderName
): Promise<string | undefined> {
  try {
    const title = await runDecisionTitle(intake, lens_outputs, provider);
    return title.trim() || undefined;
  } catch (err) {
    console.warn("[decision] runDecisionTitle failed:", err instanceof Error ? err.message : err);
    return undefined;
  }
}

/**
 * After lenses: always generate `decision_title`; synthesize the full brief only when not awaiting clarification.
 * When a brief exists, its `title` is set from `decision_title` so UI does not show recommendation-style headings.
 */
async function finishLensesPhase(
  intake: DecisionIntake,
  lens_outputs: LensOutput[],
  clarifications: Clarification[],
  provider: LLMProviderName
): Promise<{
  clarification_questions: LensQuestion[];
  clarification_needed: boolean;
  decision_title: string | undefined;
  decision_brief: DecisionBrief | undefined;
}> {
  let clarification_questions = extractClarificationQuestions(lens_outputs);
  if (clarification_questions.length === 0) {
    console.log("[Run] No clarification questions from lenses (provider:", provider, "); using default");
    clarification_questions = getDefaultClarificationQuestions();
  }
  const clarification_needed = clarification_questions.length > 0;

  const titlePromise = runDecisionTitleSafe(intake, lens_outputs, provider);

  if (clarification_needed) {
    const decision_title = await titlePromise;
    return { clarification_questions, clarification_needed, decision_title, decision_brief: undefined };
  }

  const [decision_title, decision_brief] = await Promise.all([
    titlePromise,
    synthesizeBrief(intake, lens_outputs, clarifications, provider),
  ]);

  const mergedBrief =
    decision_brief && decision_title?.trim()
      ? ensureBriefGeneratedAt({ ...decision_brief, title: decision_title.trim() })
      : decision_brief
        ? ensureBriefGeneratedAt(decision_brief)
        : decision_brief;

  return {
    clarification_questions,
    clarification_needed: false,
    decision_title: decision_title?.trim() || undefined,
    decision_brief: mergedBrief,
  };
}

async function runParallelIntakeProviders<T>(
  providers: LLMProviderName[],
  build: (p: LLMProviderName) => Promise<T>
): Promise<{ runs: T[]; failed_providers: FailedProvider[] }> {
  return runForProviders(providers, build);
}

// ============================================
// Route Handlers
// ============================================

const RUN_GET_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, must-revalidate",
};

/** GET /api/decision/run?run_id=xxx — fetch one run. GET /api/decision/run?decision_id=xxx — list runs for that decision (for posture dropdown). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const run_id = searchParams.get("run_id");
  const decision_id = searchParams.get("decision_id");
  if (run_id?.trim()) {
    const run = await getRun(run_id.trim());
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404, headers: RUN_GET_NO_STORE_HEADERS });
    }
    return NextResponse.json(run, { headers: RUN_GET_NO_STORE_HEADERS });
  }
  if (decision_id?.trim()) {
    const runs = await getRunsByDecisionId(decision_id.trim());
    return NextResponse.json({ runs }, { headers: RUN_GET_NO_STORE_HEADERS });
  }
  return NextResponse.json(
    { error: "run_id or decision_id query parameter is required" },
    { status: 400, headers: RUN_GET_NO_STORE_HEADERS }
  );
}

export async function POST(request: NextRequest) {
  const gate = await requireUserId();
  if (!gate.ok) return gate.response;

  try {
    const body = (await request.json()) as RunRequest;

    if (body.type === "intake") {
      return handleIntake(body);
    } else if (body.type === "clarification") {
      return handleClarification(body);
    } else if (body.type === "batch_clarification") {
      return handleBatchClarification(body);
    } else if (body.type === "reapply_clarification") {
      return handleReapplyClarification(body);
    } else if (body.type === "update_lens_outputs") {
      return handleUpdateLensOutputs(body);
    } else if (body.type === "update_brief") {
      return handleUpdateBrief(body);
    } else if (body.type === "rerun_posture") {
      return handleRerunPosture(body);
    } else if (body.type === "rerun_freeform") {
      return handleRerunFreeform(body);
    } else if (body.type === "rerun_provider") {
      return handleRerunProvider(body);
    } else if (body.type === "delete_variant") {
      return handleDeleteVariant(body);
    } else if (body.type === "delete_run") {
      return handleDeleteRun(body);
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid request type. Must be 'intake', 'clarification', 'reapply_clarification', 'update_lens_outputs', 'update_brief', 'rerun_posture', 'rerun_freeform', 'rerun_provider', 'delete_variant', or 'delete_run'",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error processing decision run:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("API_KEY") && message.includes("not set")) {
      return NextResponse.json(
        {
          error:
            "The selected AI provider is not configured. Add the required API key to your .env (e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY).",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: message || "Internal server error" },
      { status: 500 }
    );
  }
}

/** Build and persist a single run for one provider. Shared by handleIntake and the "all" path. */
async function buildSingleRun(
  intake: DecisionIntake,
  provider: LLMProviderName,
  options?: { demo_scenario_id?: DemoScenarioId; user_id?: string }
): Promise<DecisionRunResult> {
  const run_id = randomUUID();

  const lens_outputs = await runLenses(intake, [], provider);
  lens_outputs.forEach((out) => {
    const count = out.questions_to_answer_next?.length ?? 0;
    if (count === 0 && provider === "anthropic") {
      console.log("[Run] Lens", out.lens, "returned 0 questions_to_answer_next (provider: anthropic)");
    }
  });
  const phase = await finishLensesPhase(intake, lens_outputs, [], provider);

  const status: DecisionRunStatus = phase.clarification_needed
    ? "awaiting_clarification"
    : isStubBrief(phase.decision_brief!)
      ? "pending_brief"
      : "complete";

  const clarification_question_sections =
    phase.clarification_questions.length > 0
      ? [
          {
            postureLabel: `${postureLabel(intake.posture)} posture`,
            keys: phase.clarification_questions.map((q) => `${q.lens}-${q.question_id}`),
          },
        ]
      : undefined;

  const result: DecisionRunResult = {
    decision_id: intake.decision_id,
    run_id,
    status,
    intake,
    clarification_questions: phase.clarification_questions,
    clarification_question_sections,
    clarification_needed: phase.clarification_needed,
    clarifications: [],
    lens_outputs,
    decision_brief: phase.decision_brief,
    lens_outputs_first_draft: lens_outputs,
    decision_brief_first_draft: phase.decision_brief,
    llm_provider: provider,
    ...(phase.decision_title ? { decision_title: phase.decision_title } : {}),
    ...(options?.demo_scenario_id ? { demo_scenario_id: options.demo_scenario_id } : {}),
    ...(options?.user_id ? { user_id: options.user_id } : {}),
  };

  await insertRun(result);
  return result;
}

async function handleIntake(req: InitialRunRequest): Promise<NextResponse> {
  const validationError = validateIntake(req.intake);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const session = await auth();
  const user_id = session?.user?.id;
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decision_id = req.intake.decision_id || randomUUID();
  const intake: DecisionIntake = { ...req.intake, decision_id } as DecisionIntake;
  const demo_scenario_id = parseDemoScenarioId(req.demo_scenario_id);
  const runOptions = { ...(demo_scenario_id ? { demo_scenario_id } : {}), user_id };

  const selection = parseIntakeLlmSelection(req);
  if (!selection.ok) {
    return NextResponse.json({ error: selection.error }, { status: 400 });
  }

  if (selection.value.mode === "single") {
    const result = await buildSingleRun(intake, selection.value.providers[0], runOptions);
    return NextResponse.json(result);
  }

  // Parallel mode: all providers or a custom multi-select subset, same decision_id.
  const { runs, failed_providers } = await runParallelIntakeProviders(selection.value.providers, (p) =>
    buildSingleRun(intake, p, runOptions)
  );
  if (runs.length === 0) {
    return NextResponse.json(
      {
        error: `All providers failed: ${failed_providers
          .map((f) => `${f.provider} (${f.message})`)
          .join("; ")}`,
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ runs, primary_run_id: runs[0].run_id, failed_providers });
}

/** Re-run all lenses and synthesize brief using current `existingRun.clarifications`. Mutates `existingRun`. */
async function runLensesAndBriefFromClarifications(existingRun: DecisionRunResult): Promise<void> {
  const provider = existingRun.llm_provider ?? "openai";
  const briefOpts: BriefSynthesisPromptOptions | undefined =
    BRIEF_PROFILE_IS_DELETE && existingRun.decision_brief
      ? { priorPublishedBrief: existingRun.decision_brief }
      : undefined;
  try {
    console.log("[Clarification] Running lenses with provider:", provider);
    const lens_outputs = await runLenses(existingRun.intake, existingRun.clarifications, provider);
    console.log("[Clarification] Lenses complete, running brief synthesis");
    const decision_brief = await synthesizeBrief(
      existingRun.intake,
      lens_outputs,
      existingRun.clarifications,
      provider,
      briefOpts
    );
    console.log("[Clarification] Brief synthesis complete");
    const stableTitle = existingRun.decision_title?.trim();
    const briefWithStableTitle =
      stableTitle && decision_brief ? { ...decision_brief, title: stableTitle } : decision_brief;
    existingRun.lens_outputs = lens_outputs;
    existingRun.decision_brief = briefWithStableTitle
      ? ensureBriefGeneratedAt(briefWithStableTitle)
      : briefWithStableTitle;
    existingRun.status = isStubBrief(briefWithStableTitle) ? "pending_brief" : "complete";
    existingRun.clarification_needed = false;
    existingRun.clarification_questions = existingRun.clarification_questions ?? [];
    existingRun.clarification_question_sections = existingRun.clarification_question_sections ?? undefined;
  } catch (err) {
    console.error("[Clarification] Error during analysis:", err);
    throw err;
  }
}

async function handleClarification(req: ClarificationRequest): Promise<NextResponse> {
  const validationError = validateClarificationRequest(req);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existingRun = await getRun(req.run_id);
  if (!existingRun) {
    return NextResponse.json(
      { error: "Run not found. Please start a new decision." },
      { status: 404 }
    );
  }

  if (existingRun.status !== "awaiting_clarification") {
    return NextResponse.json(
      { error: `Cannot submit clarification for run in status: ${existingRun.status}` },
      { status: 400 }
    );
  }

  const updated = await applyClarificationToRun(existingRun, req.clarification.answers);
  return NextResponse.json(updated);
}

async function handleBatchClarification(req: BatchClarificationRequest): Promise<NextResponse> {
  const validationError = validateBatchClarificationRequest(req);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const allRuns = await getRunsByDecisionId(req.decision_id.trim());
  if (!allRuns.length) {
    return NextResponse.json({ error: "No runs found for this decision." }, { status: 404 });
  }

  if (!canCombineClarifications(allRuns)) {
    return NextResponse.json(
      { error: "This decision does not have multiple runs awaiting clarification for the same posture." },
      { status: 400 }
    );
  }

  const awaiting = getAwaitingClarificationRuns(allRuns);

  const settled = await Promise.allSettled(
    awaiting.map(async (run) => {
      const fresh = (await getRun(run.run_id)) ?? run;
      if (fresh.status !== "awaiting_clarification") {
        throw new Error(`Run ${fresh.run_id} is no longer awaiting clarification`);
      }
      const answers = buildRunAnswersFromCombined(fresh, req.answers);
      if (answers.length === 0) {
        throw new Error(`No answers mapped for run ${fresh.run_id}`);
      }
      return applyClarificationToRun(fresh, answers);
    })
  );

  const runs: DecisionRunResult[] = [];
  const failed_runs: { run_id: string; message: string }[] = [];
  settled.forEach((res, i) => {
    const run_id = awaiting[i]!.run_id;
    if (res.status === "fulfilled") {
      runs.push(res.value);
    } else {
      const message = res.reason instanceof Error ? res.reason.message : String(res.reason);
      failed_runs.push({ run_id, message });
    }
  });

  if (runs.length === 0) {
    return NextResponse.json(
      { error: `All runs failed: ${failed_runs.map((f) => `${f.run_id} (${f.message})`).join("; ")}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ runs, failed_runs: failed_runs.length ? failed_runs : undefined });
}

async function handleReapplyClarification(req: ReapplyClarificationRequest): Promise<NextResponse> {
  const validationError = validateReapplyClarificationRequest(req);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existingRun = await getRun(req.run_id.trim());
  if (!existingRun) {
    return NextResponse.json(
      { error: "Run not found. Please start a new decision." },
      { status: 404 }
    );
  }

  if (existingRun.clarifications.length === 0) {
    return NextResponse.json(
      { error: "This run has no clarification answers to update. Submit follow-up questions first." },
      { status: 400 }
    );
  }

  if (existingRun.status !== "complete" && existingRun.status !== "pending_brief") {
    return NextResponse.json(
      {
        error: `Regenerate is only available after the first clarification pass (current status: ${existingRun.status}).`,
      },
      { status: 400 }
    );
  }

  const lastIdx = existingRun.clarifications.length - 1;
  const last = existingRun.clarifications[lastIdx];
  existingRun.clarifications = [
    ...existingRun.clarifications.slice(0, lastIdx),
    {
      ...last,
      answers: req.clarification.answers,
    },
  ];
  existingRun.status = "processing_clarification";

  await runLensesAndBriefFromClarifications(existingRun);

  await replaceRun(req.run_id.trim(), existingRun);

  return NextResponse.json(existingRun);
}

async function handleUpdateLensOutputs(req: UpdateLensOutputsRequest): Promise<NextResponse> {
  if (!req.run_id?.trim()) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }
  if (!Array.isArray(req.lens_outputs)) {
    return NextResponse.json({ error: "lens_outputs must be an array" }, { status: 400 });
  }

  const existingRun = await getRun(req.run_id.trim());
  if (!existingRun) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  existingRun.lens_outputs = req.lens_outputs;
  await replaceRun(req.run_id.trim(), existingRun);

  return NextResponse.json(existingRun);
}

async function handleUpdateBrief(req: UpdateBriefRequest): Promise<NextResponse> {
  if (!req.run_id?.trim()) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }
  if (!req.decision_brief || typeof req.decision_brief !== "object") {
    return NextResponse.json({ error: "decision_brief object is required" }, { status: 400 });
  }

  const existingRun = await getRun(req.run_id.trim());
  if (!existingRun) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // If variant_id provided, update that variant's brief
  if (req.variant_id?.trim()) {
    const variantIdx = existingRun.variants?.findIndex((v) => v.variant_id === req.variant_id);
    if (variantIdx === undefined || variantIdx < 0 || !existingRun.variants) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    const variant = existingRun.variants[variantIdx];
    const current = variant.decision_brief;
    variant.decision_brief = ensureBriefGeneratedAt({
      title: req.decision_brief.title ?? current.title,
      generated_at: req.decision_brief.generated_at ?? current.generated_at,
      summary: req.decision_brief.summary ?? current.summary,
      recommendation: req.decision_brief.recommendation ?? current.recommendation,
      key_considerations: req.decision_brief.key_considerations ?? current.key_considerations,
      next_steps: req.decision_brief.next_steps ?? current.next_steps,
      custom_sections: req.decision_brief.custom_sections ?? current.custom_sections,
    });
    existingRun.variants[variantIdx] = variant;
    await replaceRun(req.run_id.trim(), existingRun);
    return NextResponse.json(existingRun);
  }

  // Update base brief
  const current = existingRun.decision_brief;
  if (!current) {
    return NextResponse.json(
      { error: "Run has no decision brief to update" },
      { status: 400 }
    );
  }

  existingRun.decision_brief = ensureBriefGeneratedAt({
    title: req.decision_brief.title ?? current.title,
    generated_at: req.decision_brief.generated_at ?? current.generated_at,
    summary: req.decision_brief.summary ?? current.summary,
    recommendation: req.decision_brief.recommendation ?? current.recommendation,
    key_considerations: req.decision_brief.key_considerations ?? current.key_considerations,
    next_steps: req.decision_brief.next_steps ?? current.next_steps,
    custom_sections: req.decision_brief.custom_sections ?? current.custom_sections,
  });
  await replaceRun(req.run_id.trim(), existingRun);

  return NextResponse.json(existingRun);
}

async function handleDeleteVariant(req: DeleteVariantRequest): Promise<NextResponse> {
  if (!req.run_id?.trim()) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }
  if (!req.variant_id?.trim()) {
    return NextResponse.json({ error: "variant_id is required" }, { status: 400 });
  }

  const existingRun = await getRun(req.run_id.trim());
  if (!existingRun) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const variants = existingRun.variants ?? [];
  const next = variants.filter((v) => v.variant_id !== req.variant_id.trim());
  if (next.length === variants.length) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  existingRun.variants = next;
  existingRun.synthesis = undefined;
  await replaceRun(req.run_id.trim(), existingRun);

  return NextResponse.json(existingRun);
}

async function handleDeleteRun(req: DeleteRunRequest): Promise<NextResponse> {
  if (!req.run_id?.trim()) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }
  const id = req.run_id.trim();
  const existing = await getRun(id);
  if (!existing) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  const removed = await deleteRun(id);
  if (!removed) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true as const, decision_id: existing.decision_id });
}

/** One new run: new posture (intake), same decision, merged clarification UX from source run. */
async function buildRerunPostureRun(
  sourceRun: DecisionRunResult,
  newIntake: DecisionIntake,
  provider: LLMProviderName,
): Promise<DecisionRunResult> {
  const newRunId = randomUUID();
  const decision_id = sourceRun.decision_id;

  const lens_outputs = await runLenses(newIntake, [], provider);
  /** Questions must come from *this* run's lens output (this provider + posture). Do not merge prior run questions — overlapping question_ids would keep the old model's wording and hide the new one. */
  let clarification_questions = extractClarificationQuestions(lens_outputs);
  if (clarification_questions.length === 0) {
    clarification_questions = getDefaultClarificationQuestions();
  }
  const seenKey = (q: Pick<LensQuestion, "lens" | "question_id">) => `${q.lens}-${q.question_id}`;
  const questionKeySet = new Set(clarification_questions.map(seenKey));

  const clarification_question_sections: { postureLabel: string; keys: string[] }[] =
    clarification_questions.length > 0
      ? [
          {
            postureLabel: `${postureLabel(newIntake.posture)} posture`,
            keys: clarification_questions.map(seenKey),
          },
        ]
      : [];
  const clarification_needed = clarification_questions.length > 0;

  const lastSourceClarification = sourceRun.clarifications?.[sourceRun.clarifications.length - 1];
  const migratedAnswers =
    lastSourceClarification?.answers?.filter((a) => questionKeySet.has(`${a.lens}-${a.question_id}`)) ?? [];
  const clarifications: Clarification[] =
    migratedAnswers.length > 0
      ? [
          {
            decision_id,
            run_id: newRunId,
            clarification_round: 0,
            answers: migratedAnswers,
          },
        ]
      : [];

  const titlePromise = runDecisionTitleSafe(newIntake, lens_outputs, provider);

  let status: DecisionRunStatus;
  let decision_brief: DecisionBrief | undefined;
  let decision_title: string | undefined;

  if (clarification_needed) {
    status = "awaiting_clarification";
    decision_title = await titlePromise;
  } else {
    const [t, brief] = await Promise.all([
      titlePromise,
      synthesizeBrief(newIntake, lens_outputs, clarifications, provider),
    ]);
    decision_title = t?.trim() || undefined;
    decision_brief =
      decision_title && brief
        ? ensureBriefGeneratedAt({ ...brief, title: decision_title })
        : brief
          ? ensureBriefGeneratedAt(brief)
          : brief;
    status = isStubBrief(decision_brief) ? "pending_brief" : "complete";
  }

  const result: DecisionRunResult = {
    decision_id,
    run_id: newRunId,
    status,
    intake: newIntake,
    clarification_questions,
    clarification_question_sections:
      clarification_question_sections.length > 0 ? clarification_question_sections : undefined,
    clarification_needed,
    clarifications,
    lens_outputs,
    decision_brief,
    lens_outputs_first_draft: lens_outputs,
    decision_brief_first_draft: decision_brief,
    llm_provider: provider,
    ...(decision_title ? { decision_title } : {}),
    ...(sourceRun.demo_scenario_id ? { demo_scenario_id: sourceRun.demo_scenario_id } : {}),
    ...(sourceRun.user_id ? { user_id: sourceRun.user_id } : {}),
  };

  await insertRun(result);
  return result;
}

async function buildFreeformSiblingRun(
  sourceRun: DecisionRunResult,
  newIntake: DecisionIntake,
  provider: LLMProviderName
): Promise<DecisionRunResult> {
  const freeform = await runFreeformAnalysis(newIntake, provider);
  let decision_title: string | undefined;
  try {
    decision_title = await runFreeformCardTitle(newIntake, freeform.output, provider);
  } catch (e) {
    console.warn("[rerun_freeform] card title failed", e);
  }
  const newRunId = randomUUID();
  const result: DecisionRunResult = {
    decision_id: sourceRun.decision_id,
    run_id: newRunId,
    status: "complete",
    intake: newIntake,
    clarification_questions: [],
    clarification_needed: false,
    clarifications: [],
    lens_outputs: [],
    llm_provider: provider,
    freeform_output: freeform.output,
    freeform_model: freeform.model,
    freeform_generated_at: freeform.generated_at,
    ...(decision_title ? { decision_title } : {}),
    ...(sourceRun.demo_scenario_id ? { demo_scenario_id: sourceRun.demo_scenario_id } : {}),
    ...(sourceRun.user_id ? { user_id: sourceRun.user_id } : {}),
  };
  await insertRun(result);
  return result;
}

async function handleRerunFreeform(req: RerunFreeformRequest): Promise<NextResponse> {
  if (!req.run_id?.trim()) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }
  if (!isValidPosture(req.posture)) {
    return NextResponse.json(
      { error: "posture must be one of: explore, pressure_test, surface_risks, generate_alternatives, show_opposition" },
      { status: 400 }
    );
  }
  if (postureRequiresLeaning(req.posture) && !req.leaning_direction?.trim()) {
    return NextResponse.json(
      { error: `leaning_direction is required when posture is ${req.posture}` },
      { status: 400 }
    );
  }

  const sourceRun = await getRun(req.run_id.trim());
  if (!sourceRun) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (!sourceRun.freeform_output) {
    return NextResponse.json({ error: "This run is not a freeform analysis" }, { status: 400 });
  }

  const newIntake: DecisionIntake = {
    ...sourceRun.intake,
    posture: req.posture,
    ...(postureRequiresLeaning(req.posture) && { leaning_direction: req.leaning_direction!.trim() }),
    ...(!postureRequiresLeaning(req.posture) && { leaning_direction: undefined }),
  } as DecisionIntake;

  if (req.llm_provider === "all") {
    const { runs, failed_providers } = await runParallelIntakeProviders(
      ["openai", "anthropic", "gemini", "xai"],
      (p) => buildFreeformSiblingRun(sourceRun, newIntake, p)
    );
    if (runs.length === 0) {
      return NextResponse.json(
        {
          error: `All providers failed: ${failed_providers
            .map((f) => `${f.provider} (${f.message})`)
            .join("; ")}`,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({
      runs,
      primary_run_id: runs[0]!.run_id,
      decision_id: sourceRun.decision_id,
      failed_providers,
    });
  }

  const validSingle: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];
  const requested = req.llm_provider;
  const provider: LLMProviderName =
    requested && validSingle.includes(requested as LLMProviderName)
      ? (requested as LLMProviderName)
      : (sourceRun.llm_provider ?? "anthropic");

  const result = await buildFreeformSiblingRun(sourceRun, newIntake, provider);
  return NextResponse.json(result);
}

async function handleRerunPosture(req: RerunPostureRequest): Promise<NextResponse> {
  if (!req.run_id?.trim()) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }
  if (!isValidPosture(req.posture)) {
    return NextResponse.json(
      { error: "posture must be one of: explore, pressure_test, surface_risks, generate_alternatives, show_opposition" },
      { status: 400 }
    );
  }
  if (postureRequiresLeaning(req.posture) && !req.leaning_direction?.trim()) {
    return NextResponse.json(
      { error: `leaning_direction is required when posture is ${req.posture}` },
      { status: 400 }
    );
  }

  const sourceRun = await getRun(req.run_id.trim());
  if (!sourceRun) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const newIntake: DecisionIntake = {
    ...sourceRun.intake,
    posture: req.posture,
    ...(postureRequiresLeaning(req.posture) && { leaning_direction: req.leaning_direction!.trim() }),
    ...(!postureRequiresLeaning(req.posture) && { leaning_direction: undefined }),
  } as DecisionIntake;

  if (req.llm_provider === "all") {
    const { runs, failed_providers } = await runParallelIntakeProviders(
      ["openai", "anthropic", "gemini", "xai"],
      (p) => buildRerunPostureRun(sourceRun, newIntake, p)
    );
    if (runs.length === 0) {
      return NextResponse.json(
        {
          error: `All providers failed: ${failed_providers
            .map((f) => `${f.provider} (${f.message})`)
            .join("; ")}`,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ runs, primary_run_id: runs[0].run_id, failed_providers });
  }

  const validSingle: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];
  const requested = req.llm_provider;
  const provider: LLMProviderName =
    requested && validSingle.includes(requested as LLMProviderName)
      ? (requested as LLMProviderName)
      : (sourceRun.llm_provider ?? "openai");

  const result = await buildRerunPostureRun(sourceRun, newIntake, provider);
  return NextResponse.json(result);
}

async function handleRerunProvider(req: RerunProviderRequest): Promise<NextResponse> {
  if (!req.run_id?.trim()) {
    return NextResponse.json({ error: "run_id is required" }, { status: 400 });
  }
  const validProviders: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];
  if (!validProviders.includes(req.llm_provider)) {
    return NextResponse.json(
      { error: `llm_provider must be one of: ${validProviders.join(", ")}` },
      { status: 400 }
    );
  }

  const sourceRun = await getRun(req.run_id.trim());
  if (!sourceRun) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (sourceRun.llm_provider === req.llm_provider) {
    return NextResponse.json(
      { error: `Run already uses ${req.llm_provider}. Choose the other provider.` },
      { status: 400 }
    );
  }

  const newRunId = randomUUID();
  const decision_id = sourceRun.decision_id;
  const provider = req.llm_provider;

  // Same intake and posture, but no prior clarifications: let the new AI do a fresh first pass and ask its own questions
  const lens_outputs = await runLenses(sourceRun.intake, [], provider);
  const phase = await finishLensesPhase(sourceRun.intake, lens_outputs, [], provider);

  const clarification_question_sections =
    phase.clarification_questions.length > 0
      ? [
          {
            postureLabel: `${postureLabel(sourceRun.intake.posture)} posture`,
            keys: phase.clarification_questions.map((q) => `${q.lens}-${q.question_id}`),
          },
        ]
      : undefined;

  const status: DecisionRunStatus = phase.clarification_needed
    ? "awaiting_clarification"
    : isStubBrief(phase.decision_brief!)
      ? "pending_brief"
      : "complete";

  // New provider = fresh analysis; do not copy chat or research from the other model's run.
  const result: DecisionRunResult = {
    decision_id,
    run_id: newRunId,
    status,
    intake: sourceRun.intake,
    clarification_questions: phase.clarification_questions,
    clarification_question_sections,
    clarification_needed: phase.clarification_needed,
    clarifications: [],
    lens_outputs,
    decision_brief: phase.decision_brief,
    lens_outputs_first_draft: lens_outputs,
    decision_brief_first_draft: phase.decision_brief,
    llm_provider: provider,
    ...(phase.decision_title ? { decision_title: phase.decision_title } : {}),
    ...(sourceRun.demo_scenario_id ? { demo_scenario_id: sourceRun.demo_scenario_id } : {}),
    ...(sourceRun.user_id ? { user_id: sourceRun.user_id } : {}),
  };

  await insertRun(result);
  return NextResponse.json(result);
}
