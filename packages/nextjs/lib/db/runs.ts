/**
 * Decision run persistence in DynamoDB.
 * SERVER-ONLY: use from API routes only.
 *
 * Table layout (see packages/local/docker-dynamodb/dynamo-create-table.sh):
 *   PK: run_id
 *   GSI by-decision: decision_id (HASH) + createdAt (RANGE), projection ALL
 *   GSI by-user:     user_id     (HASH) + createdAt (RANGE), projection ALL
 *
 * The full DecisionRunResult is stored as the item body. We attach
 * `createdAt` and `updatedAt` ISO timestamps at write time so the GSIs
 * sort correctly and the existing UI's date display works unchanged.
 */

import "server-only";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  RUNS_TABLE,
  RUNS_GSI_BY_DECISION,
  RUNS_GSI_BY_USER,
  dynamo,
} from "@/server/config/dynamodb";
import type { DecisionRunResult } from "@/types/decision";

/**
 * Stored item shape: the full result plus indexable / housekeeping fields.
 * `user_id` is also part of `DecisionRunResult` (optional). We keep it as a
 * top-level attribute regardless so the by-user GSI key resolves cleanly.
 */
type RunItem = DecisionRunResult & {
  createdAt: string;
  updatedAt?: string;
};

/** DynamoDB single-item hard limit is 400 KB. Warn at 350, throw at 400. */
const SOFT_SIZE_BYTES = 350 * 1024;
const HARD_SIZE_BYTES = 400 * 1024;

function checkItemSize(item: object, op: string): void {
  const bytes = Buffer.byteLength(JSON.stringify(item), "utf8");
  if (bytes > HARD_SIZE_BYTES) {
    throw new Error(
      `[runs.${op}] Item size ${bytes}B exceeds DynamoDB 400KB limit. ` +
        `Consider splitting variants/freeform_output into child items.`
    );
  }
  if (bytes > SOFT_SIZE_BYTES) {
    console.warn(
      `[runs.${op}] Item size ${bytes}B is approaching DynamoDB 400KB limit. ` +
        `Watch this run id for breakage.`
    );
  }
}

function toItem(result: DecisionRunResult, opts: { now: string; isUpdate: boolean; previousCreatedAt?: string }): RunItem {
  return {
    ...result,
    // Preserve the original createdAt on updates; insertRun always sets a fresh one.
    createdAt: opts.previousCreatedAt ?? opts.now,
    ...(opts.isUpdate ? { updatedAt: opts.now } : {}),
  };
}

export async function getRun(run_id: string): Promise<DecisionRunResult | null> {
  const res = await dynamo.send(
    new GetCommand({
      TableName: RUNS_TABLE,
      Key: { run_id },
    })
  );
  return (res.Item as RunItem | undefined) ?? null;
}

/** List all runs for a decision (multiple postures). Order: most recent first. */
export async function getRunsByDecisionId(decision_id: string): Promise<DecisionRunResult[]> {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: RUNS_TABLE,
      IndexName: RUNS_GSI_BY_DECISION,
      KeyConditionExpression: "#did = :did",
      ExpressionAttributeNames: { "#did": "decision_id" },
      ExpressionAttributeValues: { ":did": decision_id },
      ScanIndexForward: false,
    })
  );
  return (res.Items as RunItem[] | undefined) ?? [];
}

/**
 * List runs for the dashboard. Most recent first, capped at `limit`.
 * The `asAdmin` flag is reserved for a future admin-wide view; per the
 * migration plan it currently behaves identically to a normal user query.
 */
export async function listRunsForUser(
  userId: string,
  options: { limit?: number; asAdmin?: boolean } = {}
): Promise<DecisionRunResult[]> {
  const limit = options.limit ?? 200;
  const res = await dynamo.send(
    new QueryCommand({
      TableName: RUNS_TABLE,
      IndexName: RUNS_GSI_BY_USER,
      KeyConditionExpression: "#uid = :uid",
      ExpressionAttributeNames: { "#uid": "user_id" },
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return (res.Items as RunItem[] | undefined) ?? [];
}

export async function insertRun(result: DecisionRunResult): Promise<void> {
  const now = new Date().toISOString();
  const item = toItem(result, { now, isUpdate: false });
  checkItemSize(item, "insertRun");
  await dynamo.send(new PutCommand({ TableName: RUNS_TABLE, Item: item }));
}

export async function replaceRun(run_id: string, result: DecisionRunResult): Promise<void> {
  const now = new Date().toISOString();
  // Preserve the original createdAt so the by-decision/by-user GSI sort key
  // doesn't shift on every update (which would also break "most recent first").
  const existing = await getRun(run_id);
  const previousCreatedAt = (existing as RunItem | null)?.createdAt;
  const item = toItem({ ...result, run_id }, { now, isUpdate: true, previousCreatedAt });
  checkItemSize(item, "replaceRun");
  await dynamo.send(new PutCommand({ TableName: RUNS_TABLE, Item: item }));
}

/** Remove a run by id. Returns true if a document was removed. */
export async function deleteRun(run_id: string): Promise<boolean> {
  const res = await dynamo.send(
    new DeleteCommand({
      TableName: RUNS_TABLE,
      Key: { run_id },
      ReturnValues: "ALL_OLD",
    })
  );
  return !!res.Attributes;
}
