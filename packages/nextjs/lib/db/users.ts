/**
 * User persistence in MongoDB (`users` collection).
 * Credentials signup stores `passwordHash` alongside Auth.js-compatible fields.
 */

import "server-only";
import { ObjectId, type WithId, type Document } from "mongodb";
import { ensureMongoIndexes, getUsersCollection } from "@/server/config/mongodb";

export interface UserRecord {
  id: string;
  email: string;
  emailVerified: string | null;
  name?: string | null;
  image?: string | null;
  is_admin?: boolean;
  passwordHash?: string;
  created_at?: string;
}

function docToUser(doc: WithId<Document> | null | undefined): UserRecord | null {
  if (!doc) return null;
  const email = typeof doc.email === "string" ? doc.email : "";
  return {
    id: String(doc._id),
    email,
    emailVerified:
      doc.emailVerified == null
        ? null
        : typeof doc.emailVerified === "string"
          ? doc.emailVerified
          : new Date(doc.emailVerified as Date).toISOString(),
    name: typeof doc.name === "string" ? doc.name : null,
    image: typeof doc.image === "string" ? doc.image : null,
    is_admin: Boolean(doc.is_admin),
    passwordHash: typeof doc.passwordHash === "string" ? doc.passwordHash : undefined,
    created_at:
      typeof doc.created_at === "string"
        ? doc.created_at
        : doc.created_at instanceof Date
          ? doc.created_at.toISOString()
          : undefined,
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await ensureMongoIndexes();
  const col = await getUsersCollection();
  const doc = await col.findOne({ email: email.toLowerCase().trim() });
  return docToUser(doc);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  await ensureMongoIndexes();
  if (!ObjectId.isValid(id)) return null;
  const col = await getUsersCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return docToUser(doc);
}

export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A user with email ${email} already exists`);
    this.name = "UserAlreadyExistsError";
  }
}

export async function createUserWithPassword(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<UserRecord> {
  await ensureMongoIndexes();
  const email = input.email.toLowerCase().trim();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new UserAlreadyExistsError(email);
  }

  const col = await getUsersCollection();
  const created_at = new Date().toISOString();
  const result = await col.insertOne({
    email,
    emailVerified: null,
    name: input.name.trim(),
    is_admin: false,
    passwordHash: input.passwordHash,
    created_at,
  });

  return {
    id: String(result.insertedId),
    email,
    emailVerified: null,
    name: input.name.trim(),
    is_admin: false,
    passwordHash: input.passwordHash,
    created_at,
  };
}

/** Hard-delete a user by id (smoke tests / admin cleanup). */
export async function deleteUserById(id: string): Promise<boolean> {
  await ensureMongoIndexes();
  if (!ObjectId.isValid(id)) return false;
  const col = await getUsersCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}
