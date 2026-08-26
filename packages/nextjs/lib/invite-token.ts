/**
 * HMAC-signed invite tokens for gated signup (no DB).
 * Format: base64url(JSON({ exp, email? })).base64url(hmac-sha256)
 *
 * `email` is optional so admin-minted general links (share with one trusted
 * person out of band) keep working unscoped. When present — e.g. tokens
 * minted by approving a /request-access request — the token can only be
 * redeemed by that exact email; see the email-match check in
 * app/api/auth/signup/route.ts and auth.ts's Google signIn callback.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const INVITE_COOKIE_NAME = "dc_invite";
/** Short window for completing Google OAuth after prepare. */
export const INVITE_COOKIE_MAX_AGE_SEC = 10 * 60;

export type InviteVerifyOk = { ok: true; expiresAt: Date; email: string | null };
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

/** Create a signed invite token that expires at `expiresAt`, optionally scoped to one email. */
export function createInviteToken(opts: { expiresAt: Date; email?: string }): string {
  const secret = inviteSecret();
  if (!secret) {
    throw new Error("INVITE_SECRET or AUTH_SECRET must be set to create invites");
  }
  const exp = Math.floor(opts.expiresAt.getTime() / 1000);
  if (!Number.isFinite(exp) || exp <= 0) {
    throw new Error("expiresAt must be a valid future date");
  }
  const payload: { exp: number; email?: string } = { exp };
  if (opts.email) payload.email = opts.email.toLowerCase().trim();
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
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
  let email: string | null = null;
  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { exp?: unknown; email?: unknown };
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return { ok: false, reason: "invalid" };
    }
    exp = parsed.exp;
    if (typeof parsed.email === "string" && parsed.email) email = parsed.email;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const expiresAt = new Date(exp * 1000);
  if (Date.now() >= expiresAt.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, expiresAt, email };
}

/** True if `email` is allowed to redeem `verified` (unscoped tokens allow anyone). */
export function inviteAllowsEmail(verified: InviteVerifyOk, email: string): boolean {
  if (!verified.email) return true;
  return verified.email === email.toLowerCase().trim();
}

export function inviteErrorMessage(reason: InviteVerifyFail["reason"]): string {
  if (reason === "expired") return "This invitation link has expired.";
  if (reason === "missing_secret") {
    return "Invitations are not configured on this server.";
  }
  return "This invitation link is invalid.";
}
