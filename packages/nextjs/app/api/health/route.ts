import { NextResponse } from "next/server";
import { clientPromise, DB_NAME } from "@/server/config/mongodb";

/**
 * Health check endpoint
 * GET /api/health — verifies MongoDB is reachable.
 */
export async function GET() {
  try {
    const client = await clientPromise;
    await client.db(DB_NAME).command({ ping: 1 });

    return NextResponse.json({
      status: "ok",
      db: DB_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Health check error:", message);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
