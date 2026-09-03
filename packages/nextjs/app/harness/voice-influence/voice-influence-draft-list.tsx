"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VoiceInfluenceDraftSummary } from "@/lib/voice-influence-case-set";

export function VoiceInfluenceDraftList({ drafts }: { drafts: VoiceInfluenceDraftSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDraft() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/harness/voice-influence-drafts", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; draft?: { id: string }; error?: string };
      if (!res.ok || !json.draft?.id) {
        throw new Error(json.error || "Could not create draft");
      }
      router.push(`/harness/voice-influence/${json.draft.id}`);
    } catch (err) {
      setCreating(false);
      setError(err instanceof Error ? err.message : "Could not create draft");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Drafts are stored for your signed-in account. They are not public Model Studies.
        </p>
        <button
          type="button"
          onClick={() => void createDraft()}
          disabled={creating}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {creating ? "Creating…" : "New Voice Influence case set"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {drafts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm text-zinc-500">
          No drafts yet. Create a five-condition Voice Influence case set to start.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <Link
                href={`/harness/voice-influence/${draft.id}`}
                className="block px-5 py-4 hover:bg-zinc-50"
              >
                <p className="font-medium text-zinc-900">{draft.name || "Untitled case set"}</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {draft.decision || "No decision sentence yet"}
                  {draft.domain ? ` · ${draft.domain}` : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Updated {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : "—"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
