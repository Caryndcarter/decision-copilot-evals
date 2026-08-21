/**
 * Multi-demo authorship harness (decision-copilot-evals)
 *
 * Runs five high-conflict intake demos once each, generating Unified Briefs in
 * Standard / Blind / Reassigned authorship modes — for branding-effect and
 * moral-leaning analysis (not voice variants of one case).
 *
 * Cases: Civitas, Hospital PE, Core banking, Gen-AI compliance, VP Sales.
 *
 * Expected Unified Briefs (all 4 providers as synthesizers):
 *   5 demos × 4 synthesizers × 3 authorship modes = 60
 *
 * Per demo:
 *   1. Intake across all configured providers (awaiting clarification)
 *   2. Dedupe questions + demo clarification answers
 *   3. Submit clarifications → re-run lenses + briefs
 *   4. Each provider run: fixed variant + fixed research starter for that demo
 *   5. Each synthesizer × open/blind/reassigned: Unified Brief + contributions
 *
 * From repo root (MongoDB Atlas via MONGODB_URI / DB_NAME):
 *   npm run harness:demos:authorship
 *
 * Env / flags:
 *   HARNESS_USER_EMAIL=you@example.com
 *   HARNESS_PROVIDERS=openai,anthropic,gemini,xai
 *   HARNESS_DEMO_CONCURRENCY=5       # demos in parallel (default 5; use 1 to serialize)
 *   HARNESS_DEMOS=meridian-civitas-saas-rollup,healthcare-pe-acquisition
 *   --demos=... --start-demo=... --demo-concurrency=5
 *   --user-email=... --providers=openai,gemini
 *   --fill-decision=<uuid>[,uuid…]   # backfill missing synthesizer×mode briefs+contribs
 *   --modes=open,blind,reassigned    # optional filter with fill-decision
 *   --synthesizers=xai               # optional filter with fill-decision
 *   --force                          # refill even if brief already exists
 *
 * Same five high-conflict demos as decision-copilot-dynamodb (not Meridian IC voice variants).
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEMO_HARNESS_CASES,
  type DemoHarnessCase,
} from "../lib/demo-harness-cases";
import { insertRun, getRun, getRunsByDecisionId, replaceRun, nextHarnessRunNumber } from "../lib/db/runs";
import { findUserByEmail } from "../lib/db/users";
import { runForProviders } from "../lib/run-for-providers";
import { ALL_LLM_PROVIDERS } from "../lib/intake-llm-selection";
import { buildClarificationAnswersForSubmit } from "../lib/clarification-answers";
import { buildDemoSampleQuestions } from "../lib/clarification-demo-request";
import {
  combinedQuestionEntryId,
  getAwaitingClarificationRuns,
  listCombinedClarificationQuestions,
} from "../lib/merge-clarification-questions";
import { ensureBriefGeneratedAt } from "../lib/ensure-brief-generated-at";
import { resolveVariantFormatInstruction } from "../lib/suggest-format-tag";
import {
  clampResearchSections,
  deriveSummaryFromText,
  fallbackResearchSections,
  isMeaningfulResearchText,
  splitResearchStructuredResponse,
} from "../lib/research-structured-response";
import { canonicalRunsForUnifiedBriefDecision } from "../lib/best-of-worlds-incomplete";
import { runHasAnalysisForUnifiedBrief } from "../lib/unified-brief-eligibility";
import {
  consolidateUnifiedAuthorshipOntoRun,
  findUnifiedBriefAcrossRuns,
  pickPersistRunForUnifiedBrief,
} from "../lib/unified-brief-persist-run";
import {
  UNIFIED_BRIEF_SYNTHESIZERS,
  getUnifiedBriefContributionsByAuthor,
  getUnifiedBriefForAuthor,
  mergeUnifiedBriefContributionsIntoRun,
  mergeUnifiedBriefIntoRun,
  type UnifiedBriefSynthesizer,
} from "../lib/unified-briefs";
import { runRiskLens, runReversibilityLens, runPeopleLens } from "../lenses";
import { runBestOfWorldsBriefSynthesis, runBriefSynthesis } from "../lenses/brief";
import { runDecisionTitle } from "../lenses/decision-title";
import { generateClarificationDemoSamplesWithGemini } from "../lenses/clarification-demo-samples";
import { dedupeClarificationQuestionsWithGemini } from "../lenses/clarification-dedupe";
import { runUnifiedBriefContributionsAnalysis } from "../lenses/unified-brief-contributions";
import { getClient } from "../llm";
import type {
  Clarification,
  ClarificationAnswer,
  DecisionIntake,
  DecisionRunResult,
  LensOutput,
  LensQuestion,
  LLMProviderName,
  ResearchCompletion,
  RunVariant,
  UnifiedBriefAuthorshipMode,
} from "../types/decision";

const AUTHORSHIP_MODES: UnifiedBriefAuthorshipMode[] = ["open", "blind", "reassigned"];

type StepResult = { ok: true } | { ok: false; error: string };

type DemoReport = {
  demo_index: number;
  demo_id: string;
  demo_label: string;
  decision_id: string;
  run_ids: Partial<Record<LLMProviderName, string>>;
  failed_intake: { provider: string; message: string }[];
  clarification: StepResult & { demo_method?: string; demo_model?: string };
  variants: Partial<Record<LLMProviderName, StepResult>>;
  research: Partial<Record<LLMProviderName, StepResult>>;
  briefs: Record<string, StepResult>;
  contributions: Record<string, StepResult>;
  started_at: string;
  finished_at?: string;
};

function log(msg: string, extra?: unknown) {
  const ts = new Date().toISOString().slice(11, 19);
  if (extra !== undefined) console.log(`[${ts}] ${msg}`, extra);
  else console.log(`[${ts}] ${msg}`);
}

function demoLog(demo: DemoHarnessCase, msg: string, extra?: unknown) {
  log(`[${demo.id}] ${msg}`, extra);
}

/** LLM clients often `throw { code, message, provider }` instead of Error. */
function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; code?: unknown; provider?: unknown };
    if (typeof o.message === "string" && o.message.trim()) {
      const bits = [o.message.trim()];
      if (typeof o.provider === "string") bits.push(`provider=${o.provider}`);
      if (typeof o.code === "string") bits.push(`code=${o.code}`);
      return bits.join(" · ");
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function parseArgs(argv: string[]) {
  const get = (name: string) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  return {
    /** Comma-separated demo ids; empty = all DEMO_HARNESS_CASES. */
    demosRaw: (get("demos") ?? process.env.HARNESS_DEMOS ?? "").trim(),
    /** Skip demos before this id (inclusive start). */
    startDemo: (get("start-demo") ?? process.env.HARNESS_START_DEMO ?? "").trim(),
    userEmail: (get("user-email") ?? process.env.HARNESS_USER_EMAIL ?? "").trim(),
    providersRaw: (get("providers") ?? process.env.HARNESS_PROVIDERS ?? "").trim(),
    /** How many demos to run at once (default 5 = full set in parallel). */
    demoConcurrency: Number(
      get("demo-concurrency") ?? process.env.HARNESS_DEMO_CONCURRENCY ?? 5
    ),
    runNumberRaw: (get("run-number") ?? process.env.HARNESS_RUN_NUMBER ?? "").trim(),
    batchIdRaw: (get("batch-id") ?? process.env.HARNESS_BATCH_ID ?? "").trim(),
    fillDecisionRaw: (get("fill-decision") ?? "").trim(),
    modesRaw: (get("modes") ?? "").trim(),
    synthesizersRaw: (get("synthesizers") ?? "").trim(),
    force: argv.includes("--force"),
  };
}

function parseModesFilter(raw: string): UnifiedBriefAuthorshipMode[] {
  if (!raw.trim()) return [...AUTHORSHIP_MODES];
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = new Set<string>(AUTHORSHIP_MODES);
  const bad = wanted.filter((m) => !allowed.has(m));
  if (bad.length) throw new Error(`Unknown mode(s): ${bad.join(", ")}`);
  return wanted as UnifiedBriefAuthorshipMode[];
}

function parseSynthesizersFilter(
  raw: string,
  available: UnifiedBriefSynthesizer[]
): UnifiedBriefSynthesizer[] {
  if (!raw.trim()) return available;
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = new Set<string>(available);
  const bad = wanted.filter((s) => !allowed.has(s));
  if (bad.length) throw new Error(`Unknown/unavailable synthesizer(s): ${bad.join(", ")}`);
  return wanted as UnifiedBriefSynthesizer[];
}

function selectDemos(demosRaw: string, startDemo: string): DemoHarnessCase[] {
  let cases = [...DEMO_HARNESS_CASES];
  if (demosRaw) {
    const wanted = demosRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const byId = new Map<string, DemoHarnessCase>(cases.map((c) => [c.id, c]));
    const missing = wanted.filter((id) => !byId.has(id));
    if (missing.length) {
      throw new Error(`Unknown demo id(s): ${missing.join(", ")}`);
    }
    cases = wanted.map((id) => byId.get(id)!);
  }
  if (startDemo) {
    const idx = cases.findIndex((c) => c.id === startDemo);
    if (idx < 0) throw new Error(`start-demo not in selected set: ${startDemo}`);
    cases = cases.slice(idx);
  }
  return cases;
}

function buildIntakeFromDemo(demo: DemoHarnessCase, decisionId: string): DecisionIntake {
  const base = {
    decision_id: decisionId,
    situation: demo.situation,
    constraints: demo.constraints,
    knowns_assumptions: demo.knowns_assumptions,
    unknowns: demo.unknowns,
  };
  if (demo.posture === "pressure_test" || demo.posture === "show_opposition") {
    return {
      ...base,
      posture: demo.posture,
      leaning_direction: demo.leaning_direction ?? "",
    };
  }
  return {
    ...base,
    posture: demo.posture,
  };
}

function configuredProviders(filter?: string): LLMProviderName[] {
  const envMap: Record<LLMProviderName, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    xai: "XAI_API_KEY",
  };
  let list = ALL_LLM_PROVIDERS.filter((p) => Boolean(process.env[envMap[p]]?.trim()));
  if (filter) {
    const wanted = new Set(
      filter
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    list = list.filter((p) => wanted.has(p));
  }
  return list;
}

function defaultClarificationQuestions(): LensQuestion[] {
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

function extractClarificationQuestions(lensOutputs: LensOutput[]): LensQuestion[] {
  const qs = lensOutputs.flatMap((o) => o.questions_to_answer_next ?? []);
  return qs.length > 0 ? qs : defaultClarificationQuestions();
}

function isStubBrief(brief: { summary?: string; recommendation?: string; key_considerations?: unknown[]; next_steps?: unknown[] }) {
  return (
    brief.summary === "Pending implementation" &&
    brief.recommendation === "Pending implementation" &&
    (brief.key_considerations?.length ?? 0) === 0 &&
    (brief.next_steps?.length ?? 0) === 0
  );
}

function modeKey(synthesizer: string, mode: UnifiedBriefAuthorshipMode) {
  return `${synthesizer}:${mode}`;
}

async function buildIntakeRun(
  intake: DecisionIntake,
  provider: LLMProviderName,
  userId: string | undefined,
  demo: DemoHarnessCase,
  demoIndex: number,
  harnessRunNumber: number,
  harnessBatchId: string
): Promise<DecisionRunResult> {
  const run_id = randomUUID();
  demoLog(demo, `intake lenses → ${provider}`);
  const [risk, reversibility, people] = await Promise.all([
    runRiskLens(intake, [], provider),
    runReversibilityLens(intake, [], provider),
    runPeopleLens(intake, [], provider),
  ]);
  const lens_outputs: LensOutput[] = [risk, reversibility, people];
  const clarification_questions = extractClarificationQuestions(lens_outputs);

  let decision_title: string | undefined;
  try {
    decision_title = (await runDecisionTitle(intake, lens_outputs, provider)).trim() || undefined;
  } catch (err) {
    demoLog(demo, `decision_title failed (${provider})`, errMessage(err));
  }

  const result: DecisionRunResult = {
    decision_id: intake.decision_id,
    run_id,
    status: "awaiting_clarification",
    intake,
    clarification_questions,
    clarification_needed: true,
    clarifications: [],
    lens_outputs,
    lens_outputs_first_draft: lens_outputs,
    llm_provider: provider,
    demo_scenario_id: demo.id,
    harness_run: true,
    harness_run_number: harnessRunNumber,
    harness_batch_id: harnessBatchId,
    harness_kind: "multi-demo-authorship",
    harness_trial: demoIndex,
    ...(decision_title ? { decision_title } : {}),
    ...(userId ? { user_id: userId } : {}),
  };
  await insertRun(result);
  return result;
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
      clarificationAnswers[`${q.lens}-${q.question_id}`] = answersByEntryId[entryId]!;
    }
  }
  return buildClarificationAnswersForSubmit(questions, clarificationAnswers);
}

