import { canonicalRunsForUnifiedBriefDecision } from "@/lib/best-of-worlds-incomplete";
import { researchCompletionsForLane, variantsForLane } from "@/lenses/brief";
import type { DecisionRunResult, SynthesisInputInventory } from "@/types/decision";

export type { SynthesisInputInventory };

export function filterEligibleForSynthesis(
  allRuns: DecisionRunResult[],
  posture: string
): DecisionRunResult[] {
  return allRuns.filter((r) => {
    if (r.intake.posture !== posture) return false;
    if (r.status === "awaiting_intake" || r.status === "processing_initial") return false;
    const hasOutputs =
      (r.lens_outputs?.length ?? 0) > 0 || (r.lens_outputs_first_draft?.length ?? 0) > 0;
    return hasOutputs;
  });
}

/** One canonical run per provider · posture · leaning lane (same as Unified Brief). */
export function selectCanonicalRunsForSynthesis(
  eligible: DecisionRunResult[]
): { canonical: DecisionRunResult[]; uniqueProviderCount: number } {
  const canonical = canonicalRunsForUnifiedBriefDecision(eligible);
  const uniqueProviderCount = new Set(
    canonical.map((r) => (r.llm_provider ?? "openai").trim().toLowerCase())
  ).size;
  return { canonical, uniqueProviderCount };
}

export function countSynthesisInputs(
  canonicalRuns: DecisionRunResult[],
  allRuns: DecisionRunResult[]
): SynthesisInputInventory {
  const seenVariants = new Set<string>();
  const seenResearch = new Set<string>();
  for (const run of canonicalRuns) {
    for (const v of variantsForLane(run, allRuns)) {
      const id = v.variant_id?.trim();
      if (id) seenVariants.add(id);
    }
    for (const rc of researchCompletionsForLane(run, allRuns)) {
      const id = rc.research_id?.trim();
      if (id) seenResearch.add(id);
    }
  }
  return {
    compared_run_count: canonicalRuns.length,
    variant_count: seenVariants.size,
    research_count: seenResearch.size,
  };
}

/** Cache key: canonical runs plus every variant/research id in those lanes. */
export function buildSynthesisInputFingerprint(
  canonicalRuns: DecisionRunResult[],
  allRuns: DecisionRunResult[]
): string {
  const runIds = canonicalRuns.map((r) => r.run_id).sort().join(",");
  const variantIds: string[] = [];
  const researchIds: string[] = [];
  for (const run of canonicalRuns) {
    for (const v of variantsForLane(run, allRuns)) {
      const id = v.variant_id?.trim();
      if (id) variantIds.push(id);
    }
    for (const rc of researchCompletionsForLane(run, allRuns)) {
      const id = rc.research_id?.trim();
      if (id) researchIds.push(id);
    }
  }
  variantIds.sort();
  researchIds.sort();
  return `runs:${runIds}|variants:${variantIds.join(",")}|research:${researchIds.join(",")}`;
}
