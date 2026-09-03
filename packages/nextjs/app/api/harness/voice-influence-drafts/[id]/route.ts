import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getVoiceInfluenceDraftForUser,
  updateVoiceInfluenceDraftForUser,
} from "@/lib/db/voice-influence-drafts";
import { parseVoiceInfluenceDraftInput } from "@/lib/voice-influence-case-set";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const draft = await getVoiceInfluenceDraftForUser(session.user.id, id);
    if (!draft) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    console.error("[voice-influence-drafts] get failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = parseVoiceInfluenceDraftInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const draft = await updateVoiceInfluenceDraftForUser(session.user.id, id, parsed.data);
    if (!draft) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("five conditions") || message.includes("not a valid")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[voice-influence-drafts] update failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