async function applyClarificationToRun(
  run: DecisionRunResult,
  answers: ClarificationAnswer[],
  demo: DemoHarnessCase
): Promise<DecisionRunResult> {
  const clarification: Clarification = {
    decision_id: run.decision_id,
    run_id: run.run_id,
    clarification_round: 1,
    answers,
  };
  if (!run.lens_outputs_first_draft?.length && run.lens_outputs?.length) {
    run.lens_outputs_first_draft = run.lens_outputs;
    if (run.decision_brief) run.decision_brief_first_draft = run.decision_brief;
  }
  run.clarifications = [...(run.clarifications ?? []), clarification];
  run.status = "processing_clarification";

  const provider = run.llm_provider ?? "openai";
  demoLog(demo, `clarification lenses+brief → ${provider}`);
  const [risk, reversibility, people] = await Promise.all([
    runRiskLens(run.intake, run.clarifications, provider),
    runReversibilityLens(run.intake, run.clarifications, provider),
    runPeopleLens(run.intake, run.clarifications, provider),
  ]);
  const lens_outputs: LensOutput[] = [risk, reversibility, people];
  let decision_brief = await runBriefSynthesis(
    run.intake,
    lens_outputs,
    run.clarifications,
    provider
  );
  const stableTitle = run.decision_title?.trim();
  if (stableTitle) decision_brief = { ...decision_brief, title: stableTitle };
  decision_brief = ensureBriefGeneratedAt(decision_brief);

  run.lens_outputs = lens_outputs;
  run.decision_brief = decision_brief;
  run.status = isStubBrief(decision_brief) ? "pending_brief" : "complete";
  run.clarification_needed = false;
  await replaceRun(run.run_id, run);
  return run;
}

