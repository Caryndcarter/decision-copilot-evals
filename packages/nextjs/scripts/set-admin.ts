/**
 * Grant or revoke the `is_admin` flag on a user (no in-app admin UI).
 *
 * Usage:
 *   npm run admin:set -- --email you@example.com
 *   npm run admin:set -- --email you@example.com --revoke
 *
 * Re-sign-in after changing the flag so the JWT session picks it up.
 */

import { findUserByEmail, setUserAdminByEmail } from "../lib/db/users";

function parseArgs(argv: string[]): { email: string; isAdmin: boolean } {
  let email: string | undefined;
  let isAdmin = true;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--email" && argv[i + 1]) {
      email = argv[++i];
    } else if (arg?.startsWith("--email=")) {
      email = arg.slice("--email=".length);
    } else if (arg === "--revoke") {
      isAdmin = false;
    } else if (arg === "--grant" || arg === "--admin") {
      isAdmin = true;
    }
  }
  if (!email || !email.includes("@")) {
    throw new Error("Usage: npm run admin:set -- --email you@example.com [--revoke]");
  }
  return { email, isAdmin };
}

async function main() {
  const { email, isAdmin } = parseArgs(process.argv.slice(2));
  const before = await findUserByEmail(email);
  if (!before) {
    throw new Error(`No user found for ${email}`);
  }
  const after = await setUserAdminByEmail(email, isAdmin);
  console.log(
    JSON.stringify(
      {
        id: after.id,
        email: after.email,
        is_admin: Boolean(after.is_admin),
        previous_is_admin: Boolean(before.is_admin),
      },
      null,
      2
    )
  );
  console.error(
    isAdmin
      ? "Granted admin. Sign out and sign back in for the session to update."
      : "Revoked admin. Sign out and sign back in for the session to update."
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
