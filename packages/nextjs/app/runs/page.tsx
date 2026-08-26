import "server-only";
import { Suspense } from "react";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { SessionNav } from "@/app/components/session-nav";
import { RunsList } from "./runs-list";
import { RunsLoading } from "./runs-loading";

export default async function RunsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; tab?: string; study?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/runs");
  }

  const params = await searchParams;
  const isAdmin = (session.user as { is_admin?: boolean }).is_admin ?? false;

  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <div className="flex items-center gap-3">
            <Link
              href="/intake"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              New decision
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>

      <Suspense fallback={<RunsLoading />}>
        <RunsList
          userId={session.user.id}
          isAdmin={isAdmin}
          newDecisionId={params.new}
          tab={params.tab}
          studyParam={params.study}
        />
      </Suspense>
    </main>
  );
}
