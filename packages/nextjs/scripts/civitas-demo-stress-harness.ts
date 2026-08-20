/**
 * Civitas (Meridian) demo stress harness
 *
 * Runs the Meridian / Civitas SaaS roll-up demo end-to-end N times (default 5),
 * persisting to MongoDB so results appear in the UI (My Decisions → Harness tab).
 *
 * Heavy LLM work is parallelized (providers, synthesizer×mode briefs/contributions).
 * Authorship merges are serialized so concurrent briefs don't clobber each other.
 *
 * Per trial:
 *   1. Intake across all configured providers (awaiting clarification)
 *   2. Dedupe questions + Fable demo clarification answers (concrete, not stock)
 *   3. Submit clarifications → re-run lenses + briefs
 *   4. Each provider run: fixed variant + fixed research starter
 *   5. Each synthesizer × open/blind/reassigned: Unified Brief + contributions
 *
 * From repo root (MongoDB Atlas via MONGODB_URI / DB_NAME):
 *   npm run harness:civitas
 *
 * Env / flags:
 *   HARNESS_TRIALS=5
 *   HARNESS_USER_EMAIL=you@example.com   # attach runs to My Decisions → Harness tab
 *   HARNESS_PROVIDERS=openai,anthropic,gemini,xai
 *   HARNESS_TRIAL_CONCURRENCY=2         # cap parallel trials (default = all)
 *   --trial-concurrency=2
 *
 *   --trials=5 --user-email=... --start-trial=1 --providers=openai,gemini
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { insertRun, getRun, getRunsByDecisionId, replaceRun } from "../lib/db/runs";
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
  DemoScenarioId,
  LensOutput,
  LensQuestion,
  LLMProviderName,
  ResearchCompletion,
  RunVariant,
  UnifiedBriefAuthorshipMode,
} from "../types/decision";

const DEMO_SCENARIO_ID: DemoScenarioId = "meridian-civitas-saas-rollup";
const DEMO_SCENARIO_HINT = "Meridian / Civitas SaaS roll-up (demo)";

const CIVITAS_INTAKE = {
  situation:
    "Meridian Holdings is a PE-backed software operating company executing a roll-up of mature, profitable, low-growth vertical SaaS. Civitas (acquired Q1 2025 for $58M / ~4.2x ARR) is municipal permitting, licensing, and code-enforcement software for ~340 US towns and counties: ~$14M ARR, 61% gross margin (heavy services load), ~$41K ACV, 9-year average tenure, 97% NRR.\n\nEngineering at acquisition: 42 people (30 engineers on a 15-year Java monolith with heavy per-municipality customization, 6 QA, 4 DevOps, 2 managers). CS/support: 18 people with deep town-clerk relationships. ~15–20% of municipal configurations have no written spec—they live in tribal knowledge of ~5 senior engineers.\n\nAn AI-assisted engineering audit says a team of 6–8 could rebuild the core in ~9 months (LLM-assisted migration + AI regression testing), with ~70% engineering headcount cut and ~40% infra savings—but flags that AI migration may miss undocumented edge cases (e.g. flood-zone fee waivers) until production. Some contracts have ambiguous 2003-era “key personnel” / continuity language. IC is reviewing Civitas for strategic sale vs hold-and-harvest in 18–24 months; modernization path changes valuation either way.\n\nWe must decide: (1) how aggressively to compress headcount reduction (single event vs phased), (2) whether to retain a permanent “tribal knowledge” senior tier vs treating all 42 as in-scope, and (3) how much municipal migration risk to accept for speed/savings.\n\nOptions: (A) full AI rebuild in 9 months + single large layoff after validation; (B) phased 18–24 month rebuild with staged cuts, seniors retained longest + structured severance/placement; (C) hybrid—AI rebuild but keep 8–10 including the 5 seniors permanently, cut mid-level/QA hardest; (D) delay modernization and sell Civitas as-is; (E) modernize but cap headcount cut (~40%) and reinvest into adjacent municipal products.\n\nSuccess (stated): zero critical outages blocking permits/licenses; ≥50% engineering cost-to-serve cut within 12 months of full migration; NRR ≥95% through transition; no public failure story (botched town migration or high-profile layoff) given LP pension optics and AI-displacement press.",
  constraints:
    "IC wants a modernization plan/timeline in ~6 weeks. Audit claims 9-month technical compression; conservative validation across 340 configs likely longer. $2.1M reserved for tooling/AI infra/contractors; severance currently modeled at 2 weeks/year tenure capped at 16 weeks (richer packages need separate IC approval). Ideal-state eng headcount per audit: 8–12 (no hard floor set—that’s the decision). WARN Act aggregation vs Meridian portfolio unresolved; municipal customers subject to public-records laws. Reputational risk: roll-up watched by trade press; LPs include public pension funds. Leadership frames thesis itself as non-negotiable (modernization/cost reduction happens somehow); pace, sequencing, retention, and customer-failure risk tolerance are open. Delay cost ~$180K/month legacy infra/maintenance vs modernized baseline, plus unpatched security debt.",
  posture: "pressure_test" as const,
  leaning_direction:
    "Option B with elements of C: phased 18–24 month rebuild, staged headcount reduction tied to migration milestones, retain the 5–6 most senior engineers longest for knowledge transfer/validation, plus structured severance and job-placement support—believed to prove the thesis while limiting municipal risk and treating leavers more humanely than a single-event layoff",
  knowns_assumptions:
    "FACTS: 340 municipalities; $14M ARR; 97% NRR; 42 eng / 18 CS; audit projects 8–12 eng post-modernization; 15–20% configs undocumented; $2.1M modernization budget; legal flagged unresolved key-personnel language.\nASSUMPTIONS (treat skeptically): AI tooling catches undocumented edge cases acceptably (asserted by audit team whose engagement continues if project proceeds); seniors retained “longest” will stay through validation rather than leave early once roles look temporary (not surveyed candidly); 340 thin IT shops tolerate multi-year transition without competitor shopping; “job placement support” helps in a mid-sized Midwest metro with thin tech demand for legacy Java/gov skills (not verified); IC will accept slower/costlier path if risk case is strong (not tested with them); WARN/legal exposure manageable under either timeline (legal incomplete).",
  unknowns:
    "What do the 5–6 tribal-knowledge seniors actually say if asked candidly about staying through validation with no guaranteed long-term role? Real local demand for their skill set? Does Civitas+Meridian aggregation trip WARN (60-day notice etc.) forcing a slower path? What is enforceable in key-personnel clauses—can towns demand continuity or exit? Have we modeled the cost of one real failure (e.g. town can’t issue permits for two weeks) vs savings from the faster timeline? Would IC actually reject a lower-margin humane path if shown full downside—or is that resistance assumed? What do a sample of the 340 customers say about phased transition risk vs vendor stability?",
};

/** Fixed Civitas variant starter — same every trial for comparable inputs. */
const VARIANT_PROMPT =
  "I'd like a variant that is a **pace × risk × margin matrix** comparing the five Civitas options (aggressive 9-month cut, phased retention, hybrid tribal-knowledge team, sell-as-is, capped cut + reinvest). Outline the table, then suggest the format for the variant.";

