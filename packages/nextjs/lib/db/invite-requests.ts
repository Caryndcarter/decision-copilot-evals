/**
 * Invite request persistence in MongoDB (`invite_requests` collection).
 *
 * A request is created from the public /request-access form and sits as
 * "pending" until an admin approves or denies it from /admin. Approving
 * mints an email-scoped invite token (see lib/invite-token.ts) — it does
 * not auto-create an account.
 */

import "server-only";
import { ObjectId, type WithId, type Document } from "mongodb";
import { ensureMongoIndexes, getInviteRequestsCollection } from "@/server/config/mongodb";

export type InviteRequestStatus = "pending" | "approved" | "denied";

export interface InviteRequestRecord {
  id: string;
  email: string;
  reason: string | null;
  status: InviteRequestStatus;
  ip: string;
  created_at: string;
  decided_at?: string;
  decided_by?: string;
  invite_url?: string;
  invite_expires_at?: string;
}

export class InviteRequestAlreadyExistsError extends Error {
  constructor() {
    super("A request for this email already exists");
    this.name = "InviteRequestAlreadyExistsError";
  }
}

function docToRecord(doc: WithId<Document> | null | undefined): InviteRequestRecord | null {
  if (!doc) return null;
  return {
    id: String(doc._id),
    email: typeof doc.email === "string" ? doc.email : "",
    reason: typeof doc.reason === "string" ? doc.reason : null,
    status: (doc.status as InviteRequestStatus) ?? "pending",
    ip: typeof doc.ip === "string" ? doc.ip : "",
    created_at:
      typeof doc.created_at === "string"
        ? doc.created_at
        : doc.created_at instanceof Date
          ? doc.created_at.toISOString()
          : new Date(0).toISOString(),
    decided_at: typeof doc.decided_at === "string" ? doc.decided_at : undefined,
    decided_by: typeof doc.decided_by === "string" ? doc.decided_by : undefined,
    invite_url: typeof doc.invite_url === "string" ? doc.invite_url : undefined,
    invite_expires_at:
      typeof doc.invite_expires_at === "string" ? doc.invite_expires_at : undefined,
  };
}

/** Insert a new pending request. Throws if this email already has one (any status). */
export async function createInviteRequest(opts: {
  email: string;
  reason?: string | null;
  ip: string;
}): Promise<InviteRequestRecord> {
  await ensureMongoIndexes();
  const col = await getInviteRequestsCollection();
  const email = opts.email.toLowerCase().trim();

  const existing = await col.findOne({ email });
  if (existing) throw new InviteRequestAlreadyExistsError();

  const now = new Date();
  const doc = {
    email,
    reason: opts.reason?.trim() || null,
    status: "pending" as InviteRequestStatus,
    ip: opts.ip,
    created_at: now,
  };
  const result = await col.insertOne(doc);
  return {
    id: String(result.insertedId),
    email: doc.email,
    reason: doc.reason,
    status: doc.status,
    ip: doc.ip,
    created_at: doc.created_at.toISOString(),
  };
}

/** Count requests from this IP within the last `windowMs` — for basic rate limiting. */
export async function countInviteRequestsByIp(ip: string, windowMs: number): Promise<number> {
  await ensureMongoIndexes();
  const col = await getInviteRequestsCollection();
  const since = new Date(Date.now() - windowMs);
  return col.countDocuments({ ip, created_at: { $gte: since } });
}

export async function findInviteRequestByEmail(
  email: string
): Promise<InviteRequestRecord | null> {
  await ensureMongoIndexes();
  const col = await getInviteRequestsCollection();
  const doc = await col.findOne({ email: email.toLowerCase().trim() });
  return docToRecord(doc);
}

export async function listPendingInviteRequests(): Promise<InviteRequestRecord[]> {
  await ensureMongoIndexes();
  const col = await getInviteRequestsCollection();
  const docs = await col.find({ status: "pending" }).sort({ created_at: 1 }).toArray();
  return docs.map((d) => docToRecord(d)).filter((d): d is InviteRequestRecord => d !== null);
}

export async function findInviteRequestById(id: string): Promise<InviteRequestRecord | null> {
  await ensureMongoIndexes();
  if (!ObjectId.isValid(id)) return null;
  const col = await getInviteRequestsCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return docToRecord(doc);
}

export async function decideInviteRequest(
  id: string,
  opts: {
    status: "approved" | "denied";
    decidedByEmail: string;
    inviteUrl?: string;
    inviteExpiresAt?: string;
  }
): Promise<InviteRequestRecord | null> {
  await ensureMongoIndexes();
  if (!ObjectId.isValid(id)) return null;
  const col = await getInviteRequestsCollection();
  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: opts.status,
        decided_at: now,
        decided_by: opts.decidedByEmail,
        ...(opts.inviteUrl ? { invite_url: opts.inviteUrl } : {}),
        ...(opts.inviteExpiresAt ? { invite_expires_at: opts.inviteExpiresAt } : {}),
      },
    }
  );
  return findInviteRequestById(id);
}
