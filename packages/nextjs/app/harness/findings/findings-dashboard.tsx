"use client";

import { useRouter } from "next/navigation";
import { AuthorshipHarnessDashboard } from "@/app/harness/demos/authorship/authorship-harness-dashboard";
import { CivitasMoralDashboard } from "@/app/harness/civitas/moral/civitas-moral-dashboard";
import { HormuzMoralDashboard } from "@/app/harness/hormuz/moral/hormuz-moral-dashboard";
import { MeridianMoralDashboard } from "@/app/harness/meridian-ic/moral/meridian-moral-dashboard";
import { AuthorshipBudgetConditionsPanel } from "@/app/harness/findings/authorship-budget-conditions-panel";
import type { AuthorshipBatchSummary } from "@/lib/authorship-harness-summary";
import {
  AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_LABEL,
  AUTHORSHIP_BUDGET_CONDITIONS_PURPOSE,
  AUTHORSHIP_BUDGET_CONDITIONS_SCENARIO_LABEL,
  isAuthorshipBudgetConditionsControlBatch,
  isAuthorshipBudgetConditionsConstrainedBatch,
  type HarnessStudyTab,
} from "@/lib/harness-meta";

export type FindingsStudy =
  | "meridian-ic-moral"
  | "hormuz-moral"
  | "civitas-replication-moral"
  | "multi-demo-authorship"
  | "authorship-budget-conditions";

const STUDIES: {
  id: FindingsStudy;
  family: HarnessStudyTab;
  scenarioLabel: string;
  /** One-line hook for the active study */
  blurb: string;
  /** Why we ran this study — shown under the nav */
  purpose: string;
}[] = [
  {
    id: "meridian-ic-moral",
    family: "voice-influence",
    scenarioLabel: "Meridian IC",
    blurb: "Same Civitas facts, five narrator voices — do models rubber-stamp the filer?",
    purpose:
      "People rarely write a neutral brief. We hold the Civitas modernization facts fixed and change only how a PE investment committee narrates them (neutral LP voice, confident tone, inflated urgency, optimistic fast-path, honest-aggressive). Each model writes a Decision Brief; a blind judge codes filer alignment, premise handling, and people-vs-speed lean. Goal: see whether voice and framing alone move recommendations — and whether load-bearing false premises get caught.",
  },
  {
    id: "hormuz-moral",
    family: "voice-influence",
    scenarioLabel: "Hormuz",
    blurb: "Same voice design on tanker ops — is the effect Civitas-only?",
    purpose:
      "A replication of the voice-influence design on a different domain: a fictional Strait of Hormuz tanker operator choosing route, crew risk, and commercial continuity. Same five-voice isolation (provisional lean, confident tone, false urgency, safety-adjacent claim, honest tradeoff). Goal: check that voice effects are about framing pressure, not one PE roll-up story — and whether briefs protect crew when the filer leans commercial.",
  },
  {
    id: "multi-demo-authorship",
    family: "authorship-influence",
    scenarioLabel: "Five demos",
    blurb: "When brands are hidden or swapped, does credit still stick?",
    purpose:
      "Unified Briefs name which think-tank member contributed what — but brand labels may bias the synthesizer. Across five high-conflict demos (hospital PE, VP sales, Gen-AI compliance, banking modernization, Civitas), we synthesize Standard, Blind, and Reassigned briefs and compare influence heatmaps plus moral audits. Goal: measure whether attribution tracks ideas or logos, and whether moral posture shifts when authorship cues change.",
  },
  {
    id: "authorship-budget-conditions",
    family: "authorship-influence",
    scenarioLabel: AUTHORSHIP_BUDGET_CONDITIONS_SCENARIO_LABEL,
    blurb: "Does open-vs-blind credit shift when contribution budget is tight?",
    purpose: AUTHORSHIP_BUDGET_CONDITIONS_PURPOSE,
  },
  {
    id: "civitas-replication-moral",
    family: "replication",
    scenarioLabel: "Civitas",
    blurb: "Full product path, five trials — what’s stable vs one-shot noise?",
    purpose:
      "A single impressive demo can hide trial-to-trial drift. We re-run the full Civitas path (intake → clarification → variant → research → Unified Brief) across five harness trials, then blind-code Unified Briefs for moral lean under Standard, Blind, and Reassigned authorship. Goal: separate durable model behavior from one-off wording luck before we trust patterns from a single run.",
  },
];

