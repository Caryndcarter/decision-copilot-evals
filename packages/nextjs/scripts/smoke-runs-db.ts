/**
 * Smoke test for lib/db/runs.ts and lib/db/users.ts against the local
 * DynamoDB container. No LLM calls; no Next.js server needed.
 *
 * Run from repo root:
 *   env-cmd -- npx tsx packages/nextjs/scripts/smoke-runs-db.ts
 *
 * Cleans up its own data on success. On any failure prints the leftover ids
 * so you can inspect them in the admin UI (http://127.0.0.1:8011).
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  deleteRun,
  getRun,
  getRunsByDecisionId,
  insertRun,
  listRunsForUser,
  replaceRun,
} from "../lib/db/runs";
import {
  createUserWithPassword,
  findUserByEmail,
  findUserById,
  UserAlreadyExistsError,
} from "../lib/db/users";
import type { DecisionRunResult } from "../types/decision";

let failed = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}`);
    if (detail !== undefined) console.log("      ", detail);
  }
}

function makeRun(overrides: Partial<DecisionRunResult> = {}): DecisionRunResult {
  const run_id = randomUUID();
  const decision_id = overrides.decision_id ?? randomUUID();
  return {
    decision_id,
    run_id,
    status: "complete",
    intake: {
      decision_id,
      situation: "Smoke test situation",
      constraints: "Smoke test constraints",
      posture: "explore",
    },
    clarification_questions: [],
    clarification_needed: false,
    clarifications: [],
    lens_outputs: [],
    llm_provider: "openai",
    ...overrides,
  } as DecisionRunResult;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runRunsTests(): Promise<{ insertedRunIds: string[] }> {
  console.log("\n[runs.ts]");
  const userId = `smoke-user-${randomUUID()}`;
  const decisionA = randomUUID();
  const decisionB = randomUUID();

  // 1. insert + get round-trip
  const run1 = makeRun({ user_id: userId, decision_id: decisionA, status: "awaiting_clarification" });
  await insertRun(run1);
  const fetched1 = await getRun(run1.run_id);
  check("insertRun + getRun round-trip", fetched1?.run_id === run1.run_id);
  check("getRun preserves status", fetched1?.status === "awaiting_clarification");
  check("getRun stamps createdAt", typeof (fetched1 as unknown as { createdAt?: string } | null)?.createdAt === "string");
  check("getRun stamps updatedAt on insert", typeof (fetched1 as unknown as { updatedAt?: string } | null)?.updatedAt === "string");

  // 2. getRun on missing id returns null
  const missing = await getRun("does-not-exist-" + randomUUID());
  check("getRun returns null for missing id", missing === null);

  // 3. replaceRun preserves createdAt and bumps updatedAt
  const createdAtBefore = (fetched1 as unknown as { createdAt: string }).createdAt;
  await sleep(20); // ensure updatedAt > createdAt
  await replaceRun(run1.run_id, { ...run1, status: "complete" });
  const fetched1b = (await getRun(run1.run_id)) as DecisionRunResult & {
    createdAt: string;
    updatedAt?: string;
  };
  check("replaceRun updates status", fetched1b?.status === "complete");
  check("replaceRun preserves createdAt", fetched1b?.createdAt === createdAtBefore);
  check("replaceRun stamps updatedAt", !!fetched1b?.updatedAt);

  await sleep(20);

  // 4. by-decision GSI: two runs same decision, different times (sorted by updatedAt)
  const run2 = makeRun({ user_id: userId, decision_id: decisionA });
  await insertRun(run2);
  await sleep(20);
  const run3 = makeRun({ user_id: userId, decision_id: decisionA });
  await insertRun(run3);
  const decARuns = await getRunsByDecisionId(decisionA);
  check("getRunsByDecisionId returns all 3", decARuns.length === 3, `got ${decARuns.length}`);
  const ts = decARuns.map((r) => (r as unknown as { updatedAt: string }).updatedAt);
  const sortedDesc = [...ts].sort().reverse();
  check("getRunsByDecisionId sorted newest-first", JSON.stringify(ts) === JSON.stringify(sortedDesc));

  // 5. by-user GSI: same user across two decisions
  const run4 = makeRun({ user_id: userId, decision_id: decisionB });
  await insertRun(run4);
  const userRuns = await listRunsForUser(userId);
  check("listRunsForUser returns all 4 for this user", userRuns.length === 4, `got ${userRuns.length}`);
  const userTs = userRuns.map((r) => (r as unknown as { updatedAt: string }).updatedAt);
  const userSortedDesc = [...userTs].sort().reverse();
  check("listRunsForUser sorted newest-first", JSON.stringify(userTs) === JSON.stringify(userSortedDesc));

  // 6. listRunsForUser respects limit
  const limited = await listRunsForUser(userId, { limit: 2 });
  check("listRunsForUser respects limit", limited.length === 2, `got ${limited.length}`);

  // 7. listRunsForUser isolates by user
  const otherUserRuns = await listRunsForUser("smoke-other-user-" + randomUUID());
  check("listRunsForUser isolates by user_id", otherUserRuns.length === 0);

  // 8. delete + verify gone
  const removed = await deleteRun(run1.run_id);
  check("deleteRun returns true on existing", removed === true);
  const removedAgain = await deleteRun(run1.run_id);
  check("deleteRun returns false on missing", removedAgain === false);
  check("getRun returns null after delete", (await getRun(run1.run_id)) === null);

  return { insertedRunIds: [run2.run_id, run3.run_id, run4.run_id] };
}

async function runUsersTests(): Promise<{ createdUserIds: string[] }> {
  console.log("\n[users.ts]");
  const email = `smoke+${randomUUID()}@example.com`;

  // 1. findUserByEmail returns null for unknown
  const missing = await findUserByEmail(email);
  check("findUserByEmail returns null for unknown email", missing === null);

  // 2. createUserWithPassword writes adapter-shaped item
  const created = await createUserWithPassword({
    email,
    name: "Smoke Tester",
    passwordHash: "fake-bcrypt-hash",
  });
  check("createUserWithPassword returns id", typeof created.id === "string" && created.id.length > 0);
  check("createUserWithPassword normalizes email lowercase", created.email === email.toLowerCase());

  // 3. Lookup by email and id
  const byEmail = await findUserByEmail(email.toUpperCase()); // tests case-insensitivity
  check("findUserByEmail finds case-insensitive", byEmail?.id === created.id);
  check("findUserByEmail returns passwordHash", byEmail?.passwordHash === "fake-bcrypt-hash");

  const byId = await findUserById(created.id);
  check("findUserById round-trip", byId?.id === created.id);
  check("findUserById returns email", byId?.email === email.toLowerCase());

  // 4. Duplicate signup throws UserAlreadyExistsError
  let threw: unknown = null;
  try {
    await createUserWithPassword({ email, name: "Dup", passwordHash: "x" });
  } catch (err) {
    threw = err;
  }
  check("createUserWithPassword throws on duplicate", threw instanceof UserAlreadyExistsError);

  return { createdUserIds: [created.id] };
}

async function main() {
  console.log("Smoke test: DynamoDB persistence layer");
  console.log("Endpoint:", process.env.DYNAMODB_ENDPOINT ?? "(default AWS)");

  const cleanupRunIds: string[] = [];
  const cleanupUserIds: string[] = [];

  try {
    const r = await runRunsTests();
    cleanupRunIds.push(...r.insertedRunIds);
    const u = await runUsersTests();
    cleanupUserIds.push(...u.createdUserIds);
  } finally {
    if (failed === 0) {
      console.log("\n[cleanup]");
      let cleaned = 0;
      for (const id of cleanupRunIds) {
        if (await deleteRun(id)) cleaned += 1;
      }
      console.log(`  ✓ deleted ${cleaned}/${cleanupRunIds.length} smoke runs`);
      // Users are kept simple: delete via raw doc client to avoid widening users.ts surface.
        const { dynamo, AUTH_TABLE } = await import("../server/config/dynamodb");
      const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
      let userCleaned = 0;
      for (const id of cleanupUserIds) {
        const pk = `USER#${id}`;
        const res = await dynamo.send(
          new DeleteCommand({ TableName: AUTH_TABLE, Key: { pk, sk: pk }, ReturnValues: "ALL_OLD" })
        );
        if (res.Attributes) userCleaned += 1;
      }
      console.log(`  ✓ deleted ${userCleaned}/${cleanupUserIds.length} smoke users`);
    } else {
      console.log("\n[cleanup] SKIPPED — failures above. Inspect leftover items:");
      console.log("  runs:  ", cleanupRunIds);
      console.log("  users: ", cleanupUserIds);
    }
  }

  console.log();
  if (failed === 0) {
    console.log("All checks passed.");
    process.exit(0);
  } else {
    console.log(`${failed} check(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
