/**
 * MongoDB Atlas client for the evals app.
 *
 * Same cluster credentials as the original Decision Copilot; a distinct
 * `DB_NAME` (default `decision-copilot-evals`) keeps data isolated.
 */

import "server-only";
import { MongoClient, type Db } from "mongodb";

export const MONGODB_URI = process.env.MONGODB_URI?.trim() || "";
export const DB_NAME = process.env.DB_NAME?.trim() || "decision-copilot-evals";

const RUNS_COLLECTION = "runs";
const USERS_COLLECTION = "users";
const INVITE_REQUESTS_COLLECTION = "invite_requests";

type GlobalMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoIndexesEnsured?: Promise<void>;
};

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
} as const;

function requireUri(): string {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  return MONGODB_URI;
}

/**
 * Shared promise for Auth.js MongoDBAdapter and app DAOs.
 * Cached on globalThis in development so HMR does not open new pools.
 *
 * Connection is deferred until first use so public routes (e.g. `/api/auth/session`
 * for signed-out visitors on `/demo`) do not require MONGODB_URI at module load.
 */
const g = globalThis as GlobalMongo;

function getClientPromise(): Promise<MongoClient> {
  if (!g._mongoClientPromise) {
    g._mongoClientPromise = new MongoClient(requireUri(), mongoOptions).connect();
  }
  return g._mongoClientPromise;
}

export const clientPromise: Promise<MongoClient> = {
  then(onfulfilled, onrejected) {
    return getClientPromise().then(onfulfilled, onrejected);
  },
  catch(onrejected) {
    return getClientPromise().catch(onrejected);
  },
  finally(onfinally) {
    return getClientPromise().finally(onfinally);
  },
  [Symbol.toStringTag]: "Promise",
} as Promise<MongoClient>;

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

export async function getRunsCollection() {
  const db = await getDb();
  return db.collection(RUNS_COLLECTION);
}

export async function getUsersCollection() {
  const db = await getDb();
  return db.collection(USERS_COLLECTION);
}

export async function getInviteRequestsCollection() {
  const db = await getDb();
  return db.collection(INVITE_REQUESTS_COLLECTION);
}

/** Idempotent indexes for run lookups used by the dashboard and harness. */
export async function ensureMongoIndexes(): Promise<void> {
  if (!g._mongoIndexesEnsured) {
    g._mongoIndexesEnsured = (async () => {
      const runs = await getRunsCollection();
      await Promise.all([
        runs.createIndex({ run_id: 1 }, { unique: true, name: "run_id_unique" }),
        runs.createIndex({ decision_id: 1, updatedAt: -1 }, { name: "by_decision_updated" }),
        runs.createIndex({ user_id: 1, updatedAt: -1 }, { name: "by_user_updated" }),
      ]);
      const users = await getUsersCollection();
      await users.createIndex({ email: 1 }, { unique: true, name: "email_unique" });
      const inviteRequests = await getInviteRequestsCollection();
      await Promise.all([
        inviteRequests.createIndex({ email: 1 }, { unique: true, name: "email_unique" }),
        inviteRequests.createIndex(
          { status: 1, created_at: -1 },
          { name: "by_status_created" }
        ),
        inviteRequests.createIndex({ ip: 1, created_at: -1 }, { name: "by_ip_created" }),
      ]);
    })();
  }
  await g._mongoIndexesEnsured;
}
