import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { clientPromise } from "@/server/config/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body as { email?: string; password?: string; name?: string };

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "decision-copilot");

    const existing = await db.collection("users").findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.collection("users").insertOne({
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      is_admin: false,
      created_at: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
