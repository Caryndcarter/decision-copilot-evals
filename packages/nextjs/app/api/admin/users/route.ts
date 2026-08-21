import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { listUsers } from "@/lib/db/users";

export async function GET() {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const users = await listUsers({ limit: 500 });
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("[admin/users] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
