import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { setUserAdminByEmail } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const body = (await request.json()) as { email?: string; is_admin?: boolean };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (typeof body.is_admin !== "boolean") {
      return NextResponse.json({ error: "is_admin must be a boolean" }, { status: 400 });
    }

    const actorEmail = (gate.user.email ?? "").toLowerCase().trim();
    if (!body.is_admin && actorEmail && email.toLowerCase() === actorEmail) {
      return NextResponse.json(
        { error: "You cannot remove your own admin flag from the UI." },
        { status: 400 }
      );
    }

    const user = await setUserAdminByEmail(email, body.is_admin);
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        is_admin: Boolean(user.is_admin),
        created_at: user.created_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.startsWith("No user found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("[admin/users/admin] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