async function createVariant(
  run: DecisionRunResult,
  demo: DemoHarnessCase
): Promise<void> {
  const formatInstruction = resolveVariantFormatInstruction(demo.variantPrompt);
  if (!formatInstruction) throw new Error("Could not resolve variant format instruction");
  const provider = run.llm_provider ?? "openai";
  demoLog(demo, `variant → ${provider}`);
  const [risk, reversibility, people] = await Promise.all([
    runRiskLens(run.intake, run.clarifications, provider),
    runReversibilityLens(run.intake, run.clarifications, provider),
    runPeopleLens(run.intake, run.clarifications, provider),
  ]);
  const lensOutputs: LensOutput[] = [risk, reversibility, people];
  let brief = await runBriefSynthesis(
    run.intake,
    lensOutputs,
    run.clarifications,
    provider,
    formatInstruction
  );

  const requestedSection =
    brief.custom_sections?.find((s) => s.heading?.trim() && s.content?.trim()) ??
    brief.custom_sections?.[0] ??
    null;
  const safeRequestedSection =
    requestedSection?.heading?.trim() && requestedSection?.content?.trim()
      ? requestedSection
      : {
          heading:
            formatInstruction.length > 60
              ? `${formatInstruction.slice(0, 60)}…`
              : formatInstruction,
          content:
            "This section is based on your request. The content could not be generated automatically—consider editing the brief to add the details.",
        };

  const sourceSections = (run.decision_brief?.custom_sections ?? []).filter(
    (s) => s.heading?.trim() && s.content?.trim()
  );
  const requestedHeadingKey = safeRequestedSection.heading.trim().toLowerCase();
  const dedupedSourceSections = sourceSections.filter(
    (s) => s.heading.trim().toLowerCase() !== requestedHeadingKey
  );
  brief = {
    ...brief,
    custom_sections: [...dedupedSourceSections, safeRequestedSection],
  };

  const variant: RunVariant = {
    variant_id: randomUUID(),
    label: "With Comparison Matrix",
    format_instruction: formatInstruction,
    lens_outputs: lensOutputs,
    decision_brief: {
      ...brief,
      custom_sections: [...(brief.custom_sections ?? [])],
    },
    created_at: new Date().toISOString(),
  };

  const fresh = (await getRun(run.run_id)) ?? run;
  await replaceRun(run.run_id, {
    ...fresh,
    variants: [...(fresh.variants ?? []), variant],
    synthesis: undefined,
  });
}

