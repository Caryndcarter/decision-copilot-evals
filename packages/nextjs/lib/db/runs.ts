/**
 * Decision run persistence in DynamoDB (single `APP_TABLE` on `one-table` branch).
 *
 * Table layout (see `packages/local/docker-dynamodb/dynamo-create-table.sh`):
 *   PK: pk = RUN#<run_id>, SK: sk = RUN#<run_id>
 *   GSI by-decision: decision_id (HASH) + updatedAt (RANGE), projection ALL
 *   GSI by-user:     user_id     (HASH) + updatedAt (RANGE), projection ALL
 *
 * Run items must not set GSI1PK/GSI1SK (reserved for NextAuth on the same table).
 *
 * The full DecisionRunResult is stored as the item body. We attach
 * `createdAt` is immutable after insert; `updatedAt` is set on every write
 * so list queries sort by last activity (newest first).
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
import { runPartitionKey, runSortKey } from "@/lib/db/run-keys";
import type { DecisionRunResult } from "@/types/decision";

/**
 * Stored item shape: the full result plus indexable / housekeeping fields.
 * `user_id` is also part of `DecisionRunResult` (optional). We keep it as a
 * top-level attribute regardless so the by-user GSI key resolves cleanly.
 */
type RunItem = DecisionRunResult & {
  pk: string;
  sk: string;
  createdAt: string;
  updatedAt: string;
};

/** Strip DynamoDB-only keys before returning to callers. */
function stripRunDdbKeys(
  item: Record<string, unknown> | null | undefined
): (DecisionRunResult & { createdAt?: string; updatedAt?: string }) | null {
  if (!item) return null;
  const { pk: _p, sk: _s, ...rest } = item;
  return rest as unknown as DecisionRunResult & { createdAt?: string; updatedAt?: string };
}

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

function toItem(
  result: DecisionRunResult,
  opts: { now: string; previousCreatedAt?: string }
): RunItem {
  const pk = runPartitionKey(result.run_id);
  const sk = runSortKey(result.run_id);
  return {
    ...result,
    pk,
    sk,
    createdAt: opts.previousCreatedAt ?? opts.now,
    updatedAt: opts.now,
  };
}

export async function getRun(run_id: string): Promise<DecisionRunResult | null> {
  const pk = runPartitionKey(run_id);
  const sk = runSortKey(run_id);
  const res = await dynamo.send(
    new GetCommand({
      TableName: RUNS_TABLE,
      Key: { pk, sk },
    })
  );
  return stripRunDdbKeys(res.Item as Record<string, unknown> | undefined) as DecisionRunResult | null;
}

/**
 * DynamoDB Query responses are capped at ~1MB. Large Unified Brief / contributions
 * payloads often fill that with far fewer than `Limit` items, so callers must page
 * with ExclusiveStartKey or the dashboard silently drops older decisions.
 */
async function queryAllPages(
  input: ConstructorParameters<typeof QueryCommand>[0]
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await dynamo.send(
      new QueryCommand({
        ...input,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      })
    );
    const page = (res.Items as Record<string, unknown>[] | undefined) ?? [];
    items.push(...page);
    exclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);
  return items;
}

/** List all runs for a decision (multiple postures). Order: most recently updated first. */
export async function getRunsByDecisionId(decision_id: string): Promise<DecisionRunResult[]> {
  const items = await queryAllPages({
    TableName: RUNS_TABLE,
    IndexName: RUNS_GSI_BY_DECISION,
    KeyConditionExpression: "#did = :did",
    ExpressionAttributeNames: { "#did": "decision_id" },
    ExpressionAttributeValues: { ":did": decision_id },
    ScanIndexForward: false,
  });
  return items.map((it) => stripRunDdbKeys(it)!).filter(Boolean) as DecisionRunResult[];
}

/**
 * List runs for the dashboard. Most recently updated first, capped at `limit`.
 * Pages past DynamoDB's 1MB response size so dense Unified Brief runs still surface.
 * The `asAdmin` flag is reserved for a future admin-wide view; per the
 * migration plan it currently behaves identically to a normal user query.
 */
export async function listRunsForUser(
  userId: string,
  options: { limit?: number; asAdmin?: boolean } = {}
): Promise<DecisionRunResult[]> {
  const limit = options.limit ?? 200;
  const collected: Record<string, unknown>[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const remaining = limit - collected.length;
    if (remaining <= 0) break;
    const res = await dynamo.send(
      new QueryCommand({
        TableName: RUNS_TABLE,
        IndexName: RUNS_GSI_BY_USER,
        KeyConditionExpression: "#uid = :uid",
        ExpressionAttributeNames: { "#uid": "user_id" },
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false,
        Limit: remaining,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      })
    );
    const page = (res.Items as Record<string, unknown>[] | undefined) ?? [];
    collected.push(...page);
    exclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey && collected.length < limit);

  return collected.map((it) => stripRunDdbKeys(it)!).filter(Boolean) as DecisionRunResult[];
}

export async function insertRun(result: DecisionRunResult): Promise<void> {
  const now = new Date().toISOString();
  const item = toItem(result, { now });
  checkItemSize(item, "insertRun");
  await dynamo.send(new PutCommand({ TableName: RUNS_TABLE, Item: item }));
}

export async function replaceRun(run_id: string, result: DecisionRunResult): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getRun(run_id);
  const previousCreatedAt = (existing as { createdAt?: string } | null)?.createdAt;
  const item = toItem({ ...result, run_id }, { now, previousCreatedAt });
  checkItemSize(item, "replaceRun");
  await dynamo.send(new PutCommand({ TableName: RUNS_TABLE, Item: item }));
}

/** Remove a run by id. Returns true if a document was removed. */
export async function deleteRun(run_id: string): Promise<boolean> {
  const pk = runPartitionKey(run_id);
  const sk = runSortKey(run_id);
  const res = await dynamo.send(
    new DeleteCommand({
      TableName: RUNS_TABLE,
      Key: { pk, sk },
      ReturnValues: "ALL_OLD",
    })
  );
  return !!res.Attributes;
}
