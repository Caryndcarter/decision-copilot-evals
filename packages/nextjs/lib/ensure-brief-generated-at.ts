import type { DecisionBrief } from "@/types/decision";

/** Ensure every persisted brief has an ISO generation timestamp (legacy rows may lack one). */
export function ensureBriefGeneratedAt(brief: DecisionBrief): DecisionBrief {
  if (brief.generated_at?.trim()) return brief;
  return { ...brief, generated_at: new Date().toISOString() };
}
