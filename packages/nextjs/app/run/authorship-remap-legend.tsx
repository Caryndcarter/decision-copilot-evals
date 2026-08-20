import type { LLMProviderName } from "@/types/decision";
import { scrambleMappingRows } from "@/lib/unified-brief-blind";

export interface AuthorshipRemapLegendProps {
  /** real provider → brand key shown to the brief author */
  remap: Partial<Record<LLMProviderName, LLMProviderName>> | undefined;
  /** Optional context, e.g. "Claude" when showing one synthesizer's scramble */
  synthesizerLabel?: string;
  className?: string;
  /** Tighter styling for print / PDF appendix */
  compact?: boolean;
}

/**
 * Reveals reassigned-authorship mapping: true think-tank member vs brand the brief author saw.
 */
export function AuthorshipRemapLegend({
  remap,
  synthesizerLabel,
  className = "",
  compact = false,
}: AuthorshipRemapLegendProps) {
  const rows = scrambleMappingRows(remap);
  if (rows.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50/70 ${compact ? "px-3 py-2" : "px-3.5 py-3"} ${className}`.trim()}
    >
      <p
        className={`font-semibold uppercase tracking-wide text-amber-900 ${
          compact ? "text-[10px]" : "text-[11px]"
        }`}
      >
        Brand remapping
        {synthesizerLabel ? ` — what ${synthesizerLabel} saw` : " — what the brief author saw"}
      </p>
      <p className={`mt-1 text-amber-900/80 ${compact ? "text-[11px]" : "text-xs"}`}>
        Real think-tank member → brand label in the prompt (decoded for you below / in charts).
      </p>
      <ul className={`mt-2 space-y-1 ${compact ? "text-xs" : "text-sm"} text-amber-950`}>
        {rows.map((row) => (
          <li key={row.real} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-semibold">{row.realLabel}</span>
            <span className="text-amber-800/70" aria-hidden>
              →
            </span>
            <span>
              appeared as <span className="font-semibold">{row.shownAsLabel}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
