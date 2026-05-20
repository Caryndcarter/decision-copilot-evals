/**
 * Copy items from legacy two-table layout (`…-runs`, `…-auth`) into the single
 * `…-app` table used on the `one-table` branch.
 *
 * - **Runs:** each item gains `pk` / `sk` = `RUN#<run_id>`; any stray `GSI1PK` /
 *   `GSI1SK` keys are removed so runs do not appear in the auth email index.
 *   `updatedAt` is set from the legacy item or falls back to `createdAt` so
 *   `by-decision` / `by-user` (range key `updatedAt`) index correctly.
 * - **Auth:** items are copied verbatim (same `pk`/`sk`/`GSI1PK`/`GSI1SK`).
 *
 * Safe to re-run (overwrites by primary key). Does **not** delete legacy tables.
 *
 * Env (defaults match main-branch table names):
 *   LEGACY_RUNS_TABLE_NAME  — default `${PROJECT_KEY}-${PROJECT_ENV}-runs`
 *   LEGACY_AUTH_TABLE_NAME  — default `${PROJECT_KEY}-${PROJECT_ENV}-auth`
 *   APP_TABLE_NAME          — destination (default `${PROJECT_KEY}-${PROJECT_ENV}-app`)
 *
 * Run from repo root:
 *   npm run dynamo:migrate-legacy
 */

import "dotenv/config";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, APP_TABLE } from "../server/config/dynamodb";
import { runPartitionKey, runSortKey } from "../lib/db/run-keys";

const PROJECT_KEY = process.env.PROJECT_KEY || "decision-copilot";
const PROJECT_ENV = process.env.PROJECT_ENV || "local";

const LEGACY_RUNS =
  process.env.LEGACY_RUNS_TABLE_NAME || `${PROJECT_KEY}-${PROJECT_ENV}-runs`;
const LEGACY_AUTH =
  process.env.LEGACY_AUTH_TABLE_NAME || `${PROJECT_KEY}-${PROJECT_ENV}-auth`;

async function scanAll(table: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await dynamo.send(
      new ScanCommand({ TableName: table, ExclusiveStartKey })
    );
    out.push(...((res.Items ?? []) as Record<string, unknown>[]));
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return out;
}

async function main(): Promise<void> {
  console.log("Migrate legacy DynamoDB → single app table");
  console.log(`  Dest:        ${APP_TABLE}`);
  console.log(`  Legacy runs: ${LEGACY_RUNS}`);
  console.log(`  Legacy auth: ${LEGACY_AUTH}`);
  console.log("");

  let runs = 0;
  try {
    const legacyRunItems = await scanAll(LEGACY_RUNS);
    for (const item of legacyRunItems) {
      const run_id = item.run_id;
      if (typeof run_id !== "string" || !run_id.trim()) {
        console.warn("  skip run item without run_id:", Object.keys(item));
        continue;
      }
      const row: Record<string, unknown> = { ...item };
      delete row.GSI1PK;
      delete row.GSI1SK;
      row.pk = runPartitionKey(run_id);
      row.sk = runSortKey(run_id);
      const nowIso = new Date().toISOString();
      const ca = row.createdAt;
      const ua = row.updatedAt;
      row.updatedAt =
        typeof ua === "string" && ua.trim()
          ? ua
          : typeof ca === "string" && ca.trim()
            ? ca
            : nowIso;
      await dynamo.send(new PutCommand({ TableName: APP_TABLE, Item: row }));
      runs += 1;
    }
    console.log(`  Migrated ${runs} run(s)`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ResourceNotFoundException") || msg.includes("Cannot do operations on a non-existent table")) {
      console.log(`  No legacy runs table (${LEGACY_RUNS}) — skip runs`);
    } else {
      throw e;
    }
  }

  let auth = 0;
  try {
    const legacyAuthItems = await scanAll(LEGACY_AUTH);
    for (const item of legacyAuthItems) {
      await dynamo.send(new PutCommand({ TableName: APP_TABLE, Item: item }));
      auth += 1;
    }
    console.log(`  Migrated ${auth} auth row(s)`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ResourceNotFoundException") || msg.includes("Cannot do operations on a non-existent table")) {
      console.log(`  No legacy auth table (${LEGACY_AUTH}) — skip auth`);
    } else {
      throw e;
    }
  }

  console.log("");
  console.log("Done. Legacy tables are unchanged. Point the app at APP_TABLE (default env).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