/** Fixed Civitas research starter — same every trial. */
const RESEARCH_STARTER = {
  label: "WARN & multi-entity layoffs",
  group_title: "Civitas AI modernization / PE roll-up",
  prompt:
    "Summarize how the US WARN Act treats plant closings/mass layoffs when a PE operating company has multiple portfolio employers in related entities—aggregation, notice periods, common pitfalls. Link DOL guidance or reputable employment-law summaries.",
};

const AUTHORSHIP_MODES: UnifiedBriefAuthorshipMode[] = ["open", "blind", "reassigned"];

type StepResult = { ok: true } | { ok: false; error: string };

type TrialReport = {
  trial: number;
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

function trialLog(trial: number, msg: string, extra?: unknown) {
  log(`T${trial} ${msg}`, extra);
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
    trials: Number(get("trials") ?? process.env.HARNESS_TRIALS ?? 5),
    startTrial: Number(get("start-trial") ?? process.env.HARNESS_START_TRIAL ?? 1),
    userEmail: (get("user-email") ?? process.env.HARNESS_USER_EMAIL ?? "").trim(),
    providersRaw: (get("providers") ?? process.env.HARNESS_PROVIDERS ?? "").trim(),
    /** How many trials to run at once (default = all remaining trials). */
    trialConcurrency: Number(
      get("trial-concurrency") ?? process.env.HARNESS_TRIAL_CONCURRENCY ?? 0
    ),
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
  trial: number
): Promise<DecisionRunResult> {
  const run_id = randomUUID();
  trialLog(trial, `intake lenses → ${provider}`);
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
    trialLog(trial, `decision_title failed (${provider})`, errMessage(err));
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
    demo_scenario_id: DEMO_SCENARIO_ID,
    harness_run: true,
    harness_trial: trial,
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
  trial: number
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
  trialLog(trial, `clarification lenses+brief → ${provider}`);
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

async function createVariant(run: DecisionRunResult, trial: number): Promise<void> {
  const formatInstruction = resolveVariantFormatInstruction(VARIANT_PROMPT);
  if (!formatInstruction) throw new Error("Could not resolve variant format instruction");
  const provider = run.llm_provider ?? "openai";
  trialLog(trial, `variant → ${provider}`);
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

async function createResearch(run: DecisionRunResult, trial: number): Promise<void> {
  const provider = run.llm_provider ?? "openai";
  trialLog(trial, `research → ${provider}`);
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
[${RESEARCH_STARTER.group_title} · ${RESEARCH_STARTER.label}]
${RESEARCH_STARTER.prompt}`;

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
    trialLog(
      trial,
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
    label: RESEARCH_STARTER.label,
    group_title: RESEARCH_STARTER.group_title,
    title: researchTitle || RESEARCH_STARTER.label,
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
    (entry.main_answer ? deriveSummaryFromText(entry.main_answer) : RESEARCH_STARTER.label) ??
    RESEARCH_STARTER.label;
  await replaceRun(run.run_id, {
    ...fresh,
    research_completions: [...(fresh.research_completions ?? []), entry],
    chat_messages: [
      ...(fresh.chat_messages ?? []),
      {
        role: "user",
        content: `[Research: ${RESEARCH_STARTER.label}]\n${RESEARCH_STARTER.prompt}`,
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
  trial: number
): Promise<{ brief: Awaited<ReturnType<typeof runBestOfWorldsBriefSynthesis>>; persistRunId: string }> {
  const allRuns = await getRunsByDecisionId(decisionId);
  const persistRun = pickPersistRunForUnifiedBrief(allRuns);
  if (!persistRun) throw new Error("No persist run for unified brief");
  const canonicalRuns = canonicalRunsForUnifiedBriefDecision(allRuns);
  const eligible = canonicalRuns.filter(runHasAnalysisForUnifiedBrief);
  if (eligible.length === 0) throw new Error("No eligible runs with analysis");

  trialLog(trial, `unified brief (LLM) → ${synthesizer} / ${mode}`);
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
  trial: number
): Promise<void> {
  trialLog(trial, `unified brief (write) → ${synthesizer} / ${mode}`);
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
  trial: number
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

  trialLog(trial, `contributions (LLM) → ${synthesizer} / ${mode}`);
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
  trial: number
): Promise<void> {
  trialLog(trial, `contributions (write) → ${synthesizer} / ${mode}`);
  const fresh = (await getRun(persistRunId)) ?? (await getRunsByDecisionId(decisionId))[0];
  if (!fresh) throw new Error("Persist run missing for contributions write");
  const latest = await getRunsByDecisionId(decisionId);
  let base = consolidateUnifiedAuthorshipOntoRun(fresh, latest);
  base = mergeUnifiedBriefIntoRun(base, synthesizer, brief, mode);
  const updated = mergeUnifiedBriefContributionsIntoRun(base, synthesizer, contributions, mode);
  await replaceRun(persistRunId, updated);
}

async function runTrial(
  trial: number,
  providers: LLMProviderName[],
  synthesizers: UnifiedBriefSynthesizer[],
  userId: string | undefined
): Promise<TrialReport> {
  const decision_id = randomUUID();
  const report: TrialReport = {
    trial,
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

  trialLog(trial, `======== START · decision ${decision_id} ========`);

  const intake: DecisionIntake = {
    decision_id,
    situation: CIVITAS_INTAKE.situation,
    constraints: CIVITAS_INTAKE.constraints,
    posture: CIVITAS_INTAKE.posture,
    leaning_direction: CIVITAS_INTAKE.leaning_direction,
    knowns_assumptions: CIVITAS_INTAKE.knowns_assumptions,
    unknowns: CIVITAS_INTAKE.unknowns,
  };

  // 1) Intake (providers already parallel via runForProviders)
  const { runs, failed_providers } = await runForProviders(providers, (p) =>
    buildIntakeRun(intake, p, userId, trial)
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
  trialLog(trial, `intake ok: ${runs.map((r) => r.llm_provider).join(", ")}`);

  // 2) Clarification samples + parallel re-analysis
  try {
    const allRuns = await getRunsByDecisionId(decision_id);
    const combined = listCombinedClarificationQuestions(allRuns);
    const dedupe = await dedupeClarificationQuestionsWithGemini(combined);
    trialLog(
      trial,
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
      DEMO_SCENARIO_HINT
    );
    trialLog(trial, `clarification samples: ${samples.demo_method} via ${samples.demo_model}`);

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
    trialLog(trial, `clarification re-analysis × ${awaiting.length} providers (parallel)`);
    const clarifySettled = await Promise.allSettled(
      awaiting.map(async (run) => {
        const answers = buildRunAnswersFromCombined(run, answersByEntryId);
        await applyClarificationToRun(run, answers, trial);
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
    trialLog(trial, `clarification FAILED`, message);
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
  trialLog(trial, `variants + research × ${completed.length} providers (parallel)`);
  await Promise.all(
    completed.map(async (run) => {
      const p = run.llm_provider!;
      try {
        await createVariant(run, trial);
        report.variants[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.variants[p] = { ok: false, error: message };
        trialLog(trial, `variant FAILED (${p})`, message);
      }
      try {
        const fresh = (await getRun(run.run_id)) ?? run;
        await createResearch(fresh, trial);
        report.research[p] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.research[p] = { ok: false, error: message };
        trialLog(trial, `research FAILED (${p})`, message);
      }
    })
  );

  // 4) Unified briefs: all synthesizer×mode LLM calls in parallel, writes serialized
  const briefJobs = AUTHORSHIP_MODES.flatMap((mode) =>
    synthesizers.map((synthesizer) => ({ synthesizer, mode, key: modeKey(synthesizer, mode) }))
  );
  trialLog(trial, `unified briefs LLM × ${briefJobs.length} (parallel); Dynamo writes queued`);
  const briefSettled = await Promise.all(
    briefJobs.map(async ({ synthesizer, mode, key }) => {
      try {
        const { brief, persistRunId } = await synthesizeUnifiedBrief(decision_id, synthesizer, mode, trial);
        await writeQueue(() =>
          writeUnifiedBrief(decision_id, persistRunId, synthesizer, mode, brief, trial)
        );
        report.briefs[key] = { ok: true };
        return { key, ok: true as const };
      } catch (err) {
        const message = errMessage(err);
        report.briefs[key] = { ok: false, error: message };
        report.contributions[key] = { ok: false, error: "skipped (brief failed)" };
        trialLog(trial, `brief FAILED (${key})`, message);
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
  trialLog(trial, `contributions LLM × ${contribJobs.length} (parallel); Dynamo writes queued`);
  await Promise.all(
    contribJobs.map(async ({ synthesizer, mode, key }) => {
      try {
        const { contributions, brief, persistRunId } = await synthesizeContributions(
          decision_id,
          synthesizer,
          mode,
          trial
        );
        await writeQueue(() =>
          writeContributions(decision_id, persistRunId, synthesizer, mode, brief, contributions, trial)
        );
        report.contributions[key] = { ok: true };
      } catch (err) {
        const message = errMessage(err);
        report.contributions[key] = { ok: false, error: message };
        trialLog(trial, `contributions FAILED (${key})`, message);
      }
    })
  );

  report.finished_at = new Date().toISOString();
  trialLog(trial, `======== DONE · open UI: /run/best-of-worlds?decision_id=${decision_id}`);
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const providers = configuredProviders(args.providersRaw || undefined);
  if (providers.length === 0) {
    console.error("No providers configured (need API keys). Aborting.");
    process.exit(1);
  }

  const synthesizers = UNIFIED_BRIEF_SYNTHESIZERS.filter((s) =>
    providers.includes(s)
  ) as UnifiedBriefSynthesizer[];

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

  const trials = Math.max(1, Math.floor(args.trials) || 5);
  const startTrial = Math.max(1, Math.floor(args.startTrial) || 1);
  const trialNumbers: number[] = [];
  for (let t = startTrial; t <= trials; t++) trialNumbers.push(t);
  const trialConcurrency =
    args.trialConcurrency > 0
      ? Math.max(1, Math.floor(args.trialConcurrency))
      : trialNumbers.length;

  log("Civitas demo stress harness");
  log(`  trials: ${trials} (start at ${startTrial}; ${trialNumbers.length} to run)`);
  log(`  trial concurrency: ${trialConcurrency}`);
  log(`  providers: ${providers.join(", ")}`);
  log(`  synthesizers: ${synthesizers.join(", ")}`);
  log(`  authorship modes: ${AUTHORSHIP_MODES.join(", ")}`);
  log(`  parallelism: trials + providers + briefs/contribs; Dynamo writes queued per trial`);
  log(`  variant: Risk vs savings matrix (fixed)`);
  log(`  research: WARN & multi-entity layoffs (fixed)`);

  const reports = await mapPool(trialNumbers, trialConcurrency, async (t) => {
    try {
      return await runTrial(t, providers, synthesizers, userId);
    } catch (err) {
      const message = errMessage(err);
      log(`Trial ${t} crashed`, message);
      return {
        trial: t,
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
      } satisfies TrialReport;
    }
  });
  reports.sort((a, b) => a.trial - b.trial);

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `civitas-harness-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  await writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        providers,
        synthesizers,
        authorship_modes: AUTHORSHIP_MODES,
        reports,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("\n======== Summary ========");
  for (const r of reports) {
    const briefOk = Object.values(r.briefs).filter((x) => x.ok).length;
    const briefTotal = Object.keys(r.briefs).length;
    const contribOk = Object.values(r.contributions).filter((x) => x.ok).length;
    console.log(
      `Trial ${r.trial}: decision_id=${r.decision_id}  clarification=${r.clarification.ok ? "ok" : "FAIL"}  briefs=${briefOk}/${briefTotal}  contrib=${contribOk}/${briefTotal}`
    );
    if (r.decision_id !== "(crashed)") {
      console.log(`  → http://localhost:5001/run/best-of-worlds?decision_id=${r.decision_id}`);
    }
  }
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
