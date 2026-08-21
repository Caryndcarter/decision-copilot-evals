/**
 * Shared admin gate for /admin pages and /api/admin/* routes.
 */

import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type AdminSessionUser = {
  id: string;
  email?: string | null;
  is_admin?: boolean;
};

export async function requireAdminSession(): Promise<
  | { ok: true; user: AdminSessionUser }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  const user = session?.user as AdminSessionUser | undefined;
  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!user.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, user };
}
