import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { decideInviteRequest, findInviteRequestById } from "@/lib/db/invite-requests";
import { createInviteToken } from "@/lib/invite-token";

function resolveBaseUrl(request: NextRequest): string {
  const fromEnv = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return request.nextUrl.origin;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const existing = await findInviteRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Request already decided" }, { status: 409 });
    }

    const body = (await request.json().catch(() => ({}))) as { days?: unknown };
    const days =
      typeof body.days === "number" && Number.isFinite(body.days) && body.days > 0
        ? body.days
        : 7;

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const token = createInviteToken({ expiresAt, email: existing.email });
    const url = `${resolveBaseUrl(request)}/auth/signup?invite=${encodeURIComponent(token)}`;

    const updated = await decideInviteRequest(id, {
      status: "approved",
      decidedByEmail: gate.user.email ?? "",
      inviteUrl: url,
      inviteExpiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json({ ok: true, request: updated, url, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("AUTH_SECRET") || message.includes("INVITE_SECRET")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    console.error("[admin/invite-requests/approve] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
