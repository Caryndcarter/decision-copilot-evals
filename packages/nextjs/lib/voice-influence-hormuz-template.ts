/**
 * Map the committed Hormuz / Meran Tankers battery onto a Voice Influence draft.
 * Server/API + tests only — keep the case texts off the list-page client bundle.
 */

import { HORMUZ_VOICE_CASES } from "@/lib/hormuz-voice-cases";
import {
  HORMUZ_CANNED_DEMO,
  VOICE_INFLUENCE_SLOTS,
  parseVoiceInfluenceCase,
  type VoiceInfluenceCase,
  type VoiceInfluenceDraftInput,
} from "@/lib/voice-influence-case-set";

export function hormuzCasesAsVoiceInfluenceConditions(): VoiceInfluenceCase[] {
  if (HORMUZ_VOICE_CASES.length !== VOICE_INFLUENCE_SLOTS.length) {
    throw new Error("Hormuz battery must have exactly five C1–C5 cases");
  }
  return HORMUZ_VOICE_CASES.map((c, index) => {
    const parsed = parseVoiceInfluenceCase(c);
    const slot = VOICE_INFLUENCE_SLOTS[index];
    if (!parsed || !slot) {
      throw new Error(`Could not map Hormuz case ${index + 1} onto ${slot?.code ?? "a slot"}`);
    }
    return { ...parsed, id: slot.key };
  });
}

export function hormuzTemplateDraftInput(): VoiceInfluenceDraftInput {
  return {
    name: HORMUZ_CANNED_DEMO.name,
    decision: HORMUZ_CANNED_DEMO.decision,
    domain: HORMUZ_CANNED_DEMO.domain,
    conditions: hormuzCasesAsVoiceInfluenceConditions(),
  };
}
