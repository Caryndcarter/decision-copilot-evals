import { NextRequest, NextResponse } from "next/server";
import {
  countInviteRequestsByIp,
  createInviteRequest,
  InviteRequestAlreadyExistsError,
} from "@/lib/db/invite-requests";
import {
  getClientIp,
  isValidEmail,
  HONEYPOT_FIELD_NAME,
  IP_RATE_LIMIT_WINDOW_MS,
  MAX_ELAPSED_MS,
  MAX_REQUESTS_PER_IP,
  MIN_ELAPSED_MS,
} from "@/lib/invite-request-guard";
import { notifyInviteRequest } from "@/lib/slack-alert";

function resolveBaseUrl(request: NextRequest): string {
  const fromEnv = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return request.nextUrl.origin;
}

// Generic response for every "soft" rejection (honeypot, timing) so a bot
// gets no signal about which check it tripped. Real validation errors
// (bad email) still get a specific message — that's for humans correcting
// a typo, not an attacker.
// Must be a fresh object per call — a Response body can only be read once,
// so a single shared instance breaks every call after the first.
function genericOk() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      reason?: unknown;
      renderedAt?: unknown;
      [HONEYPOT_FIELD_NAME]?: unknown;
    };

    // Honeypot: any value here means a bot filled every field. Pretend success.
    if (typeof body[HONEYPOT_FIELD_NAME] === "string" && body[HONEYPOT_FIELD_NAME].length > 0) {
      return genericOk();
    }

    // Timing: too fast is a bot; too old is a stale/replayed request.
    const renderedAt = typeof body.renderedAt === "number" ? body.renderedAt : null;
    if (renderedAt === null) {
      return genericOk();
    }
    const elapsed = Date.now() - renderedAt;
    if (elapsed < MIN_ELAPSED_MS || elapsed > MAX_ELAPSED_MS) {
      return genericOk();
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const email = (body.email as string).toLowerCase().trim();
    const reason =
      typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 1000) : null;

    const ip = getClientIp(request.headers);
    if (ip !== "unknown") {
      const recent = await countInviteRequestsByIp(ip, IP_RATE_LIMIT_WINDOW_MS);
      if (recent >= MAX_REQUESTS_PER_IP) {
        return NextResponse.json(
          { error: "Too many requests from this network today. Try again tomorrow." },
          { status: 429 }
        );
      }
    }

    try {
      await createInviteRequest({ email, reason, ip });
    } catch (err) {
      // Already requested (any status) — don't reveal that, don't create a duplicate.
      if (err instanceof InviteRequestAlreadyExistsError) {
        return genericOk();
      }
      throw err;
    }

    // Only fires for a genuine new request — not on the honeypot/timing/
    // duplicate paths above, which return early. A Slack outage or missing
    // webhook config never affects this response either way.
    await notifyInviteRequest({
      email,
      reason,
      adminUrl: `${resolveBaseUrl(request)}/admin`,
    });

    return genericOk();
  } catch (err) {
    console.error("[invite-requests] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
