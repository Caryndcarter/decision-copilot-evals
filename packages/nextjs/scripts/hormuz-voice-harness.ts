/**
 * Hormuz Decision Battery multi-case harness (Cases 1–5)
 *
 * Runs each Hormuz voice/framing case once across all configured
 * providers. Standard decision path only (no Unified Briefs / contributions):
 *   1. Intake × providers
 *   2. Clarification demo answers → re-run lenses + briefs
 *   3. Fixed variant + fixed research per case
 *
 * Expected: 5 cases × 4 providers = 20 runs (when all API keys are set).
 *
 * From repo root (MongoDB Atlas via MONGODB_URI / DB_NAME):
 *   npm run harness:hormuz
 *
 * Env / flags:
 *   HARNESS_USER_EMAIL=you@example.com
 *   HARNESS_PROVIDERS=openai,anthropic,gemini,xai
 *   HARNESS_CASE_CONCURRENCY=0   # cases in parallel (default 0 = all; set 1 for sequential)
 *   HARNESS_RUN_NUMBER=N         # optional; default = max existing + 1 for that user
 *   --cases=hormuz-shipping-company-voice,hormuz-false-urgency
 *   --fill-decision=<uuid>[,uuid…]   # add missing --providers into existing decisions
 *   --user-email=... --providers=... --case-concurrency=2 --run-number=3
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  insertRun,
  getRun,
  getRunsByDecisionId,
  replaceRun,
  nextHarnessRunNumber,
} from "../lib/db/runs";
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
import {
  HORMUZ_VOICE_CASES,
  hormuzVoiceCaseById,
  type HormuzVoiceCase,
} from "../lib/hormuz-voice-cases";
import { modelIdForProvider } from "../lib/harness-provider-models";
import { runRiskLens, runReversibilityLens, runPeopleLens } from "../lenses";
import { runBriefSynthesis } from "../lenses/brief";
import { runDecisionTitle } from "../lenses/decision-title";
import { generateClarificationDemoSamplesWithGemini } from "../lenses/clarification-demo-samples";
import { dedupeClarificationQuestionsWithGemini } from "../lenses/clarification-dedupe";
import { getClient } from "../llm";
import {
  postureRequiresLeaning,
  type Clarification,
  type ClarificationAnswer,
  type DecisionIntake,
  type DecisionRunResult,
  type LensOutput,
  type LensQuestion,
  type LLMProviderName,
  type ResearchCompletion,
  type RunVariant,
} from "../types/decision";

type StepResult = { ok: true } | { ok: false; error: string };

type CaseReport = {
  case_id: string;
  case_label: string;
  case_index: number;
  harness_run_number?: number;
  decision_id: string;
  run_ids: Partial<Record<LLMProviderName, string>>;
  failed_intake: { provider: string; message: string }[];
  clarification: StepResult & { demo_method?: string; demo_model?: string };
  variants: Partial<Record<LLMProviderName, StepResult>>;
  research: Partial<Record<LLMProviderName, StepResult>>;
  started_at: string;
  finished_at?: string;
};

function log(msg: string, extra?: unknown) {
  const ts = new Date().toISOString().slice(11, 19);
  if (extra !== undefined) console.log(`[${ts}] ${msg}`, extra);
  else console.log(`[${ts}] ${msg}`);
}

function caseLog(caseIndex: number, caseId: string, msg: string, extra?: unknown) {
  log(`C${caseIndex} ${caseId} ${msg}`, extra);
}

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
    userEmail: (get("user-email") ?? process.env.HARNESS_USER_EMAIL ?? "").trim(),
    providersRaw: (get("providers") ?? process.env.HARNESS_PROVIDERS ?? "").trim(),
    casesRaw: (get("cases") ?? process.env.HARNESS_CASES ?? "").trim(),
    fillDecisionRaw: (get("fill-decision") ?? "").trim(),
    /** How many cases to run at once (default 0 = all selected cases). */
    caseConcurrency: Number(
      get("case-concurrency") ?? process.env.HARNESS_CASE_CONCURRENCY ?? 0
    ),
    /** Explicit batch id; when unset, allocated as max(existing) + 1. */
    runNumberRaw: (get("run-number") ?? process.env.HARNESS_RUN_NUMBER ?? "").trim(),
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

