import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import { auth } from "@/auth";
import { listVoiceInfluenceDraftsForUser } from "@/lib/db/voice-influence-drafts";
import { VoiceInfluenceDraftList } from "./voice-influence-draft-list";

export const dynamic = "force-dynamic";

export default async function VoiceInfluenceDraftsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/harness/voice-influence");
  }

  const drafts = await listVoiceInfluenceDraftsForUser(session.user.id);

  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <div className="flex items-center gap-3">
            <Link
              href="/harness/findings"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Study findings
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>

      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
            Researcher only
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            Voice Influence case sets
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
            Author C1–C5 voice conditions using the existing Hormuz / Meridian IC intake fields.
            Launch stays unwired — drafts do not start model runs.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <VoiceInfluenceDraftList drafts={drafts} />
      </div>
    </main>
  );
}