async function createResearch(
  run: DecisionRunResult,
  demo: DemoHarnessCase
): Promise<void> {
  const provider = run.llm_provider ?? "openai";
  demoLog(demo, `research → ${provider}`);
  const client = getClient(provider);
  // Match chat research: web search is incompatible with forced JSON MIME / json_object
  // on OpenAI search models and Gemini grounding. Ask for prose + RESEARCH_SECTIONS_JSON trailer.
  const researchWebSearchEnabled = process.env.DECISION_COPILOT_DISABLE_RESEARCH_WEB_SEARCH !== "1";

  const system = `You are a research assistant for a decision-support product.

**Live web:** ${
    researchWebSearchEnabled
      ? "You may use real-time web search. Cite URLs when you rely on them."
      : "You cannot browse the web. Do not fabricate URLs; suggest search queries instead."
  }

## Research reply format (required)
**Part 1 — Main answer (markdown):** Complete findings, reasoning, caveats. Primary write-up.

**Part 2:** On its own line, output exactly:
RESEARCH_SECTIONS_JSON
Then one raw JSON object (no markdown fence):
{"title":"3-5 word label","summary":"one sentence bottom line (max 20 words)","sections":[{"heading":"short title","body":"markdown or plain text"}]}

Use sections only for extras not already in Part 1. If none, use "sections":[].`;

  const user = `## Decision context (abbreviated)

Situation: ${run.intake.situation.slice(0, 2500)}
Constraints: ${run.intake.constraints.slice(0, 1200)}
Leaning: ${run.intake.leaning_direction ?? "(none)"}

## Research request
[${demo.researchStarter.group_title} · ${demo.researchStarter.label}]
${demo.researchStarter.prompt}`;

  const responseOpts = {
    temperature: 0.35,
    // Fable adaptive thinking counts against max_tokens; 4096 emptied research on every trial.
    maxTokens: provider === "anthropic" ? 16_384 : researchWebSearchEnabled ? 8192 : 4096,
    enableWebSearch: researchWebSearchEnabled,
    ...(provider === "anthropic" || provider === "gemini" ? { effort: "low" as const } : {}),
    // Do NOT set preferJsonObject / schema with web search — providers reject that combo.
  };

  let response = await client.run(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseOpts
  );

  let fullAnswerText =
    splitResearchStructuredResponse(response.content).displayContent.trim() ||
    response.content.trim();
  if (!isMeaningfulResearchText(fullAnswerText)) {
    demoLog(
      demo,
      `research empty/truncated (${provider}, finishReason=${response.meta?.finishReason ?? "unknown"}); retrying once`
    );
    response = await client.run(
      [
        { role: "system", content: system },
        { role: "user", content: user },
        {
          role: "user",
          content:
            "Your previous reply was empty or cut off. Reply again with a complete Part 1 markdown answer " +
            "and a closed RESEARCH_SECTIONS_JSON object. Keep Part 1 focused (not encyclopedic) so it finishes.",
        },
      ],
      {
        ...responseOpts,
        maxTokens: Math.max(responseOpts.maxTokens, 16_384),
        temperature: 0.25,
      }
    );
    fullAnswerText =
      splitResearchStructuredResponse(response.content).displayContent.trim() ||
      response.content.trim();
  }

  const { displayContent, supplementarySections, jsonTrailerOk, title: researchTitle, summary } =
    splitResearchStructuredResponse(response.content);
  fullAnswerText = displayContent.trim() || response.content.trim();
  if (!isMeaningfulResearchText(fullAnswerText)) {
    throw new Error(
      `Research returned empty content (finishReason=${response.meta?.finishReason ?? "unknown"})`
    );
  }

  const mainProse = displayContent.trim();
  const sectionsToStore = jsonTrailerOk
    ? clampResearchSections(supplementarySections ?? [])
    : clampResearchSections(fallbackResearchSections(fullAnswerText));
  const summaryLine = summary ?? (mainProse ? deriveSummaryFromText(mainProse) : deriveSummaryFromText(fullAnswerText));

  const research_id = randomUUID();
  const entry: ResearchCompletion = {
    research_id,
    label: demo.researchStarter.label,
    group_title: demo.researchStarter.group_title,
    title: researchTitle || demo.researchStarter.label,
    ...(summaryLine ? { summary: summaryLine } : {}),
    completed_at: new Date().toISOString(),
    ...(sectionsToStore.length > 0 ? { sections: sectionsToStore } : {}),
    ...(jsonTrailerOk && isMeaningfulResearchText(mainProse)
      ? { main_answer: mainProse }
      : { main_answer: fullAnswerText }),
  };

  const fresh = (await getRun(run.run_id)) ?? run;
  const chatSummary =
    entry.summary ??
    (entry.main_answer ? deriveSummaryFromText(entry.main_answer) : demo.researchStarter.label) ??
    demo.researchStarter.label;
  await replaceRun(run.run_id, {
    ...fresh,
    research_completions: [...(fresh.research_completions ?? []), entry],
    chat_messages: [
      ...(fresh.chat_messages ?? []),
      {
        role: "user",
        content: `[Research: ${demo.researchStarter.label}]\n${demo.researchStarter.prompt}`,
      },
      {
        role: "assistant",
        content: chatSummary,
        research_completion_id: research_id,
      },
    ],
  });
}

