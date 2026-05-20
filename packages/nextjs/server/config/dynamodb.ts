import "server-only";
import { DynamoDB, type DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const PROJECT_KEY = process.env.PROJECT_KEY || "decision-copilot";
const PROJECT_ENV = process.env.PROJECT_ENV || "local";

/**
 * Single-table layout (`one-table` branch): one physical table for NextAuth
 * (USER#/SESSION#/… items) and decision runs (`RUN#` + `run_id` body).
 *
 * Override with `APP_TABLE_NAME`. `RUNS_TABLE` / `AUTH_TABLE` are kept as
 * aliases so `lib/db/runs.ts` and `lib/db/users.ts` both target the same table.
 */
export const APP_TABLE =
  process.env.APP_TABLE_NAME || `${PROJECT_KEY}-${PROJECT_ENV}-app`;
export const RUNS_TABLE = APP_TABLE;
export const AUTH_TABLE = APP_TABLE;

export const RUNS_GSI_BY_DECISION = "by-decision";
export const RUNS_GSI_BY_USER = "by-user";

function buildClient(): DynamoDBDocument {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  const config: DynamoDBClientConfig = { region };

  if (endpoint) {
    // Local DynamoDB. Pass dummy creds inline so we never accidentally pick
    // up a real ~/.aws profile and try to write to a production table.
    config.endpoint = endpoint;
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
    };
  }
  // When endpoint is unset we let the AWS SDK use its default credential
  // provider chain (env, IAM role, etc.) — that path is for real deploys.

  // We deliberately use DynamoDBDocument (not DynamoDBDocumentClient) because
  // @auth/dynamodb-adapter's signature requires it. Both wrap the low-level
  // DynamoDB client and provide marshall/unmarshall; they are interchangeable
  // at the call sites we care about.
  return DynamoDBDocument.from(new DynamoDB(config), {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
  });
}

// Cache the doc client on globalThis to survive Next.js HMR in dev, the
// same trick the old Mongo client used.
const globalForDynamo = globalThis as unknown as {
  _dynamoDocClient?: DynamoDBDocument;
};

export const dynamo: DynamoDBDocument =
  globalForDynamo._dynamoDocClient ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForDynamo._dynamoDocClient = dynamo;
}
