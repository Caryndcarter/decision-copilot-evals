/**
 * HMAC-signed invite tokens for gated signup (no DB).
 * Format: base64url(JSON({ exp })).base64url(hmac-sha256)
 */

import { createHmac, timingSafeEqual } from "crypto";

export const INVITE_COOKIE_NAME = "dc_invite";
/** Short window for completing Google OAuth after prepare. */
export const INVITE_COOKIE_MAX_AGE_SEC = 10 * 60;

export type InviteVerifyOk = { ok: true; expiresAt: Date };
export type InviteVerifyFail = {
  ok: false;
  reason: "missing_secret" | "invalid" | "expired";
};
export type InviteVerifyResult = InviteVerifyOk | InviteVerifyFail;

function inviteSecret(): string | null {
  const secret = process.env.INVITE_SECRET || process.env.AUTH_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

function signPayload(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function safeEqualB64(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Create a signed invite token that expires at `expiresAt`. */
export function createInviteToken(opts: { expiresAt: Date }): string {
  const secret = inviteSecret();
  if (!secret) {
    throw new Error("INVITE_SECRET or AUTH_SECRET must be set to create invites");
  }
  const exp = Math.floor(opts.expiresAt.getTime() / 1000);
  if (!Number.isFinite(exp) || exp <= 0) {
    throw new Error("expiresAt must be a valid future date");
  }
  const payloadB64 = Buffer.from(JSON.stringify({ exp }), "utf8").toString("base64url");
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

/** Verify an invite token. Fails closed if no secret is configured. */
export function verifyInviteToken(token: string | null | undefined): InviteVerifyResult {
  const secret = inviteSecret();
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!token || typeof token !== "string") return { ok: false, reason: "invalid" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "invalid" };
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return { ok: false, reason: "invalid" };

  const expected = signPayload(payloadB64, secret);
  if (!safeEqualB64(sig, expected)) return { ok: false, reason: "invalid" };

  let exp: number;
  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { exp?: unknown };
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return { ok: false, reason: "invalid" };
    }
    exp = parsed.exp;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const expiresAt = new Date(exp * 1000);
  if (Date.now() >= expiresAt.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, expiresAt };
}

export function inviteErrorMessage(reason: InviteVerifyFail["reason"]): string {
  if (reason === "expired") return "This invitation link has expired.";
  if (reason === "missing_secret") {
    return "Invitations are not configured on this server.";
  }
  return "This invitation link is invalid.";
}