function selectCases(filter?: string): HormuzVoiceCase[] {
  if (!filter) return [...HORMUZ_VOICE_CASES];
  const wanted = new Set(
    filter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return HORMUZ_VOICE_CASES.filter((c) => wanted.has(c.id));
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

function isStubBrief(brief: {
  summary?: string;
  recommendation?: string;
  key_considerations?: unknown[];
  next_steps?: unknown[];
}) {
  return (
    brief.summary === "Pending implementation" &&
    brief.recommendation === "Pending implementation" &&
    (brief.key_considerations?.length ?? 0) === 0 &&
    (brief.next_steps?.length ?? 0) === 0
  );
}

function buildIntakeFromCase(
  c: HormuzVoiceCase,
  decisionId: string
): DecisionIntake {
  const base = {
    decision_id: decisionId,
    situation: c.situation,
    constraints: c.constraints,
    knowns_assumptions: c.knowns_assumptions,
    unknowns: c.unknowns,
  };
  if (postureRequiresLeaning(c.posture)) {
    return {
      ...base,
      posture: c.posture,
      leaning_direction: c.leaning_direction ?? "",
    };
  }
  return {
    ...base,
    posture: c.posture,
  };
}

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

async function buildIntakeRun(
  intake: DecisionIntake,
  provider: LLMProviderName,
  userId: string | undefined,
  caseDef: HormuzVoiceCase,
  caseIndex: number,
  harnessRunNumber: number,
  harnessBatchId: string
): Promise<DecisionRunResult> {
  const run_id = randomUUID();
  caseLog(caseIndex, caseDef.id, `intake lenses → ${provider}`);
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
    caseLog(caseIndex, caseDef.id, `decision_title failed (${provider})`, errMessage(err));
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
    llm_model: modelIdForProvider(provider),
    demo_scenario_id: caseDef.id,
    harness_run: true,
    harness_run_number: harnessRunNumber,
    harness_batch_id: harnessBatchId,
    harness_kind: "hormuz-voice",
    harness_trial: caseIndex,
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
  caseDef: HormuzVoiceCase,
  caseIndex: number
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
  caseLog(caseIndex, caseDef.id, `clarification lenses+brief → ${provider}`);
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
  caseDef: HormuzVoiceCase,
  caseIndex: number
): Promise<void> {
  const formatInstruction = resolveVariantFormatInstruction(caseDef.variantPrompt);
  if (!formatInstruction) throw new Error("Could not resolve variant format instruction");
  const provider = run.llm_provider ?? "openai";
  caseLog(caseIndex, caseDef.id, `variant → ${provider}`);
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
  caseDef: HormuzVoiceCase,
  caseIndex: number
): Promise<void> {
  const provider = run.llm_provider ?? "openai";
  const starter = caseDef.researchStarter;
  caseLog(caseIndex, caseDef.id, `research → ${provider}`);
  const client = getClient(provider);
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
[${starter.group_title} · ${starter.label}]
${starter.prompt}`;

  const responseOpts = {
    temperature: 0.35,
    maxTokens: provider === "anthropic" ? 16_384 : researchWebSearchEnabled ? 8192 : 4096,
    enableWebSearch: researchWebSearchEnabled,
    ...(provider === "anthropic" || provider === "gemini" ? { effort: "low" as const } : {}),
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
    caseLog(
      caseIndex,
      caseDef.id,
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
  const summaryLine =
    summary ??
    (mainProse ? deriveSummaryFromText(mainProse) : deriveSummaryFromText(fullAnswerText));

  const research_id = randomUUID();
  const entry: ResearchCompletion = {
    research_id,
    label: starter.label,
    group_title: starter.group_title,
    title: researchTitle || starter.label,
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
    (entry.main_answer ? deriveSummaryFromText(entry.main_answer) : starter.label) ??
    starter.label;
  await replaceRun(run.run_id, {
    ...fresh,
    research_completions: [...(fresh.research_completions ?? []), entry],
    chat_messages: [
      ...(fresh.chat_messages ?? []),
      {
        role: "user",
        content: `[Research: ${starter.label}]\n${starter.prompt}`,
      },
      {
        role: "assistant",
        content: chatSummary,
        research_completion_id: research_id,
      },
    ],
  });
}

async function runCase(
  caseDef: HormuzVoiceCase,
  caseIndex: number,
  providers: LLMProviderName[],
  userId: string | undefined,
  harnessRunNumber: number,
  harnessBatchId: string
): Promise<CaseReport> {
  const decision_id = randomUUID();
  const report: CaseReport = {
    case_id: caseDef.id,
    case_label: caseDef.label,
    case_index: caseIndex,
    harness_run_number: harnessRunNumber,
    decision_id,
    run_ids: {},
    failed_intake: [],
    clarification: { ok: false, error: "not started" },
    variants: {},
    research: {},
    started_at: new Date().toISOString(),
  };

  caseLog(
    caseIndex,
    caseDef.id,
    `======== START · harness run ${harnessRunNumber} · decision ${decision_id} ========`
  );
  const intake = buildIntakeFromCase(caseDef, decision_id);

  const { runs, failed_providers } = await runForProviders(providers, (p) =>
    buildIntakeRun(intake, p, userId, caseDef, caseIndex, harnessRunNumber, harnessBatchId)
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
  caseLog(caseIndex, caseDef.id, `intake ok: ${runs.map((r) => r.llm_provider).join(", ")}`);

  try {
    const allRuns = await getRunsByDecisionId(decision_id);
    const combined = listCombinedClarificationQuestions(allRuns);
    const dedupe = await dedupeClarificationQuestionsWithGemini(combined);
    caseLog(
      caseIndex,
      caseDef.id,
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
        leaning_direction: intake.leaning_direction,
        knowns_assumptions: intake.knowns_assumptions,
        unknowns: intake.unknowns,
      },
      demoQuestions,
      caseDef.clarificationHint
    );
    caseLog(
      caseIndex,
      caseDef.id,
      `clarification samples: ${samples.demo_method} via ${samples.demo_model}`
    );

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
    caseLog(caseIndex, caseDef.id, `clarification re-analysis × ${awaiting.length}`);
    const clarifySettled = await Promise.allSettled(
      awaiting.map(async (run) => {
        const answers = buildRunAnswersFromCombined(run, answersByEntryId);
        await applyClarificationToRun(run, answers, caseDef, caseIndex);
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
    caseLog(caseIndex, caseDef.id, `clarification FAILED`, message);
    report.finished_at = new Date().toISOString();
    return report;
  }

  const completed = (await getRunsByDecisionId(decision_id)).filter(
    (r) =>
      !r.freeform_output &&
      (r.status === "complete" || r.status === "pending_brief") &&
      r.llm_provider &&
      providers.includes(r.llm_provider)
  );
  caseLog(caseIndex, caseDef.id, `variants + research × ${completed.length}`);
  await Promise.all(
    completed.map(async (run) => {
      const p = run.llm_provider!;
      try {
        await createVariant(run, caseDef, caseIndex);
        report.variants[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.variants[p] = { ok: false, error: message };
        caseLog(caseIndex, caseDef.id, `variant FAILED (${p})`, message);
      }
      try {
        const fresh = (await getRun(run.run_id)) ?? run;
        await createResearch(fresh, caseDef, caseIndex);
        report.research[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.research[p] = { ok: false, error: message };
        caseLog(caseIndex, caseDef.id, `research FAILED (${p})`, message);
      }
    })
  );

  report.finished_at = new Date().toISOString();
  caseLog(
    caseIndex,
    caseDef.id,
    `======== DONE · open UI: /runs?tab=studies (decision ${decision_id})`
  );
  return report;
}

/**
 * Add missing providers into an existing harness decision (same decision_id / UI group).
 * Reuses intake text from a sibling run; runs intake → clarification → variant → research
 * only for providers not already present.
 */
async function fillDecision(
  decision_id: string,
  providers: LLMProviderName[],
  userId: string | undefined
): Promise<CaseReport> {
  const existing = await getRunsByDecisionId(decision_id);
  const primary =
    existing.find((r) => !r.freeform_output && r.intake && r.demo_scenario_id) ??
    existing.find((r) => !r.freeform_output && r.intake);
  if (!primary?.intake || !primary.demo_scenario_id) {
    throw new Error(
      `fill-decision ${decision_id}: no primary harness run with intake/demo_scenario_id`
    );
  }
  const caseDef = hormuzVoiceCaseById(primary.demo_scenario_id);
  if (!caseDef) {
    throw new Error(
      `fill-decision ${decision_id}: unknown demo_scenario_id ${primary.demo_scenario_id}`
    );
  }
  const caseIndex =
    typeof primary.harness_trial === "number" && primary.harness_trial > 0
      ? primary.harness_trial
      : HORMUZ_VOICE_CASES.findIndex((c) => c.id === caseDef.id) + 1;
  const harnessRunNumber =
    typeof primary.harness_run_number === "number" && primary.harness_run_number > 0
      ? primary.harness_run_number
      : await nextHarnessRunNumber(userId ?? primary.user_id);

  const present = new Set(
    existing.map((r) => r.llm_provider).filter((p): p is LLMProviderName => Boolean(p))
  );
  const missing = providers.filter((p) => !present.has(p));
  const report: CaseReport = {
    case_id: caseDef.id,
    case_label: caseDef.label,
    case_index: caseIndex,
    harness_run_number: harnessRunNumber,
    decision_id,
    run_ids: Object.fromEntries(
      existing
        .filter((r) => r.llm_provider && r.run_id)
        .map((r) => [r.llm_provider!, r.run_id])
    ) as Partial<Record<LLMProviderName, string>>,
    failed_intake: [],
    clarification: { ok: false, error: "not started" },
    variants: {},
    research: {},
    started_at: new Date().toISOString(),
  };

  if (missing.length === 0) {
    caseLog(
      caseIndex,
      caseDef.id,
      `fill ${decision_id}: nothing missing for ${providers.join(",")}`
    );
    report.clarification = { ok: true };
    report.finished_at = new Date().toISOString();
    return report;
  }

  caseLog(
    caseIndex,
    caseDef.id,
    `======== FILL · decision ${decision_id} · add ${missing.join(", ")} ========`
  );

  const intake: DecisionIntake = {
    ...primary.intake,
    decision_id,
  };

  const { runs, failed_providers } = await runForProviders(missing, (p) =>
    buildIntakeRun(
      intake,
      p,
      userId ?? primary.user_id,
      caseDef,
      caseIndex,
      harnessRunNumber,
      primary.harness_batch_id ?? randomUUID()
    )
  );
  report.failed_intake = failed_providers;
  for (const r of runs) {
    if (r.llm_provider) report.run_ids[r.llm_provider] = r.run_id;
  }
  if (runs.length === 0) {
    report.clarification = { ok: false, error: "All fill intake providers failed" };
    report.finished_at = new Date().toISOString();
    return report;
  }
  caseLog(caseIndex, caseDef.id, `fill intake ok: ${runs.map((r) => r.llm_provider).join(", ")}`);

  try {
    const awaiting = getAwaitingClarificationRuns(await getRunsByDecisionId(decision_id)).filter(
      (r) => r.llm_provider && missing.includes(r.llm_provider)
    );
    const combined = listCombinedClarificationQuestions(awaiting);
    const dedupe = await dedupeClarificationQuestionsWithGemini(combined);
    caseLog(
      caseIndex,
      caseDef.id,
      `fill clarification dedupe: ${dedupe.original_count} → ${dedupe.unique_count} (${dedupe.dedupe_method})`
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
        leaning_direction: intake.leaning_direction,
        knowns_assumptions: intake.knowns_assumptions,
        unknowns: intake.unknowns,
      },
      demoQuestions,
      caseDef.clarificationHint
    );
    caseLog(
      caseIndex,
      caseDef.id,
      `fill clarification samples: ${samples.demo_method} via ${samples.demo_model}`
    );

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

    caseLog(caseIndex, caseDef.id, `fill clarification re-analysis × ${awaiting.length}`);
    const clarifySettled = await Promise.allSettled(
      awaiting.map(async (run) => {
        const answers = buildRunAnswersFromCombined(run, answersByEntryId);
        await applyClarificationToRun(run, answers, caseDef, caseIndex);
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
    caseLog(caseIndex, caseDef.id, `fill clarification FAILED`, message);
    report.finished_at = new Date().toISOString();
    return report;
  }

  const completed = (await getRunsByDecisionId(decision_id)).filter(
    (r) =>
      !r.freeform_output &&
      (r.status === "complete" || r.status === "pending_brief") &&
      r.llm_provider &&
      missing.includes(r.llm_provider)
  );
  caseLog(caseIndex, caseDef.id, `fill variants + research × ${completed.length}`);
  await Promise.all(
    completed.map(async (run) => {
      const p = run.llm_provider!;
      try {
        await createVariant(run, caseDef, caseIndex);
        report.variants[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.variants[p] = { ok: false, error: message };
        caseLog(caseIndex, caseDef.id, `fill variant FAILED (${p})`, message);
      }
      try {
        const fresh = (await getRun(run.run_id)) ?? run;
        await createResearch(fresh, caseDef, caseIndex);
        report.research[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.research[p] = { ok: false, error: message };
        caseLog(caseIndex, caseDef.id, `fill research FAILED (${p})`, message);
      }
    })
  );

  report.finished_at = new Date().toISOString();
  caseLog(
    caseIndex,
    caseDef.id,
    `======== FILL DONE · open UI: /runs?tab=studies (decision ${decision_id})`
  );
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const providers = configuredProviders(args.providersRaw || undefined);
  if (providers.length === 0) {
    console.error("No providers configured (need API keys). Aborting.");
    process.exit(1);
  }

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

  const fillIds = args.fillDecisionRaw
    ? args.fillDecisionRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (fillIds.length > 0) {
    log("Hormuz fill-decision mode (add missing providers into existing decisions)");
    log(`  decisions: ${fillIds.join(", ")}`);
    log(`  providers to add if missing: ${providers.join(", ")}`);

    const reports: CaseReport[] = [];
    for (const decisionId of fillIds) {
      try {
        reports.push(await fillDecision(decisionId, providers, userId));
      } catch (err) {
        const message = errMessage(err);
        log(`fill-decision ${decisionId} crashed`, message);
        reports.push({
          case_id: "(unknown)",
          case_label: "(unknown)",
          case_index: 0,
          decision_id: decisionId,
          run_ids: {},
          failed_intake: [],
          clarification: { ok: false, error: message },
          variants: {},
          research: {},
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        });
      }
    }

    const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
    await mkdir(outDir, { recursive: true });
    const outPath = path.join(
      outDir,
      `hormuz-fill-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    await writeFile(
      outPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          mode: "fill-decision",
          providers,
          fillIds,
          reports,
        },
        null,
        2
      ),
      "utf8"
    );

    console.log("\n======== Fill Summary ========");
    for (const r of reports) {
      const n = Object.keys(r.run_ids).length;
      const varOk = Object.values(r.variants).filter((x) => x.ok).length;
      const resOk = Object.values(r.research).filter((x) => x.ok).length;
      console.log(
        `C${r.case_index} ${r.case_id}: decision=${r.decision_id} runs=${n} clarification=${r.clarification.ok ? "ok" : "FAIL"} variants=${varOk} research=${resOk}`
      );
      console.log(`  → http://localhost:5001/runs?tab=studies`);
    }
    console.log(`Wrote ${outPath}`);
    return;
  }

  const cases = selectCases(args.casesRaw || undefined);
  if (cases.length === 0) {
    console.error("No cases selected. Check --cases=… against HORMUZ_VOICE_CASES.");
    process.exit(1);
  }

  const caseConcurrency =
    args.caseConcurrency > 0
      ? Math.max(1, Math.floor(args.caseConcurrency))
      : cases.length;

  log("Hormuz battery multi-case harness (standard runs only — no Unified Briefs)");
  log(`  cases: ${cases.map((c) => c.id).join(", ")}`);
  log(`  providers: ${providers.join(", ")}`);
  log(`  expected runs: ${cases.length * providers.length}`);
  log(`  case concurrency: ${caseConcurrency}`);
  log(`  parallelism: cases + providers + variants/research`);

  const parsedRunNumber = Number(args.runNumberRaw);
  const harnessRunNumber =
    Number.isFinite(parsedRunNumber) && parsedRunNumber >= 1
      ? Math.floor(parsedRunNumber)
      : await nextHarnessRunNumber(userId);
  const harnessBatchId = randomUUID();
  log(`  harness run number: ${harnessRunNumber}`);
  log(`  harness batch id: ${harnessBatchId}`);
  log(`  harness kind: hormuz-voice`);

  const reports = await mapPool(cases, caseConcurrency, async (c, i) => {
    const caseIndex =
      HORMUZ_VOICE_CASES.findIndex((x) => x.id === c.id) + 1 || i + 1;
    try {
      return await runCase(c, caseIndex, providers, userId, harnessRunNumber, harnessBatchId);
    } catch (err) {
      const message = errMessage(err);
      log(`Case ${caseIndex} ${c.id} crashed`, message);
      return {
        case_id: c.id,
        case_label: c.label,
        case_index: caseIndex,
        harness_run_number: harnessRunNumber,
        decision_id: "(crashed)",
        run_ids: {},
        failed_intake: [],
        clarification: { ok: false, error: "not started" },
        variants: {},
        research: {},
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      } satisfies CaseReport;
    }
  });
  reports.sort((a, b) => a.case_index - b.case_index);

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `hormuz-harness-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  await writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        harness_run_number: harnessRunNumber,
        providers,
        cases: cases.map((c) => c.id),
        expected_runs: cases.length * providers.length,
        reports,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("\n======== Summary ========");
  console.log(`Study run #${harnessRunNumber}`);
  let runCount = 0;
  for (const r of reports) {
    const n = Object.keys(r.run_ids).length;
    runCount += n;
    const varOk = Object.values(r.variants).filter((x) => x.ok).length;
    const resOk = Object.values(r.research).filter((x) => x.ok).length;
    console.log(
      `C${r.case_index} ${r.case_id}: decision=${r.decision_id} runs=${n} clarification=${r.clarification.ok ? "ok" : "FAIL"} variants=${varOk}/${n} research=${resOk}/${n}`
    );
    if (r.decision_id !== "(crashed)") {
      console.log(`  → http://localhost:5001/runs?tab=studies`);
    }
  }
  console.log(`Total provider runs: ${runCount} (expected ${cases.length * providers.length})`);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(errMessage(err));
  process.exit(1);
});
