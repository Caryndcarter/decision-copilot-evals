"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HORMUZ_CANNED_DEMO,
  type VoiceInfluenceDraftSummary,
} from "@/lib/voice-influence-case-set";

export function VoiceInfluenceDraftList({ drafts }: { drafts: VoiceInfluenceDraftSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState<"blank" | "hormuz" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createDraft(template?: "hormuz") {
    setCreating(template ?? "blank");
    setError(null);
    try {
      const res = await fetch("/api/harness/voice-influence-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template === "hormuz" ? { template: "hormuz" } : {}),
      });
      const json = (await res.json()) as { ok?: boolean; draft?: { id: string }; error?: string };
      if (!res.ok || !json.draft?.id) {
        throw new Error(json.error || "Could not create draft");
      }
      router.push(`/harness/voice-influence/${json.draft.id}`);
    } catch (err) {
      setCreating(null);
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
          disabled={creating !== null}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {creating === "blank" ? "Creating…" : "New Voice Influence case set"}
        </button>
      </div>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          Canned demo
        </p>
        <h2 className="mt-1 text-base font-semibold text-zinc-900">{HORMUZ_CANNED_DEMO.name}</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Opens the existing Meran Tankers C1–C5 battery in the builder (same Hormuz intake
          fields). Findings are the committed Hormuz study — this does not start new model runs.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void createDraft("hormuz")}
            disabled={creating !== null}
            className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-60"
          >
            {creating === "hormuz" ? "Opening…" : "Open Hormuz in the builder"}
          </button>
          <Link
            href={HORMUZ_CANNED_DEMO.findingsHref}
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-800 hover:bg-white/80"
          >
            View Hormuz findings
          </Link>
        </div>
      </section>

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