/** Run async tasks with a max in-flight count; preserves result order. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Serialize authorship merges for unified briefs on one decision. */
function createWriteQueue() {
  let chain: Promise<void> = Promise.resolve();
  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}

async function synthesizeUnifiedBrief(
  decisionId: string,
  synthesizer: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode,
  demo: DemoHarnessCase
): Promise<{ brief: Awaited<ReturnType<typeof runBestOfWorldsBriefSynthesis>>; persistRunId: string }> {
  const allRuns = await getRunsByDecisionId(decisionId);
  const persistRun = pickPersistRunForUnifiedBrief(allRuns);
  if (!persistRun) throw new Error("No persist run for unified brief");
  const canonicalRuns = canonicalRunsForUnifiedBriefDecision(allRuns);
  const eligible = canonicalRuns.filter(runHasAnalysisForUnifiedBrief);
  if (eligible.length === 0) throw new Error("No eligible runs with analysis");

  demoLog(demo, `unified brief (LLM) → ${synthesizer} / ${mode}`);
  const brief = await runBestOfWorldsBriefSynthesis(
    persistRun,
    eligible,
    allRuns,
    synthesizer,
    mode
  );
  return { brief, persistRunId: persistRun.run_id };
}

async function writeUnifiedBrief(
  decisionId: string,
  persistRunId: string,
  synthesizer: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode,
  brief: Awaited<ReturnType<typeof runBestOfWorldsBriefSynthesis>>,
  demo: DemoHarnessCase
): Promise<void> {
  demoLog(demo, `unified brief (write) → ${synthesizer} / ${mode}`);
  const fresh = (await getRun(persistRunId)) ?? (await getRunsByDecisionId(decisionId))[0];
  if (!fresh) throw new Error("Persist run missing for brief write");
  const latest = await getRunsByDecisionId(decisionId);
  const consolidated = consolidateUnifiedAuthorshipOntoRun(fresh, latest);
  const updated = mergeUnifiedBriefIntoRun(consolidated, synthesizer, brief, mode);
  await replaceRun(persistRunId, updated);
}

async function synthesizeContributions(
  decisionId: string,
  synthesizer: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode,
  demo: DemoHarnessCase
): Promise<{
  contributions: Awaited<ReturnType<typeof runUnifiedBriefContributionsAnalysis>>;
  brief: NonNullable<ReturnType<typeof findUnifiedBriefAcrossRuns>>["brief"];
  persistRunId: string;
}> {
  const allRuns = await getRunsByDecisionId(decisionId);
  const persistRun = pickPersistRunForUnifiedBrief(allRuns);
  if (!persistRun) throw new Error("No persist run for contributions");
  const found = findUnifiedBriefAcrossRuns(allRuns, synthesizer, mode);
  if (!found) throw new Error(`No ${mode} brief for ${synthesizer}`);
  const canonicalRuns = canonicalRunsForUnifiedBriefDecision(allRuns);
  const eligible = canonicalRuns.filter(runHasAnalysisForUnifiedBrief);

  demoLog(demo, `contributions (LLM) → ${synthesizer} / ${mode}`);
  const contributions = await runUnifiedBriefContributionsAnalysis(
    persistRun,
    eligible,
    found.brief,
    allRuns,
    synthesizer,
    mode
  );
  return { contributions, brief: found.brief, persistRunId: persistRun.run_id };
}

async function writeContributions(
  decisionId: string,
  persistRunId: string,
  synthesizer: UnifiedBriefSynthesizer,
  mode: UnifiedBriefAuthorshipMode,
  brief: NonNullable<ReturnType<typeof findUnifiedBriefAcrossRuns>>["brief"],
  contributions: Awaited<ReturnType<typeof runUnifiedBriefContributionsAnalysis>>,
  demo: DemoHarnessCase
): Promise<void> {
  demoLog(demo, `contributions (write) → ${synthesizer} / ${mode}`);
  const fresh = (await getRun(persistRunId)) ?? (await getRunsByDecisionId(decisionId))[0];
  if (!fresh) throw new Error("Persist run missing for contributions write");
  const latest = await getRunsByDecisionId(decisionId);
  let base = consolidateUnifiedAuthorshipOntoRun(fresh, latest);
  base = mergeUnifiedBriefIntoRun(base, synthesizer, brief, mode);
  const updated = mergeUnifiedBriefContributionsIntoRun(base, synthesizer, contributions, mode);
  await replaceRun(persistRunId, updated);
}

