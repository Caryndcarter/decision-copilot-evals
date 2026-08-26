import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { listPendingInviteRequests } from "@/lib/db/invite-requests";

export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const requests = await listPendingInviteRequests();
    return NextResponse.json({ ok: true, requests });
  } catch (err) {
    console.error("[admin/invite-requests] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
