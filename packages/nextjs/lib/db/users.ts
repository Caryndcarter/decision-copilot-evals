/**
 * User persistence in the auth DynamoDB table.
 * SERVER-ONLY: use from API routes only.
 *
 * Layout matches @auth/dynamodb-adapter:
 *   pk = USER#{id}, sk = USER#{id}
 *   GSI1PK = USER#{email}, GSI1SK = USER#{email}
 *
 * `passwordHash` is stored alongside the adapter's user attributes so the
 * credentials provider can verify it without a separate table.
 */

import "server-only";
import { randomUUID } from "crypto";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, AUTH_TABLE } from "@/server/config/dynamodb";

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

interface UserItem extends UserRecord {
  pk: string;
  sk: string;
  GSI1PK: string;
  GSI1SK: string;
  type: "USER";
}

const userPk = (id: string) => `USER#${id}`;
const userGsi1 = (email: string) => `USER#${email.toLowerCase()}`;

function itemToUser(item: UserItem | undefined): UserRecord | null {
  if (!item) return null;
  // Strip adapter housekeeping keys before returning to callers.
  const { pk: _pk, sk: _sk, GSI1PK: _g1, GSI1SK: _g2, type: _type, ...rest } = item;
  return rest;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: AUTH_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": userGsi1(email) },
      Limit: 1,
    })
  );
  return itemToUser(res.Items?.[0] as UserItem | undefined);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const pk = userPk(id);
  const res = await dynamo.send(
    new GetCommand({ TableName: AUTH_TABLE, Key: { pk, sk: pk } })
  );
  return itemToUser(res.Item as UserItem | undefined);
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
  const email = input.email.toLowerCase().trim();

  // Adapter-style uniqueness on email is enforced by GSI1 lookup. We do a
  // pre-check so we can return a clean 409 (the conditional Put on `pk`
  // alone wouldn't catch a duplicate email since each user has a fresh id).
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new UserAlreadyExistsError(email);
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const pk = userPk(id);
  const gsi1 = userGsi1(email);

  const item: UserItem = {
    pk,
    sk: pk,
    GSI1PK: gsi1,
    GSI1SK: gsi1,
    type: "USER",
    id,
    email,
    emailVerified: null,
    name: input.name.trim(),
    is_admin: false,
    passwordHash: input.passwordHash,
    created_at: now,
  };

  await dynamo.send(
    new PutCommand({
      TableName: AUTH_TABLE,
      Item: item,
      // Belt-and-braces: refuse to clobber an item with the same generated id.
      ConditionExpression: "attribute_not_exists(pk)",
    })
  );

  // Non-null is safe: we just constructed `item`.
  return itemToUser(item)!;
}

/**
 * Set or clear the `is_admin` flag. Admin is a stored flag only (no admin product UI);
 * use the `admin:set` CLI to grant or revoke. Callers must re-sign-in for JWT sessions
 * to pick up the change.
 */
export async function setUserAdminByEmail(
  email: string,
  isAdmin: boolean
): Promise<UserRecord> {
  const existing = await findUserByEmail(email);
  if (!existing) {
    throw new Error(`No user found for email ${email.toLowerCase().trim()}`);
  }
  const pk = userPk(existing.id);
  const res = await dynamo.send(
    new UpdateCommand({
      TableName: AUTH_TABLE,
      Key: { pk, sk: pk },
      UpdateExpression: "SET is_admin = :a",
      ExpressionAttributeValues: { ":a": isAdmin },
      ReturnValues: "ALL_NEW",
    })
  );
  return itemToUser(res.Attributes as UserItem | undefined) ?? {
    ...existing,
    is_admin: isAdmin,
  };
}
