import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUserWithPassword, UserAlreadyExistsError } from "@/lib/db/users";
import { inviteErrorMessage, verifyInviteToken } from "@/lib/invite-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, invite } = body as {
      email?: string;
      password?: string;
      name?: string;
      invite?: string;
    };

    const inviteResult = verifyInviteToken(invite);
    if (!inviteResult.ok) {
      return NextResponse.json(
        { error: inviteErrorMessage(inviteResult.reason) },
        { status: 403 }
      );
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await createUserWithPassword({ email, name, passwordHash });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserAlreadyExistsError) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    console.error("[signup] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
