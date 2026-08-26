/**
 * Lightweight, no-dependency spam guards for the public /request-access
 * form — shared between the client form and the API route so field names
 * and timing thresholds can't drift out of sync.
 *
 * Layered deliberately cheap-to-expensive: honeypot catches bots that fill
 * every field blindly; the timing window catches submissions faster than a
 * human could plausibly read+type; IP rate limiting caps how many any one
 * source can create. None of this is meant to be bulletproof — it's sized
 * for a low-traffic research site with a human approving every request
 * regardless, not an adversarial target. Add a CAPTCHA (e.g. Cloudflare
 * Turnstile) later only if real spam volume shows up.
 */

/** Hidden field name. Real users never see or fill it; most bots fill every field blindly. */
export const HONEYPOT_FIELD_NAME = "website";

/** Reject submissions faster than this — no human reads+fills a form this quickly. */
export const MIN_ELAPSED_MS = 2000;

/** Reject submissions claiming to be older than this — stale/replayed renderedAt. */
export const MAX_ELAPSED_MS = 60 * 60 * 1000;

/** Per-IP request cap in the window below. */
export const MAX_REQUESTS_PER_IP = 3;
export const IP_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  // Deliberately simple — this is a request form, not the source of truth for deliverability.
  return trimmed.length > 3 && trimmed.length < 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
