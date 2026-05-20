/**
 * Duplicate the live `runs` and `auth` DynamoDB tables into snapshot tables
 * with the same key schema and GSIs, then copy every item.
 *
 * - **Source tables are read-only** — nothing is deleted or modified there.
 * - **Destination tables** are created if missing (schema cloned from source via
 *   DescribeTable), then all items are written with Put semantics (re-run
 *   refreshes the snapshot from current source data).
 *
 * Configure with env (see root `.env`):
 *   PROJECT_KEY / PROJECT_ENV — default table name prefix
 *   RUNS_TABLE_NAME / AUTH_TABLE_NAME — override source table names
 *   SNAPSHOT_RUNS_TABLE_NAME / SNAPSHOT_AUTH_TABLE_NAME — full destination names
 *     (if unset, defaults to `<source>-archive`)
 *
 * Run from repo root:
 *   npm run dynamo:snapshot
 *
 * Or from `packages/nextjs`:
 *   npx env-cmd --file ../../.env -- npx tsx scripts/dynamo-duplicate-tables-snapshot.ts
 */

import "dotenv/config";
import {
  CreateTableCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  DynamoDBClient,
  type AttributeDefinition,
  type GlobalSecondaryIndex,
  type GlobalSecondaryIndexDescription,
  type KeySchemaElement,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const PROJECT_KEY = process.env.PROJECT_KEY || "decision-copilot";
const PROJECT_ENV = process.env.PROJECT_ENV || "local";

const SOURCE_RUNS =
  process.env.RUNS_TABLE_NAME || `${PROJECT_KEY}-${PROJECT_ENV}-runs`;
const SOURCE_AUTH =
  process.env.AUTH_TABLE_NAME || `${PROJECT_KEY}-${PROJECT_ENV}-auth`;

const DEST_RUNS =
  process.env.SNAPSHOT_RUNS_TABLE_NAME || `${SOURCE_RUNS}-archive`;
const DEST_AUTH =
  process.env.SNAPSHOT_AUTH_TABLE_NAME || `${SOURCE_AUTH}-archive`;

function buildClient(): DynamoDBClient {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  return new DynamoDBClient({
    region,
    ...(endpoint
      ? {
          endpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
          },
        }
      : {}),
  });
}

function gsiForCreate(
  gsis: GlobalSecondaryIndexDescription[] | undefined
): GlobalSecondaryIndex[] | undefined {
  if (!gsis?.length) return undefined;
  return gsis.map((g) => ({
    IndexName: g.IndexName!,
    KeySchema: g.KeySchema as KeySchemaElement[],
    Projection: g.Projection!,
  }));
}

async function waitTableActive(client: DynamoDBClient, tableName: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const d = await client.send(new DescribeTableCommand({ TableName: tableName }));
    if (d.Table?.TableStatus === "ACTIVE") return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Table ${tableName} did not become ACTIVE in time`);
}

async function cloneTableSchema(
  client: DynamoDBClient,
  sourceName: string,
  destName: string
): Promise<void> {
  const desc = await client.send(new DescribeTableCommand({ TableName: sourceName }));
  const t = desc.Table;
  if (!t?.KeySchema?.length || !t.AttributeDefinitions?.length) {
    throw new Error(`DescribeTable ${sourceName} returned incomplete metadata`);
  }

  try {
    await client.send(
      new CreateTableCommand({
        TableName: destName,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: t.AttributeDefinitions as AttributeDefinition[],
        KeySchema: t.KeySchema as KeySchemaElement[],
        ...(gsiForCreate(t.GlobalSecondaryIndexes)
          ? { GlobalSecondaryIndexes: gsiForCreate(t.GlobalSecondaryIndexes) }
          : {}),
      })
    );
    console.log(`  Created table ${destName}`);
  } catch (e: unknown) {
    const name = e instanceof Error ? e.name : "";
    if (name === "ResourceInUseException") {
      console.log(`  Table ${destName} already exists — skipping create, will refresh data`);
    } else {
      throw e;
    }
  }
  await waitTableActive(client, destName);
}

async function cloneTtlIfPresent(
  client: DynamoDBClient,
  sourceName: string,
  destName: string
): Promise<void> {
  const ttl = await client.send(new DescribeTimeToLiveCommand({ TableName: sourceName }));
  const spec = ttl.TimeToLiveDescription;
  if (spec?.TimeToLiveStatus !== "ENABLED" || !spec.AttributeName) {
    console.log(`  No TTL on ${sourceName} — skip`);
    return;
  }
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: destName,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: spec.AttributeName,
        },
      })
    );
    console.log(`  Enabled TTL on ${destName} (${spec.AttributeName})`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already enabled")) {
      console.log(`  TTL already on ${destName}`);
    } else {
      throw e;
    }
  }
}

async function copyAllItems(
  doc: DynamoDBDocumentClient,
  sourceName: string,
  destName: string
): Promise<number> {
  let total = 0;
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: sourceName,
        ExclusiveStartKey,
      })
    );
    const items = (res.Items ?? []) as Record<string, unknown>[];
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      let request: Record<string, unknown> = {
        [destName]: chunk.map((Item) => ({ PutRequest: { Item } })),
      };
      let attempts = 0;
      while (attempts < 8) {
        const out = await doc.send(
          new BatchWriteCommand({
            RequestItems: request as never,
          })
        );
        const unprocessed = out.UnprocessedItems?.[destName];
        if (!unprocessed?.length) break;
        request = { [destName]: unprocessed };
        attempts += 1;
        await new Promise((r) => setTimeout(r, 100 * 2 ** attempts));
      }
      if (attempts >= 8) {
        throw new Error(`BatchWrite still had unprocessed items for ${destName}`);
      }
    }
    total += items.length;
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return total;
}

async function main(): Promise<void> {
  console.log("DynamoDB snapshot duplicate");
  console.log(`  Endpoint: ${process.env.DYNAMODB_ENDPOINT ?? "(AWS default)"}`);
  console.log(`  Source runs:  ${SOURCE_RUNS}`);
  console.log(`  Source auth:  ${SOURCE_AUTH}`);
  console.log(`  Dest runs:    ${DEST_RUNS}`);
  console.log(`  Dest auth:    ${DEST_AUTH}`);
  console.log("");

  const raw = buildClient();
  const doc = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  });

  await cloneTableSchema(raw, SOURCE_RUNS, DEST_RUNS);
  await cloneTtlIfPresent(raw, SOURCE_RUNS, DEST_RUNS);
  const nRuns = await copyAllItems(doc, SOURCE_RUNS, DEST_RUNS);
  console.log(`  Copied ${nRuns} item(s) → ${DEST_RUNS}`);

  await cloneTableSchema(raw, SOURCE_AUTH, DEST_AUTH);
  await cloneTtlIfPresent(raw, SOURCE_AUTH, DEST_AUTH);
  const nAuth = await copyAllItems(doc, SOURCE_AUTH, DEST_AUTH);
  console.log(`  Copied ${nAuth} item(s) → ${DEST_AUTH}`);

  console.log("");
  console.log("Done. Original tables are unchanged.");
  console.log(`Open DynamoDB Admin and select ${DEST_RUNS} / ${DEST_AUTH} to inspect the snapshot.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
