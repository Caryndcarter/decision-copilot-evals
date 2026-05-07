import type { SynthesisSourceRef } from "@/types/decision";
import { SYNTHESIS_HIGHLIGHT_QUERY_KEY } from "@/lib/synthesis-in-page-highlight";

function appendHighlightQuery(qs: string, ref: SynthesisSourceRef): string {
  const q = ref.text_quote?.trim();
  if (!q || q.length < 8) return qs;
  const safe = q.replace(/\s+/g, " ").slice(0, 220);
  return `${qs}&${SYNTHESIS_HIGHLIGHT_QUERY_KEY}=${encodeURIComponent(safe)}`;
}

const FRAGMENT: Record<SynthesisSourceRef["section"], string> = {
  risk: "rc-risk",
  reversibility: "rc-reversibility",
  people: "rc-people",
  brief: "rc-brief",
  variants: "rc-variant-sections",
  context: "rc-context",
  research: "research-output-panel",
};

/**
 * Chat URL + hash to scroll the user to the cited part of that provider’s run.
 * When a specific saved variant is cited, `variant` is added so the chat page selects that analysis version before scrolling.
 */
export function synthesisSourceRefHref(runId: string | undefined, ref: SynthesisSourceRef): string | undefined {
  if (!runId?.trim()) return undefined;
  let qs = `run_id=${encodeURIComponent(runId.trim())}`;
  if (ref.section === "variants" && ref.variant_id?.trim()) {
    qs += `&variant=${encodeURIComponent(ref.variant_id.trim())}`;
  }
  qs = appendHighlightQuery(qs, ref);
  const base = `/run/chat?${qs}`;
  if (ref.section === "research" && ref.research_id?.trim()) {
    return `${base}#research-completion-${encodeURIComponent(ref.research_id.trim())}`;
  }
  const frag = FRAGMENT[ref.section];
  return frag ? `${base}#${frag}` : undefined;
}

/** Short label for a source-ref chip next to a synthesis point */
export function synthesisSourceRefLabel(ref: SynthesisSourceRef): string {
  switch (ref.section) {
    case "risk":
      return "Risk lens";
    case "reversibility":
      return "Reversibility";
    case "people":
      return "People";
    case "brief":
      return "Brief";
    case "variants":
      return ref.variant_id ? "Variant" : "Variants";
    case "context":
      return "Context";
    case "research":
      return "Research";
    default:
      return ref.section;
  }
}
