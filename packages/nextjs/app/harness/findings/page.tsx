import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoLockup } from "@/app/components/logo-icon";
import { SessionNav } from "@/app/components/session-nav";
import { auth } from "@/auth";
import { buildAuthorshipBatchSummaries } from "@/lib/authorship-harness-summary";
import { listRunsForUser } from "@/lib/db/runs";
import {
  HarnessFindingsDashboard,
  type FindingsStudy,
} from "./findings-dashboard";

export const dynamic = "force-dynamic";

export default async function HarnessFindingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ study?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/harness/findings");
  }

  const params = searchParams ? await searchParams : {};
  const studyParam = params.study?.trim();
  const initialStudy: FindingsStudy =
    studyParam === "meridian-ic-moral"
      ? "meridian-ic-moral"
      : studyParam === "hormuz-moral"
        ? "hormuz-moral"
        : "multi-demo-authorship";

  const runs = await listRunsForUser(session.user.id, { limit: 500 });
  const authorshipBatches = buildAuthorshipBatchSummaries(runs);

  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoLockup />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/runs?tab=studies"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Studies
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <HarnessFindingsDashboard
          authorshipBatches={authorshipBatches}
          initialStudy={initialStudy}
        />
      </div>
    </main>
  );
}
