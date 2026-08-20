import { NextRequest, NextResponse } from "next/server";
import {
  INVITE_COOKIE_MAX_AGE_SEC,
  INVITE_COOKIE_NAME,
  inviteErrorMessage,
  verifyInviteToken,
} from "@/lib/invite-token";

/**
 * Validate an invite and set a short-lived httpOnly cookie for first-time Google OAuth.
 * Also usable as a soft check: GET ?invite=… → { ok } without setting a cookie.
 */
export async function GET(request: NextRequest) {
  const invite = request.nextUrl.searchParams.get("invite");
  const result = verifyInviteToken(invite);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: inviteErrorMessage(result.reason) },
      { status: 403 }
    );
  }
  return NextResponse.json({
    ok: true,
    expiresAt: result.expiresAt.toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { invite?: string };
    const result = verifyInviteToken(body.invite);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: inviteErrorMessage(result.reason) },
        { status: 403 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      expiresAt: result.expiresAt.toISOString(),
    });
    res.cookies.set(INVITE_COOKIE_NAME, String(body.invite), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: INVITE_COOKIE_MAX_AGE_SEC,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    console.error("[invite/prepare] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
