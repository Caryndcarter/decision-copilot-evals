/**
 * Session gate for API route handlers (defense in depth alongside auth proxy).
 */

import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId };
}
