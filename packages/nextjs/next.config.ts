import type { NextConfig } from "next";
import path from "path";

// Load monorepo root .env so DYNAMODB_ENDPOINT / AWS_* / PROJECT_* are available to API routes (Next only loads from packages/nextjs by default)
import { config } from "dotenv";
config({ path: path.join(__dirname, "../../.env") });
config({ path: path.join(__dirname, "../../.env.local") });

const nextConfig: NextConfig = {
  // TipTap v3 useEditor + React Strict Mode double-mount destroys editors before mount completes.
  reactStrictMode: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
