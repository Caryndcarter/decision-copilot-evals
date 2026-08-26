/**
 * Backfill harness_batch_id + harness_kind on Meridian IC voice batches.
 *
 *   npm run harness:backfill:meridian-run1          # Run #1 + early test
 *   npm run harness:backfill:meridian-run1 -- early # pre–Run #1 parallel test only
 */

import "dotenv/config";
import { getRunsCollection } from "../server/config/mongodb";
import {
  MERIDIAN_IC_VOICE_EARLY_BATCH_ID,
  MERIDIAN_IC_VOICE_RUN1_BATCH_ID,
} from "../lib/harness-meta";
import {
  HARNESS_BATCH_MODEL_SNAPSHOTS,
  modelIdForProvider,
} from "../lib/harness-provider-models";
import type { LLMProviderName } from "../types/decision";

async function backfillRun1(col: Awaited<ReturnType<typeof getRunsCollection>>) {
  const filter = {
    harness_run: true,
    harness_run_number: 1,
    demo_scenario_id: /^meridian-ic-/,
    $or: [
      { harness_batch_id: { $exists: false } },
      { harness_batch_id: "" },
      { harness_batch_id: null },
      { harness_kind: { $exists: false } },
      { harness_kind: "" },
      { harness_kind: null },
    ],
  };

  const preview = await col.countDocuments(filter);
  if (preview === 0) {
    console.log("Run #1: nothing to backfill (already has batch metadata).");
    return;
  }

  const result = await col.updateMany(filter, {
    $set: {
      harness_batch_id: MERIDIAN_IC_VOICE_RUN1_BATCH_ID,
      harness_kind: "meridian-ic-voice",
    },
  });

  console.log(`Run #1: backfilled ${result.modifiedCount} run(s) (${preview} matched).`);
  console.log(`  harness_batch_id: ${MERIDIAN_IC_VOICE_RUN1_BATCH_ID}`);
  console.log(`  short id: 8f2a0820`);
}

async function backfillEarly(col: Awaited<ReturnType<typeof getRunsCollection>>) {
  const filter = {
    harness_run: true,
    demo_scenario_id: /^meridian-ic-/,
    $and: [
      {
        $or: [{ harness_run_number: { $exists: false } }, { harness_run_number: null }],
      },
      {
        $or: [
          { harness_batch_id: { $exists: false } },
          { harness_batch_id: "" },
          { harness_batch_id: null },
        ],
      },
    ],
  };

  const preview = await col.countDocuments(filter);
  if (preview === 0) {
    console.log("Early test: nothing to backfill.");
    return;
  }

  const result = await col.updateMany(filter, {
    $set: {
      harness_batch_id: MERIDIAN_IC_VOICE_EARLY_BATCH_ID,
      harness_kind: "meridian-ic-voice",
    },
  });

  console.log(`Early test: backfilled ${result.modifiedCount} run(s) (${preview} matched).`);
  console.log(`  harness_batch_id: ${MERIDIAN_IC_VOICE_EARLY_BATCH_ID}`);
  console.log(`  short id: e7430820`);
}

async function backfillModels(col: Awaited<ReturnType<typeof getRunsCollection>>) {
  let total = 0;
  for (const [batchId, snapshot] of Object.entries(HARNESS_BATCH_MODEL_SNAPSHOTS)) {
    for (const [provider, models] of Object.entries(snapshot.provider_models)) {
      const model = models?.[0];
      if (!model) continue;
      const result = await col.updateMany(
        {
          harness_batch_id: batchId,
          llm_provider: provider as LLMProviderName,
          $or: [{ llm_model: { $exists: false } }, { llm_model: "" }, { llm_model: null }],
        },
        { $set: { llm_model: model } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  ${batchId.slice(0, 8)} · ${provider} → ${model}: ${result.modifiedCount}`);
        total += result.modifiedCount;
      }
    }
  }
  console.log(`Models: backfilled llm_model on ${total} run(s).`);
  console.log(`  (future harness runs record ${modelIdForProvider("openai")} via env at run time)`);
}

async function main() {
  const col = await getRunsCollection();
  const earlyOnly = process.argv.slice(2).includes("early");
  const modelsOnly = process.argv.slice(2).includes("models");

  if (modelsOnly) {
    await backfillModels(col);
    return;
  }

  if (earlyOnly) {
    await backfillEarly(col);
    return;
  }

  await backfillRun1(col);
  await backfillEarly(col);
  await backfillModels(col);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
