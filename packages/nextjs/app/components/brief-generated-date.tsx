import { formatBriefDate } from "@/lib/format-brief-date";

/** Shown under the brief title on analysis pages and in print-friendly layouts. */
export function BriefGeneratedDateLine({
  iso,
  className = "",
  label = "Brief generated",
}: {
  iso?: string | null;
  className?: string;
  /** Prefix before the formatted date (default: "Brief generated"). */
  label?: string;
}) {
  const trimmed = iso?.trim();
  if (!trimmed) return null;
  return (
    <p className={`text-xs text-zinc-500 print:text-zinc-600 ${className}`.trim()}>
      {label} {formatBriefDate(trimmed)}
    </p>
  );
}
