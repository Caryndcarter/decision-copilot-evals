import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavBrand } from "@/app/components/app-nav-brand";
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
        : studyParam === "civitas-replication-moral"
          ? "civitas-replication-moral"
          : studyParam === "multi-demo-authorship"
            ? "multi-demo-authorship"
            : "meridian-ic-moral";

  // Moral studies use committed JSON snapshots — skip Mongo unless authorship tab.
  const authorshipBatches =
    initialStudy === "multi-demo-authorship"
      ? buildAuthorshipBatchSummaries(
          await listRunsForUser(session.user.id, {
            limit: 500,
            authorshipOnly: true,
          })
        )
      : [];

  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <div className="flex items-center gap-3">
            <Link
              href="/runs?tab=studies"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              My studies
            </Link>
            <Link
              href="/intake"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              New decision
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>

      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
            AI behavior studies
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Study findings</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
            Each tab is a different behavior question we asked of the models. Pick a study to see
            why we ran it, then the coded results. Voice and replication studies use committed moral
            snapshots; authorship pulls live batches.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <HarnessFindingsDashboard
          authorshipBatches={authorshipBatches}
          initialStudy={initialStudy}
        />
      </div>
    </main>
  );
}
