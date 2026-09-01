export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

/** Ring colors shared by the brand-favoritism donuts. */
export const DONUT_COLORS = {
  peerHigh: "#6366f1",
  peerRest: "#c7d2fe",
  selfExcluded: "#d4d4d8",
  shownAsOpenai: "#6366f1",
  shownAsAnthropic: "#a78bfa",
  shownAsGemini: "#38bdf8",
} as const;

/**
 * Part-to-whole ring. Segments must sum to `total` so every rating cell is
 * visible — that accounting is the point of these charts.
 */
export function Donut({
  segments,
  total,
  centerValue,
  centerLabel,
  size = 148,
}: {
  segments: DonutSegment[];
  total: number;
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  const description = segments.map((s) => `${s.label}: ${s.value}`).join(", ");

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${centerLabel}. ${description}. Total ${total}.`}
    >
      <g transform="rotate(-90 50 50)">
        {segments.map((segment) => {
          const length = total > 0 ? (segment.value / total) * circumference : 0;
          const arc = (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="15"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-consumed}
            />
          );
          consumed += length;
          return arc;
        })}
      </g>
      <text
        x="50"
        y="49"
        textAnchor="middle"
        fill="#18181b"
        fontSize="16"
        fontWeight="700"
      >
        {centerValue}
      </text>
      <text x="50" y="61" textAnchor="middle" fill="#71717a" fontSize="7.5">
        {centerLabel}
      </text>
    </svg>
  );
}

/** Swatches for a ring. Omit `value` when the count differs per ring. */
export function DonutLegend({
  items,
}: {
  items: Array<{ label: string; color: string; value?: number }>;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-zinc-600">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>
            {item.label}
            {item.value === undefined ? null : (
              <> <span className="font-medium tabular-nums">{item.value}</span></>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
