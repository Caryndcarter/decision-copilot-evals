import { NextResponse } from "next/server";
import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { dynamo, RUNS_TABLE } from "@/server/config/dynamodb";

/**
 * Health check endpoint
 * GET /api/health — verifies the DynamoDB runs table is reachable.
 */
export async function GET() {
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: RUNS_TABLE }));

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Health check error:", message);
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
