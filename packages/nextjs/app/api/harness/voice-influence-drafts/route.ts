import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createVoiceInfluenceDraft,
  listVoiceInfluenceDraftsForUser,
} from "@/lib/db/voice-influence-drafts";
import { parseVoiceInfluenceDraftInput } from "@/lib/voice-influence-case-set";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const drafts = await listVoiceInfluenceDraftsForUser(session.user.id);
    return NextResponse.json({ ok: true, drafts });
  } catch (err) {
    console.error("[voice-influence-drafts] list failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const hasPayload =
      body &&
      typeof body === "object" &&
      (typeof (body as { name?: unknown }).name === "string" ||
        Array.isArray((body as { conditions?: unknown }).conditions));
    if (hasPayload) {
      const parsed = parseVoiceInfluenceDraftInput(body);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const draft = await createVoiceInfluenceDraft(session.user.id, parsed.data);
      return NextResponse.json({ ok: true, draft }, { status: 201 });
    }
    const draft = await createVoiceInfluenceDraft(session.user.id);
    return NextResponse.json({ ok: true, draft }, { status: 201 });
  } catch (err) {
    console.error("[voice-influence-drafts] create failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
