"use client";

import { useRouter } from "next/navigation";
import { AuthorshipHarnessDashboard } from "@/app/harness/demos/authorship/authorship-harness-dashboard";
import { CivitasMoralDashboard } from "@/app/harness/civitas/moral/civitas-moral-dashboard";
import { HormuzMoralDashboard } from "@/app/harness/hormuz/moral/hormuz-moral-dashboard";
import { MeridianMoralDashboard } from "@/app/harness/meridian-ic/moral/meridian-moral-dashboard";
import type { AuthorshipBatchSummary } from "@/lib/authorship-harness-summary";

export type FindingsStudy =
  | "meridian-ic-moral"
  | "hormuz-moral"
  | "civitas-replication-moral"
  | "multi-demo-authorship";

const STUDIES: {
  id: FindingsStudy;
  label: string;
  /** One-line hook on the tab button */
  blurb: string;
  /** Why we ran this study — shown under the tab strip */
  purpose: string;
}[] = [
  {
    id: "meridian-ic-moral",
    label: "Voice influence · Meridian IC",
    blurb: "Same Civitas facts, five narrator voices — do models rubber-stamp the filer?",
    purpose:
      "People rarely write a neutral brief. We hold the Civitas modernization facts fixed and change only how a PE investment committee narrates them (neutral LP voice, confident tone, inflated urgency, optimistic fast-path, honest-aggressive). Each model writes a Decision Brief; a blind judge codes filer alignment, premise handling, and people-vs-speed lean. Goal: see whether voice and framing alone move recommendations — and whether load-bearing false premises get caught.",
  },
  {
    id: "hormuz-moral",
    label: "Voice influence · Hormuz",
    blurb: "Same voice design on tanker ops — is the effect Civitas-only?",
    purpose:
      "A replication of the voice-influence design on a different domain: a fictional Strait of Hormuz tanker operator choosing route, crew risk, and commercial continuity. Same five-voice isolation (provisional lean, confident tone, false urgency, safety-adjacent claim, honest tradeoff). Goal: check that voice effects are about framing pressure, not one PE roll-up story — and whether briefs protect crew when the filer leans commercial.",
  },
  {
    id: "civitas-replication-moral",
    label: "Replication · Civitas",
    blurb: "Full product path, five trials — what’s stable vs one-shot noise?",
    purpose:
      "A single impressive demo can hide trial-to-trial drift. We re-run the full Civitas path (intake → clarification → variant → research → Unified Brief) across five harness trials, then blind-code Unified Briefs for moral lean under Standard, Blind, and Reassigned authorship. Goal: separate durable model behavior from one-off wording luck before we trust patterns from a single run.",
  },
  {
    id: "multi-demo-authorship",
    label: "Authorship influence · five demos",
    blurb: "When brands are hidden or swapped, does credit still stick?",
    purpose:
      "Unified Briefs name which think-tank member contributed what — but brand labels may bias the synthesizer. Across five high-conflict demos (hospital PE, VP sales, Gen-AI compliance, banking modernization, Civitas), we synthesize Standard, Blind, and Reassigned briefs and compare influence heatmaps plus moral audits. Goal: measure whether attribution tracks ideas or logos, and whether moral posture shifts when authorship cues change.",
  },
];

export function HarnessFindingsDashboard({
  authorshipBatches,
  initialStudy = "meridian-ic-moral",
}: {
  authorshipBatches: AuthorshipBatchSummary[];
  initialStudy?: FindingsStudy;
}) {
  const router = useRouter();
  const study = initialStudy;
  const active = STUDIES.find((s) => s.id === study) ?? STUDIES[0]!;

  function selectStudy(id: FindingsStudy) {
    if (id === study) return;
    router.push(`/harness/findings?study=${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Study">
        {STUDIES.map((s) => {
          const isActive = study === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectStudy(s.id)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                isActive
                  ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
              }`}
            >
              <span className="block text-sm font-semibold">{s.label}</span>
              <span className="mt-0.5 block max-w-[18rem] text-[11px] leading-snug opacity-80">
                {s.blurb}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
          Why this test
        </p>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600">{active.purpose}</p>
      </div>

      {study === "meridian-ic-moral" ? (
        <MeridianMoralDashboard embedded />
      ) : study === "hormuz-moral" ? (
        <HormuzMoralDashboard embedded />
      ) : study === "civitas-replication-moral" ? (
        <CivitasMoralDashboard embedded />
      ) : (
        <AuthorshipHarnessDashboard batches={authorshipBatches} compactHeader />
      )}
    </div>
  );
}
