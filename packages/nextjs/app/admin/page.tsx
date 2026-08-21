import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoLockup } from "@/app/components/logo-icon";
import { SessionNav } from "@/app/components/session-nav";
import { auth } from "@/auth";
import { findUserByEmail } from "@/lib/db/users";
import { AdminPanel } from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  const email = session.user.email ?? "";
  // Prefer DB over JWT so a fresh admin:set works even before the next full re-login.
  const dbUser = email ? await findUserByEmail(email) : null;
  const isAdmin = Boolean(
    dbUser?.is_admin ?? (session.user as { is_admin?: boolean }).is_admin
  );
  if (!isAdmin) {
    redirect("/runs");
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <LogoLockup />
          </Link>
          <SessionNav />
        </div>
      </nav>

      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Admin</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Manage invites and admin flags. First admin is still bootstrapped with{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">npm run admin:set</code>.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <AdminPanel currentUserEmail={email} />
      </div>
    </main>
  );
}
