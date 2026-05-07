/**
 * Brief synthesis product line (see `lenses/brief.ts`).
 *
 * - `flexibility`: No optional appendices before clarification; after clarification, 0–3 `custom_sections`.
 * - `delete`: Same as flexibility, plus when regenerating a published brief the model may revise or drop
 *   prior core fields and appendices (see prompts); `next_steps` still needs ≥3 items for the JSON schema.
 *
 * Override anytime: `DECISION_BRIEF_PROFILE=flexibility` or `DECISION_BRIEF_PROFILE=delete`.
 *
 * Branch default: `ai-flexibility` → `flexibility`; `ai-delete` → `delete` (change `PROFILE_FROM_BRANCH` when merging).
 */
export type BriefProfile = "flexibility" | "delete";

const PROFILE_FROM_BRANCH: BriefProfile = "delete";

function profileFromEnv(): BriefProfile | null {
  const v = process.env.DECISION_BRIEF_PROFILE?.trim().toLowerCase();
  if (v === "delete" || v === "flexibility") return v;
  return null;
}

export const BRIEF_PROFILE: BriefProfile = profileFromEnv() ?? PROFILE_FROM_BRANCH;

export const BRIEF_PROFILE_IS_DELETE: boolean = BRIEF_PROFILE === "delete";
