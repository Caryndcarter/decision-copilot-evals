"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function SessionNav() {
  const { data: session } = useSession();
  if (!session) {
    return (
      <Link href="/auth/signin" className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
        Sign in
      </Link>
    );
  }
  const isAdmin = Boolean((session.user as { is_admin?: boolean } | undefined)?.is_admin);

  return (
    <div className="flex items-center gap-3">
      <Link href="/runs" className="text-sm text-zinc-300 hover:text-white transition-colors">
        My decisions
      </Link>
      {isAdmin && (
        <Link href="/admin" className="text-sm text-zinc-300 hover:text-white transition-colors">
          Admin
        </Link>
      )}
      <span className="text-sm text-zinc-400">{session.user?.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