const FAMILIES: {
  id: HarnessStudyTab;
  label: string;
  hook: string;
  defaultStudy: FindingsStudy;
}[] = [
  {
    id: "voice-influence",
    label: "Voice influence",
    hook: "Same facts, different narrator framing",
    defaultStudy: "meridian-ic-moral",
  },
  {
    id: "authorship-influence",
    label: "Authorship influence",
    hook: "Does brand labeling change credit?",
    defaultStudy: "multi-demo-authorship",
  },
  {
    id: "replication",
    label: "Replication",
    hook: "Same path across trials — what’s stable?",
    defaultStudy: "civitas-replication-moral",
  },
];

function studiesForFamily(family: HarnessStudyTab) {
  return STUDIES.filter((s) => s.family === family);
}

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
  const family = active.family;
  const familyStudies = studiesForFamily(family);
  const activeFamily = FAMILIES.find((f) => f.id === family) ?? FAMILIES[0]!;

  function selectStudy(id: FindingsStudy) {
    if (id === study) return;
    router.push(`/harness/findings?study=${id}`);
  }

  function selectFamily(next: HarnessStudyTab) {
    if (next === family) return;
    const inFamily = studiesForFamily(next);
    const meta = FAMILIES.find((f) => f.id === next);
    const target =
      inFamily.find((s) => s.id === meta?.defaultStudy)?.id ?? inFamily[0]?.id ?? meta?.defaultStudy;
    if (target) selectStudy(target);
  }

  return (
    <div className="space-y-6">
      <div>
        <div
          className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-px"
          role="tablist"
          aria-label="Test type"
        >
          {FAMILIES.map((f) => {
            const isActive = family === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectFamily(f.id)}
                className={`-mb-px border-b-2 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <span className="block text-sm font-medium">{f.label}</span>
                <span
                  className={`mt-0.5 block max-w-[14rem] text-[11px] leading-snug ${
                    isActive ? "text-indigo-600/80" : "text-zinc-400"
                  }`}
                >
                  {f.hook}
                </span>
              </button>
            );
          })}
        </div>

        {familyStudies.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Scenario
            </span>
            <div
              className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1"
              role="tablist"
              aria-label="Scenario"
            >
              {familyStudies.map((s) => {
                const isActive = study === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectStudy(s.id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white text-indigo-900 shadow-sm ring-1 ring-zinc-200"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {s.scenarioLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            Scenario: <span className="font-medium text-zinc-700">{active.scenarioLabel}</span>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
          Why this test
        </p>
        {familyStudies.length > 1 ? (
          <p className="mt-1 text-xs font-medium text-zinc-500">
            {activeFamily.label} · {active.scenarioLabel}
          </p>
        ) : null}
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600">{active.purpose}</p>
      </div>

      {study === "meridian-ic-moral" ? (
        <MeridianMoralDashboard embedded />
      ) : study === "hormuz-moral" ? (
        <HormuzMoralDashboard embedded />
      ) : study === "civitas-replication-moral" ? (
        <CivitasMoralDashboard embedded />
      ) : study === "authorship-budget-conditions" ? (
        <div className="space-y-6">
          <AuthorshipBudgetConditionsPanel />
          {(() => {
            const live = authorshipBatches.filter(
              (b) =>
                isAuthorshipBudgetConditionsConstrainedBatch(b.batch_id) ||
                isAuthorshipBudgetConditionsControlBatch(b.batch_id)
            );
            if (live.length === 0) return null;
            return (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  Live batches on this account ({AUTHORSHIP_BUDGET_CONDITIONS_SCENARIO_LABEL} /{" "}
                  {AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_LABEL}). Atlas owner only — the table above
                  is the committed snapshot.
                </p>
                <AuthorshipHarnessDashboard batches={live} compactHeader />
              </div>
            );
          })()}
        </div>
      ) : (
        <AuthorshipHarnessDashboard batches={authorshipBatches} compactHeader />
      )}
    </div>
  );
}
