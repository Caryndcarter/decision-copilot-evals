import Link from "next/link";

/** Demo/tour nav — no session fetch (demo is public; avoids auth API noise when DB is unset). */
export function PublicSessionNav() {
  return (
    <Link
      href="/auth/signin"
      className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
    >
      Sign in
    </Link>
  );
}
