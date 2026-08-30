/**
 * Decision run persistence in MongoDB (`runs` collection).
 *
 * Documents are keyed by `run_id`. `createdAt` / `updatedAt` are ISO strings
 * (newest-first sorts use `updatedAt`).
 */

import "server-only";
import { ensureMongoIndexes, getRunsCollection } from "@/server/config/mongodb";
import { normalizeRunLensFields } from "@/lib/normalize-lens";
import type { DecisionRunResult } from "@/types/decision";

type RunDoc = DecisionRunResult & {
  createdAt: string;
  updatedAt: string;
  _id?: unknown;
};

export type ListRunsOptions = {
  limit?: number;
  asAdmin?: boolean;
  /** Skip multi-MB fields (variants, research, lens_outputs) for the /runs list. */
  dashboard?: boolean;
  /** Only multi-demo authorship harness runs (findings authorship tab). */
  authorshipOnly?: boolean;
};

/** List metadata only — no brief bodies, variants, research, or unified-brief maps. */
const DASHBOARD_RUN_PROJECTION = {
  run_id: 1,
  decision_id: 1,
  user_id: 1,
  status: 1,
  llm_provider: 1,
  llm_model: 1,
  harness_run: 1,
  harness_trial: 1,
  harness_run_number: 1,
  harness_batch_id: 1,
  harness_kind: 1,
  demo_scenario_id: 1,
  decision_title: 1,
  "intake.situation": 1,
  "intake.posture": 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

/** Authorship findings rollup — unified-brief slots only, no voice-harness payloads. */
const AUTHORSHIP_RUN_PROJECTION = {
  run_id: 1,
  decision_id: 1,
  harness_run: 1,
  harness_trial: 1,
  harness_run_number: 1,
  harness_batch_id: 1,
  harness_kind: 1,
  demo_scenario_id: 1,
  decision_brief_best_of_worlds: 1,
  unified_briefs_by_author: 1,
  unified_brief_contributions_by_author: 1,
  unified_brief_audits_by_author: 1,
  unified_brief_fact_checks_by_author: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

function stripMongoId(doc: RunDoc | null | undefined): DecisionRunResult | null {
  if (!doc) return null;
  const { _id: _ignored, ...rest } = doc;
  return normalizeRunLensFields(rest);
}

export async function getRun(run_id: string): Promise<DecisionRunResult | null> {
  await ensureMongoIndexes();
  const col = await getRunsCollection();
  const doc = (await col.findOne({ run_id })) as RunDoc | null;
  return stripMongoId(doc);
}

/** List all runs for a decision (multiple postures). Newest `updatedAt` first. */
export async function getRunsByDecisionId(
  decision_id: string,
  options: Pick<ListRunsOptions, "dashboard"> = {}
): Promise<DecisionRunResult[]> {
  await ensureMongoIndexes();
  const col = await getRunsCollection();
  const docs = (await col
    .find({ decision_id }, options.dashboard ? { projection: DASHBOARD_RUN_PROJECTION } : undefined)
    .sort({ updatedAt: -1 })
    .toArray()) as RunDoc[];
  return docs.map((d) => stripMongoId(d)!).filter(Boolean);
}

/**
 * List runs for the dashboard. Newest `updatedAt` first, capped at `limit`.
 * When `asAdmin` is true, returns recent runs across all users (admin inbox).
 */
export async function listRunsForUser(
  userId: string,
  options: ListRunsOptions = {}
): Promise<DecisionRunResult[]> {
  await ensureMongoIndexes();
  const limit = options.limit ?? 200;
  const col = await getRunsCollection();
  const filter: Record<string, unknown> = options.asAdmin ? {} : { user_id: userId };
  if (options.authorshipOnly) {
    filter.harness_run = true;
    filter.harness_kind = "multi-demo-authorship";
  }
  const projection = options.authorshipOnly
    ? AUTHORSHIP_RUN_PROJECTION
    : options.dashboard
      ? DASHBOARD_RUN_PROJECTION
      : undefined;
  const docs = (await col
    .find(filter, projection ? { projection } : undefined)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()) as RunDoc[];
  return docs.map((d) => stripMongoId(d)!).filter(Boolean);
}

export async function insertRun(result: DecisionRunResult): Promise<void> {
  await ensureMongoIndexes();
  const now = new Date().toISOString();
  const col = await getRunsCollection();
  await col.insertOne({
    ...result,
    createdAt: now,
    updatedAt: now,
  });
}

export async function replaceRun(run_id: string, result: DecisionRunResult): Promise<void> {
  await ensureMongoIndexes();
  const now = new Date().toISOString();
  const col = await getRunsCollection();
  const existing = (await col.findOne({ run_id })) as
    | (DecisionRunResult & { createdAt?: string })
    | null;
  const previousCreatedAt = existing?.createdAt ?? now;
  await col.replaceOne(
    { run_id },
    {
      ...result,
      run_id,
      createdAt: previousCreatedAt,
      updatedAt: now,
    },
    { upsert: true }
  );
}

/** Remove a run by id. Returns true if a document was removed. */
export async function deleteRun(run_id: string): Promise<boolean> {
  await ensureMongoIndexes();
  const col = await getRunsCollection();
  const res = await col.deleteOne({ run_id });
  return res.deletedCount > 0;
}

/**
 * Next `harness_run_number` for a new harness batch.
 * Scans existing harness runs (optionally scoped to `userId`) and returns max + 1.
 */
export async function nextHarnessRunNumber(userId?: string): Promise<number> {
  await ensureMongoIndexes();
  const col = await getRunsCollection();
  const filter: Record<string, unknown> = {
    harness_run: true,
    harness_run_number: { $type: "number" },
  };
  if (userId) filter.user_id = userId;
  const docs = (await col
    .find(filter, { projection: { harness_run_number: 1 } })
    .sort({ harness_run_number: -1 })
    .limit(1)
    .toArray()) as { harness_run_number?: number }[];
  const max = docs[0]?.harness_run_number;
  return typeof max === "number" && max > 0 ? Math.floor(max) + 1 : 1;
}
