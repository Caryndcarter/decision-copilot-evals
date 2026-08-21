/**
 * Decision run persistence in MongoDB (`runs` collection).
 *
 * Documents are keyed by `run_id`. `createdAt` / `updatedAt` are ISO strings
 * (newest-first sorts use `updatedAt`).
 */

import "server-only";
import { ensureMongoIndexes, getRunsCollection } from "@/server/config/mongodb";
import type { DecisionRunResult } from "@/types/decision";

type RunDoc = DecisionRunResult & {
  createdAt: string;
  updatedAt: string;
  _id?: unknown;
};

function stripMongoId(doc: RunDoc | null | undefined): DecisionRunResult | null {
  if (!doc) return null;
  const { _id: _ignored, ...rest } = doc;
  return rest;
}

export async function getRun(run_id: string): Promise<DecisionRunResult | null> {
  await ensureMongoIndexes();
  const col = await getRunsCollection();
  const doc = (await col.findOne({ run_id })) as RunDoc | null;
  return stripMongoId(doc);
}

/** List all runs for a decision (multiple postures). Newest `updatedAt` first. */
export async function getRunsByDecisionId(decision_id: string): Promise<DecisionRunResult[]> {
  await ensureMongoIndexes();
  const col = await getRunsCollection();
  const docs = (await col
    .find({ decision_id })
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
  options: { limit?: number; asAdmin?: boolean } = {}
): Promise<DecisionRunResult[]> {
  await ensureMongoIndexes();
  const limit = options.limit ?? 200;
  const col = await getRunsCollection();
  const filter = options.asAdmin ? {} : { user_id: userId };
  const docs = (await col
    .find(filter)
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
