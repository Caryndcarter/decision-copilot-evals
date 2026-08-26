import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { decideInviteRequest, findInviteRequestById } from "@/lib/db/invite-requests";

export async function POST(
  _request: NextRequest,
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

    const updated = await decideInviteRequest(id, {
      status: "denied",
      decidedByEmail: gate.user.email ?? "",
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (err) {
    console.error("[admin/invite-requests/deny] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
