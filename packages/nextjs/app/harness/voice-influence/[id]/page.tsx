import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import { auth } from "@/auth";
import { getVoiceInfluenceDraftForUser } from "@/lib/db/voice-influence-drafts";
import { VoiceInfluenceBuilder } from "../voice-influence-builder";

export const dynamic = "force-dynamic";

export default async function VoiceInfluenceDraftEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/harness/voice-influence/${id}`);
  }

  const draft = await getVoiceInfluenceDraftForUser(session.user.id, id);
  if (!draft) {
    notFound();
  }

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

      <div className="mx-auto max-w-6xl px-6 py-8">
        <VoiceInfluenceBuilder draft={draft} />
      </div>
    </main>
  );
}
