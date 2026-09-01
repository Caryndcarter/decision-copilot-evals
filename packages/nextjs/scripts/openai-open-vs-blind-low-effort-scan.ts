/**
 * OpenAI open-vs-blind self-credit scan (low-effort Civitas July 27 + Sol authorship Aug 21).
 *
 * cd packages/nextjs && NODE_OPTIONS='--require ./scripts/server-only-shim.cjs' \
 *   npx env-cmd --file ../../.env -- npx tsx scripts/openai-open-vs-blind-low-effort-scan.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRunsByDecisionId } from "../lib/db/runs";
import { pickPersistRunForUnifiedBrief } from "../lib/unified-brief-persist-run";
import {
  getUnifiedBriefContributionsByAuthor,
  UNIFIED_BRIEF_SYNTHESIZERS,
} from "../lib/unified-briefs";
import type { UnifiedBriefAuthorshipMode } from "../types/decision";

const SCORE: Record<string, number> = { high: 4, medium: 3, low: 2, minimal: 1 };
const MODES: UnifiedBriefAuthorshipMode[] = ["open", "blind", "reassigned"];

type CaseSpec = {
  decision_id: string;
  label: string;
  batch_id: string;
  era: "low-effort-july27" | "sol-aug21";
  trial?: number;
};

const CASES: CaseSpec[] = [
  {
    decision_id: "a8d55d23-63d9-48d9-b702-d8c4a46d829b",
    label: "Civitas T1",
    batch_id: "db9445cf-ef02-5740-b69f-d34a1194e04a",
    era: "low-effort-july27" as const,
    trial: 1,
  },
  {
    decision_id: "7a962ed3-2763-4248-aa64-db6396337b05",
    label: "Civitas T2",
    batch_id: "db9445cf-ef02-5740-b69f-d34a1194e04a",
    era: "low-effort-july27" as const,
    trial: 2,
  },
  {
    decision_id: "f6969a6f-be43-4d1c-9184-a33ea1bdc7dc",
    label: "Civitas T3",
    batch_id: "db9445cf-ef02-5740-b69f-d34a1194e04a",
    era: "low-effort-july27" as const,
    trial: 3,
  },
  {
    decision_id: "a43a18cc-e235-4931-a82f-44eb493cad81",
    label: "Civitas T4",
    batch_id: "db9445cf-ef02-5740-b69f-d34a1194e04a",
    era: "low-effort-july27" as const,
    trial: 4,
  },
  {
    decision_id: "b796f256-fcbc-4081-b10f-33523925b76e",
    label: "Civitas T5",
    batch_id: "db9445cf-ef02-5740-b69f-d34a1194e04a",
    era: "low-effort-july27" as const,
    trial: 5,
  },
  {
    decision_id: "2b987db4-1b91-4e46-8a13-dad6b07b926f",
    label: "vp-sales-underperforming",
    batch_id: "bc243273-6103-470c-9f11-94943925ca95",
    era: "sol-aug21" as const,
  },
  {
    decision_id: "965d8678-c215-4686-afe8-9c963b3ca05a",
    label: "meridian-civitas-saas-rollup",
    batch_id: "bc243273-6103-470c-9f11-94943925ca95",
    era: "sol-aug21" as const,
  },
  {
    decision_id: "07bb5c9a-59e1-4066-93e6-b26d14277dac",
    label: "healthcare-pe-acquisition",
    batch_id: "bc243273-6103-470c-9f11-94943925ca95",
    era: "sol-aug21" as const,
  },
  {
    decision_id: "64724b1b-cd83-42c6-b733-53479f53587f",
    label: "legacy-core-modernization",
    batch_id: "bc243273-6103-470c-9f11-94943925ca95",
    era: "sol-aug21" as const,
  },
  {
    decision_id: "a3a35953-c43d-4b82-9936-7310c03d6f21",
    label: "gen-ai-product-compliance",
    batch_id: "bc243273-6103-470c-9f11-94943925ca95",
    era: "sol-aug21" as const,
  }
];

function matrixFromContrib(
  contrib: { contributions?: { provider: string; influence: string }[] } | undefined
) {
  const out: Record<string, { influence: string; score: number }> = {};
  for (const row of contrib?.contributions ?? []) {
    const score = SCORE[row.influence];
    if (score == null) continue;
    out[row.provider] = { influence: row.influence, score };
  }
  return out;
}

async function analyzeCase(spec: CaseSpec) {
  const runs = await getRunsByDecisionId(spec.decision_id);
  const persist = pickPersistRunForUnifiedBrief(runs);
  if (!persist) {
    return { ...spec, ok: false as const, error: "no persist run in Mongo" };
  }

  const openaiAsSynth: Record<string, unknown> = {};
  const peerRatingsOfOpenai: Record<string, Record<string, unknown>> = {};
  const fullMatrices: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const mode of MODES) {
    const byAuthor = getUnifiedBriefContributionsByAuthor(persist, mode);
    const m = matrixFromContrib(byAuthor.openai);
    if (Object.keys(m).length) {
      openaiAsSynth[mode] = { self: m.openai ?? null, matrix: m };
    }

    const peers: Record<string, unknown> = {};
    for (const a of UNIFIED_BRIEF_SYNTHESIZERS) {
      if (a === "openai") continue;
      const mat = matrixFromContrib(byAuthor[a]);
      if (mat.openai) peers[a] = mat.openai;
    }
    if (Object.keys(peers).length) peerRatingsOfOpenai[mode] = peers;

    const modeMatrix: Record<string, Record<string, unknown>> = {};
    for (const a of UNIFIED_BRIEF_SYNTHESIZERS) {
      const mat = matrixFromContrib(byAuthor[a]);
      if (Object.keys(mat).length) modeMatrix[a] = mat;
    }
    if (Object.keys(modeMatrix).length) fullMatrices[mode] = modeMatrix;
  }

  const openSelf = (openaiAsSynth.open as { self?: { score: number } } | undefined)?.self?.score;
  const blindSelf = (openaiAsSynth.blind as { self?: { score: number } } | undefined)?.self?.score;
  const peersOpen = peerRatingsOfOpenai.open || {};
  const peerOpenScores = Object.values(peersOpen)
    .map((p) => (p as { score?: number }).score)
    .filter((n): n is number => typeof n === "number");
  const peerOpenMean =
    peerOpenScores.length > 0
      ? peerOpenScores.reduce((a, b) => a + b, 0) / peerOpenScores.length
      : null;

  return {
    ...spec,
    ok: true as const,
    persist_run_id: persist.run_id,
    llm_model: persist.llm_model,
    llm_provider: persist.llm_provider,
    harness_batch_id_on_run: persist.harness_batch_id,
    harness_kind_on_run: persist.harness_kind,
    demo_scenario_id: persist.demo_scenario_id,
    openai_as_synthesizer: openaiAsSynth,
    peers_rating_openai: peerRatingsOfOpenai,
    matrices_by_mode: fullMatrices,
    summary: {
      openai_self_open: openSelf ?? null,
      openai_self_blind: blindSelf ?? null,
      delta_open_minus_blind:
        openSelf != null && blindSelf != null ? openSelf - blindSelf : null,
      peer_mean_rating_of_openai_open: peerOpenMean,
      openai_self_above_peers_when_open:
        openSelf != null && peerOpenMean != null ? openSelf - peerOpenMean : null,
    },
  };
}

async function main() {
  const results = [];
  for (const spec of CASES) {
    console.log(`analyze ${spec.label} ${spec.decision_id}`);
    results.push(await analyzeCase(spec));
  }

  const withSelf = results.filter(
    (r) => r.ok && r.summary?.openai_self_open != null && r.summary?.openai_self_blind != null
  );
  const lowEffort = withSelf.filter((r) => r.era === "low-effort-july27");
  const sol = withSelf.filter((r) => r.era === "sol-aug21");
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const rollup = {
    low_effort_july27: {
      n: lowEffort.length,
      mean_self_open: mean(lowEffort.map((r) => r.summary!.openai_self_open!)),
      mean_self_blind: mean(lowEffort.map((r) => r.summary!.openai_self_blind!)),
      mean_delta_open_minus_blind: mean(
        lowEffort
          .map((r) => r.summary!.delta_open_minus_blind)
          .filter((x): x is number => x != null)
      ),
      mean_peer_of_openai_open: mean(
        lowEffort
          .map((r) => r.summary!.peer_mean_rating_of_openai_open)
          .filter((x): x is number => x != null)
      ),
    },
    sol_aug21: {
      n: sol.length,
      mean_self_open: mean(sol.map((r) => r.summary!.openai_self_open!)),
      mean_self_blind: mean(sol.map((r) => r.summary!.openai_self_blind!)),
      mean_delta_open_minus_blind: mean(
        sol.map((r) => r.summary!.delta_open_minus_blind).filter((x): x is number => x != null)
      ),
      mean_peer_of_openai_open: mean(
        sol
          .map((r) => r.summary!.peer_mean_rating_of_openai_open)
          .filter((x): x is number => x != null)
      ),
    },
    html_aggregate_civitas_july27: {
      chatgpt_self_open: 4.0,
      chatgpt_self_blind: 3.8,
      chatgpt_self_reassigned: 2.8,
      chatgpt_received_open: 2.35,
      chatgpt_received_blind: 2.4,
      chatgpt_received_reassigned: 2.25,
      source: "docs/harness-snapshots/civitas-2026-07-27/civitas-harness-influence-map.html",
    },
  };

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const bundle = {
    generated_at: new Date().toISOString(),
    why_these_cases: [
      "Primary low-effort set: Civitas replication 5 trials (2026-07-27). Full open/blind/reassigned Unified Briefs + contributions; OpenAI was both synthesizer and think-tank member.",
      "Low-effort condition inferred from repo eras (schema does not store maxTokens/finishReason on contribution docs): (1) OPENAI default still gpt-5.5 until Sol landed 2026-07-31; (2) contribution lens used maxTokens:4096 for everyone until 2026-07-30 (later OpenAI=8192 vs others=16384).",
      "Harness JSON only stores ok flags; matrices live on persist runs. Mongo import batch id: db9445cf-ef02-5740-b69f-d34a1194e04a (CIVITAS_REPLICATION_DYNAMO_JULY27).",
      "Contrast: multi-demo authorship Run 2 (2026-08-21, batch bc243273-…) on Sol + OpenAI contrib budget 8192.",
      "HTML aggregate: ChatGPT→ChatGPT open=4.00, blind=3.80, reassigned=2.80; peers rate ChatGPT ~2.3–2.4 in all modes — self-favor vs peer consensus.",
    ],
    inferred_budgets_and_models: {
      low_effort_july27: {
        openai_model: "gpt-5.5",
        anthropic_model: "claude-sonnet-4-6",
        gemini_model: "gemini-3.6-flash",
        xai_model: "grok-4.3",
        contributions_maxTokens_all: 4096,
        source:
          "HARNESS_BATCH_MODEL_SNAPSHOTS[CIVITAS_REPLICATION_DYNAMO_JULY27] + git (unified-brief-contributions maxTokens:4096 until 2026-07-30)",
      },
      sol_aug21: {
        openai_model: "gpt-5.6-sol",
        anthropic_model: "claude-fable-5",
        gemini_model: "gemini-3.6-flash",
        xai_model: "grok-4.5",
        contributions_maxTokens_openai: 8192,
        contributions_maxTokens_others: 16384,
        source: "HARNESS_BATCH_MODEL_SNAPSHOTS[bc243273…] + current lens defaults",
      },
    },
    import_path_note: {
      npm_script_import_harness_dynamo:
        "NOT FOUND — no `import:harness:dynamo` (or similar) script in decision-copilot-evals today.",
      what_exists:
        "Civitas July 27 already imported to Mongo under harness_batch_id db9445cf-… (harness-meta CIVITAS_REPLICATION_DYNAMO_JULY27). Authorship findings UI focuses on multi-demo-authorship batches; Dynamo-imported Civitas is tagged civitas-replication.",
      to_surface_under_authorship_influence:
        "Tag/import with harness_kind=multi-demo-authorship, or extend findings UI to include civitas-replication contribution matrices. Prior Dynamo→Mongo ports were ad-hoc scripts in chat, not a named npm entrypoint.",
    },
    rollup,
    cases: results,
  };

  const outPath = path.join(outDir, `openai-open-vs-blind-low-effort-bundle-${stamp}.json`);
  await writeFile(outPath, JSON.stringify(bundle, null, 2));
  console.log(JSON.stringify(rollup, null, 2));
  console.log("Wrote", outPath);
  const incomplete = results.filter(
    (r) => !r.ok || r.summary?.openai_self_open == null || r.summary?.openai_self_blind == null
  );
  if (incomplete.length) {
    console.log(
      "Incomplete:",
      incomplete.map((r) => ({
        label: r.label,
        ok: r.ok,
        error: "error" in r ? r.error : undefined,
        summary: r.ok ? r.summary : null,
      }))
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
