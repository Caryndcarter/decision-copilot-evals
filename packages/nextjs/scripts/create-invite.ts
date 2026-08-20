/**
 * Mint an expiring invite signup URL.
 *
 * Usage:
 *   npm run invite:create
 *   npm run invite:create -- --days 3
 *   npm run invite:create -- --days 1 --base-url http://localhost:3001
 */

import { createInviteToken } from "../lib/invite-token";

function parseArgs(argv: string[]): { days: number; baseUrl?: string } {
  let days = 7;
  let baseUrl: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--days" && argv[i + 1]) {
      days = Number(argv[++i]);
    } else if (arg?.startsWith("--days=")) {
      days = Number(arg.slice("--days=".length));
    } else if (arg === "--base-url" && argv[i + 1]) {
      baseUrl = argv[++i];
    } else if (arg?.startsWith("--base-url=")) {
      baseUrl = arg.slice("--base-url=".length);
    }
  }
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("--days must be a positive number");
  }
  return { days, baseUrl };
}

function resolveBaseUrl(override?: string): string {
  const raw =
    override ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    `http://localhost:${process.env.PORT || "3001"}`;
  return raw.replace(/\/$/, "");
}

function main() {
  const { days, baseUrl } = parseArgs(process.argv.slice(2));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const token = createInviteToken({ expiresAt });
  const url = `${resolveBaseUrl(baseUrl)}/auth/signup?invite=${encodeURIComponent(token)}`;

  console.log(url);
  console.error(`Expires: ${expiresAt.toISOString()} (${days} day${days === 1 ? "" : "s"})`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