async function runDemoCase(
  demo: DemoHarnessCase,
  demoIndex: number,
  providers: LLMProviderName[],
  synthesizers: UnifiedBriefSynthesizer[],
  userId: string | undefined,
  harnessRunNumber: number,
  harnessBatchId: string
): Promise<DemoReport> {
  const decision_id = randomUUID();
  const report: DemoReport = {
    demo_index: demoIndex,
    demo_id: demo.id,
    demo_label: demo.label,
    decision_id,
    run_ids: {},
    failed_intake: [],
    clarification: { ok: false, error: "not started" },
    variants: {},
    research: {},
    briefs: {},
    contributions: {},
    started_at: new Date().toISOString(),
  };
  const writeQueue = createWriteQueue();

  demoLog(demo, `======== START · harness run ${harnessRunNumber} · decision ${decision_id} ========`);

  const intake = buildIntakeFromDemo(demo, decision_id);

  // 1) Intake (providers already parallel via runForProviders)
  const { runs, failed_providers } = await runForProviders(providers, (p) =>
    buildIntakeRun(intake, p, userId, demo, demoIndex, harnessRunNumber, harnessBatchId)
  );
  report.failed_intake = failed_providers;
  for (const r of runs) {
    if (r.llm_provider) report.run_ids[r.llm_provider] = r.run_id;
  }
  if (runs.length === 0) {
    report.clarification = { ok: false, error: "All intake providers failed" };
    report.finished_at = new Date().toISOString();
    return report;
  }
  demoLog(demo, `intake ok: ${runs.map((r) => r.llm_provider).join(", ")}`);

  // 2) Clarification samples + parallel re-analysis
  try {
    const allRuns = await getRunsByDecisionId(decision_id);
    const combined = listCombinedClarificationQuestions(allRuns);
    const dedupe = await dedupeClarificationQuestionsWithGemini(combined);
    demoLog(
      demo,
      `clarification dedupe: ${dedupe.original_count} → ${dedupe.unique_count} (${dedupe.dedupe_method})`
    );

    const uniqueAsLens: LensQuestion[] = dedupe.unique.map((g) => ({
      question_id: g.entry_ids[0]!,
      lens: g.lens,
      question_text: g.question_text,
      answer_type: g.answer_type,
      options: g.options,
      required: g.required,
    }));
    const demoQuestions = buildDemoSampleQuestions(uniqueAsLens);
    const samples = await generateClarificationDemoSamplesWithGemini(
      {
        situation: intake.situation,
        constraints: intake.constraints,
        posture: intake.posture,
        knowns_assumptions: intake.knowns_assumptions,
        unknowns: intake.unknowns,
      },
      demoQuestions,
      demo.clarificationHint
    );
    demoLog(demo, `clarification samples: ${samples.demo_method} via ${samples.demo_model}`);

    const answersByEntryId: Record<string, string | number | boolean> = {};
    for (const g of dedupe.unique) {
      const repId = g.entry_ids[0]!;
      const sampleKey = `${g.lens}-${repId}`;
      const value = samples.answers[sampleKey];
      if (value === undefined) continue;
      for (const entryId of g.entry_ids) {
        answersByEntryId[entryId] = value;
      }
    }

    const awaiting = getAwaitingClarificationRuns(await getRunsByDecisionId(decision_id));
    demoLog(demo, `clarification re-analysis × ${awaiting.length} providers (parallel)`);
    const clarifySettled = await Promise.allSettled(
      awaiting.map(async (run) => {
        const answers = buildRunAnswersFromCombined(run, answersByEntryId);
        await applyClarificationToRun(run, answers, demo);
      })
    );
    const clarifyFail = clarifySettled.find((s) => s.status === "rejected");
    if (clarifyFail && clarifyFail.status === "rejected") {
      throw clarifyFail.reason instanceof Error
        ? clarifyFail.reason
        : new Error(String(clarifyFail.reason));
    }
    report.clarification = {
      ok: true,
      demo_method: samples.demo_method,
      demo_model: samples.demo_model,
    };
  } catch (err) {
    const message = errMessage(err);
    report.clarification = { ok: false, error: message };
    demoLog(demo, `clarification FAILED`, message);
    report.finished_at = new Date().toISOString();
    return report;
  }

  // 3) Variant + research in parallel across providers (each provider does both)
  const completed = (await getRunsByDecisionId(decision_id)).filter(
    (r) =>
      !r.freeform_output &&
      (r.status === "complete" || r.status === "pending_brief") &&
      r.llm_provider &&
      providers.includes(r.llm_provider)
  );
  demoLog(demo, `variants + research × ${completed.length} providers (parallel)`);
  await Promise.all(
    completed.map(async (run) => {
      const p = run.llm_provider!;
      try {
        await createVariant(run, demo);
        report.variants[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.variants[p] = { ok: false, error: message };
        demoLog(demo, `variant FAILED (${p})`, message);
      }
      try {
        const fresh = (await getRun(run.run_id)) ?? run;
        await createResearch(fresh, demo);
        report.research[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.research[p] = { ok: false, error: message };
        demoLog(demo, `research FAILED (${p})`, message);
      }
    })
  );

  // 4) Unified briefs: all synthesizer×mode LLM calls in parallel, writes serialized
  const briefJobs = AUTHORSHIP_MODES.flatMap((mode) =>
    synthesizers.map((synthesizer) => ({ synthesizer, mode, key: modeKey(synthesizer, mode) }))
  );
  demoLog(demo, `unified briefs LLM × ${briefJobs.length} (parallel); writes queued`);
  const briefSettled = await Promise.all(
    briefJobs.map(async ({ synthesizer, mode, key }) => {
      try {
        const { brief, persistRunId } = await synthesizeUnifiedBrief(
          decision_id,
          synthesizer,
          mode,
          demo
        );
        await writeQueue(() =>
          writeUnifiedBrief(decision_id, persistRunId, synthesizer, mode, brief, demo)
        );
        report.briefs[key] = { ok: true };
        return { key, ok: true as const };
      } catch (err) {
        const message = errMessage(err);
        report.briefs[key] = { ok: false, error: message };
        report.contributions[key] = { ok: false, error: "skipped (brief failed)" };
        demoLog(demo, `brief FAILED (${key})`, message);
        return { key, ok: false as const };
      }
    })
  );

  // 5) Contributions: parallel LLM for briefs that succeeded; writes serialized
  const contribJobs = briefSettled
    .filter((r) => r.ok)
    .map((r) => {
      const [synthesizer, mode] = r.key.split(":") as [UnifiedBriefSynthesizer, UnifiedBriefAuthorshipMode];
      return { synthesizer, mode, key: r.key };
    });
  demoLog(demo, `contributions LLM × ${contribJobs.length} (parallel); writes queued`);
  await Promise.all(
    contribJobs.map(async ({ synthesizer, mode, key }) => {
      try {
        const { contributions, brief, persistRunId } = await synthesizeContributions(
          decision_id,
          synthesizer,
          mode,
          demo
        );
        await writeQueue(() =>
          writeContributions(decision_id, persistRunId, synthesizer, mode, brief, contributions, demo)
        );
        report.contributions[key] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.contributions[key] = { ok: false, error: message };
        demoLog(demo, `contributions FAILED (${key})`, message);
      }
    })
  );

  report.finished_at = new Date().toISOString();
  demoLog(demo, `======== DONE · open UI: /run/best-of-worlds?decision_id=${decision_id}`);
  return report;
}

function stubDemoFromPersist(persist: DecisionRunResult): DemoHarnessCase {
  const id = persist.demo_scenario_id ?? "unknown";
  const known = DEMO_HARNESS_CASES.find((c) => c.id === id);
  if (known) return known;
  // Minimal stub for logging only — fill path never uses researchStarter.
  return DEMO_HARNESS_CASES[0]!;
}

/**
 * Backfill missing Unified Brief + contributions for an existing decision
 * (does not re-run intake / clarification / variants).
 */
async function fillMissingBriefsForDecision(
  decisionId: string,
  synthesizers: UnifiedBriefSynthesizer[],
  modes: UnifiedBriefAuthorshipMode[],
  force: boolean
): Promise<{
  decision_id: string;
  demo_id: string;
  filled: string[];
  skipped: string[];
  failed: string[];
}> {
  const allRuns = await getRunsByDecisionId(decisionId);
  const persist = pickPersistRunForUnifiedBrief(allRuns);
  if (!persist) throw new Error(`No persist run for decision ${decisionId}`);
  const demo = stubDemoFromPersist(persist);
  const writeQueue = createWriteQueue();
  const filled: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  log(`fill-decision ${decisionId} (${demo.id}) · ${synthesizers.join(",")} × ${modes.join(",")}`);

  for (const synthesizer of synthesizers) {
    for (const mode of modes) {
      const key = modeKey(synthesizer, mode);
      const latestRuns = await getRunsByDecisionId(decisionId);
      const latestPersist = pickPersistRunForUnifiedBrief(latestRuns) ?? persist;
      const existingBrief = getUnifiedBriefForAuthor(latestPersist, synthesizer, mode);
      const existingContrib = getUnifiedBriefContributionsByAuthor(latestPersist, mode)[synthesizer];

      if (existingBrief && existingContrib && !force) {
        skipped.push(key);
        log(`  skip ${key} (already present)`);
        continue;
      }

      try {
        if (!existingBrief || force) {
          const { brief, persistRunId } = await synthesizeUnifiedBrief(
            decisionId,
            synthesizer,
            mode,
            demo
          );
          await writeQueue(() =>
            writeUnifiedBrief(decisionId, persistRunId, synthesizer, mode, brief, demo)
          );
        }
        const { contributions, brief, persistRunId } = await synthesizeContributions(
          decisionId,
          synthesizer,
          mode,
          demo
        );
        await writeQueue(() =>
          writeContributions(decisionId, persistRunId, synthesizer, mode, brief, contributions, demo)
        );
        filled.push(key);
        log(`  filled ${key}`);
      } catch (err) {
        const message = errMessage(err);
        failed.push(key);
        log(`  FAILED ${key}`, message);
      }
    }
  }

  return {
    decision_id: decisionId,
    demo_id: demo.id,
    filled,
    skipped,
    failed,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const providers = configuredProviders(args.providersRaw || undefined);
  if (providers.length === 0) {
    console.error("No providers configured (need API keys). Aborting.");
    process.exit(1);
  }

  const synthesizersAvailable = UNIFIED_BRIEF_SYNTHESIZERS.filter((s) =>
    providers.includes(s)
  ) as UnifiedBriefSynthesizer[];

  if (args.fillDecisionRaw) {
    const decisionIds = args.fillDecisionRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    let modes: UnifiedBriefAuthorshipMode[];
    let synthesizers: UnifiedBriefSynthesizer[];
    try {
      modes = parseModesFilter(args.modesRaw);
      synthesizers = parseSynthesizersFilter(args.synthesizersRaw, synthesizersAvailable);
    } catch (err) {
      console.error(errMessage(err));
      process.exit(1);
    }
    log("Multi-demo authorship fill-decision");
    log(`  decisions: ${decisionIds.join(", ")}`);
    log(`  synthesizers: ${synthesizers.join(", ")}`);
    log(`  modes: ${modes.join(", ")}`);
    log(`  force: ${args.force}`);

    const results = [];
    for (const decisionId of decisionIds) {
      try {
        results.push(await fillMissingBriefsForDecision(decisionId, synthesizers, modes, args.force));
      } catch (err) {
        log(`fill-decision ${decisionId} crashed`, errMessage(err));
        results.push({
          decision_id: decisionId,
          demo_id: "?",
          filled: [] as string[],
          skipped: [] as string[],
          failed: ["(crashed)"],
        });
      }
    }
    console.log("\n======== Fill summary ========");
    for (const r of results) {
      console.log(
        `${r.demo_id} ${r.decision_id}: filled=${r.filled.length} skipped=${r.skipped.length} failed=${r.failed.length}` +
          (r.filled.length ? ` [${r.filled.join(", ")}]` : "") +
          (r.failed.length ? ` FAILED[${r.failed.join(", ")}]` : "")
      );
    }
    if (results.some((r) => r.failed.length)) process.exit(1);
    return;
  }

  const synthesizers = synthesizersAvailable;

  let userId: string | undefined;
  if (args.userEmail) {
    const user = await findUserByEmail(args.userEmail);
    if (!user) {
      console.error(`HARNESS_USER_EMAIL=${args.userEmail} not found in auth table. Aborting.`);
      process.exit(1);
    }
    userId = user.id;
    log(`Attaching runs to user ${args.userEmail} (${userId})`);
  } else {
    log("No HARNESS_USER_EMAIL — runs will persist but may not appear under My Decisions.");
  }

  let demos: DemoHarnessCase[];
  try {
    demos = selectDemos(args.demosRaw, args.startDemo);
  } catch (err) {
    console.error(errMessage(err));
    process.exit(1);
  }
  if (demos.length === 0) {
    console.error("No demos selected. Aborting.");
    process.exit(1);
  }

  const demoConcurrency = Math.max(1, Math.floor(args.demoConcurrency) || 1);
  const expectedBriefs = demos.length * synthesizers.length * AUTHORSHIP_MODES.length;

  log("Multi-demo authorship harness");
  log(`  demos: ${demos.length} — ${demos.map((d) => d.id).join(", ")}`);
  log(`  demo concurrency: ${demoConcurrency}`);
  log(`  providers: ${providers.join(", ")}`);
  log(`  synthesizers: ${synthesizers.join(", ")}`);
  log(`  authorship modes: ${AUTHORSHIP_MODES.join(", ")}`);
  log(`  expected Unified Briefs: ${expectedBriefs} (${demos.length}×${synthesizers.length}×${AUTHORSHIP_MODES.length})`);
  log(`  parallelism: demos×${demoConcurrency} + providers + briefs/contribs; writes queued per demo`);

  const parsedRunNumber = Number(args.runNumberRaw);
  const harnessRunNumber =
    Number.isFinite(parsedRunNumber) && parsedRunNumber >= 1
      ? Math.floor(parsedRunNumber)
      : await nextHarnessRunNumber(userId);
  const harnessBatchId = args.batchIdRaw || randomUUID();
  log(`  harness run number: ${harnessRunNumber}`);
  log(`  harness batch id: ${harnessBatchId}`);
  log(`  harness kind: multi-demo-authorship`);

  const reports = await mapPool(demos, demoConcurrency, async (demo, i) => {
    try {
      return await runDemoCase(demo, i + 1, providers, synthesizers, userId, harnessRunNumber, harnessBatchId);
    } catch (err) {
      const message = errMessage(err);
      log(`Demo ${demo.id} crashed`, message);
      return {
        demo_index: i + 1,
        demo_id: demo.id,
        demo_label: demo.label,
        decision_id: "(crashed)",
        run_ids: {},
        failed_intake: [],
        clarification: { ok: false, error: message },
        variants: {},
        research: {},
        briefs: {},
        contributions: {},
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      } satisfies DemoReport;
    }
  });
  reports.sort((a, b) => a.demo_index - b.demo_index);

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `multi-demo-authorship-harness-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  await writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        harness: "multi-demo-authorship",
        harness_kind: "multi-demo-authorship",
        harness_batch_id: harnessBatchId,
        harness_run_number: harnessRunNumber,
        demos: demos.map((d) => ({ id: d.id, label: d.label })),
        providers,
        synthesizers,
        authorship_modes: AUTHORSHIP_MODES,
        expected_unified_briefs: expectedBriefs,
        reports,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("\n======== Summary ========");
  let briefOkTotal = 0;
  let briefTotalAll = 0;
  for (const r of reports) {
    const briefOk = Object.values(r.briefs).filter((x) => x.ok).length;
    const briefTotal = Object.keys(r.briefs).length;
    briefOkTotal += briefOk;
    briefTotalAll += briefTotal;
    const contribOk = Object.values(r.contributions).filter((x) => x.ok).length;
    console.log(
      `${r.demo_index}. ${r.demo_id}: decision_id=${r.decision_id}  clarification=${r.clarification.ok ? "ok" : "FAIL"}  briefs=${briefOk}/${briefTotal}  contrib=${contribOk}/${briefTotal}`
    );
    if (r.decision_id !== "(crashed)") {
      console.log(`  → http://localhost:5001/run/best-of-worlds?decision_id=${r.decision_id}`);
    }
  }
  console.log(`\nUnified Briefs: ${briefOkTotal}/${briefTotalAll} (expected ${expectedBriefs})`);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
