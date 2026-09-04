import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { HORMUZ_CANNED_DEMO } from "@/lib/voice-influence-case-set";
import { hormuzTemplateDraftInput } from "@/lib/voice-influence-hormuz-template";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    findingsHref: HORMUZ_CANNED_DEMO.findingsHref,
    draft: hormuzTemplateDraftInput(),
  });
}
