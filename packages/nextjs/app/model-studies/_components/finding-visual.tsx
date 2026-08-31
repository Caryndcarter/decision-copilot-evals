import type { ReactNode } from "react";
import type { FindingVisualTheme } from "@/lib/model-studies-overview-findings";

export type { FindingVisualTheme };

const themes: Record<
  FindingVisualTheme,
  { gradient: string; svg: ReactNode; caption: string }
> = {
  "capital-risk": {
    gradient: "from-amber-950 via-zinc-900 to-indigo-950",
    caption: "Sponsor-side downside prioritized · risk bearer coding",
    svg: (
      <>
        <rect x="44" y="128" width="36" height="56" rx="4" fill="rgba(129,140,248,0.25)" />
        <rect x="92" y="140" width="36" height="44" rx="4" fill="rgba(129,140,248,0.2)" />
        <rect x="140" y="132" width="36" height="52" rx="4" fill="rgba(129,140,248,0.22)" />
        <path
          d="M40 200 H240"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="196" cy="88" r="52" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.45)" strokeWidth="2" />
        <text
          x="196"
          y="108"
          textAnchor="middle"
          fill="rgba(251,191,36,0.95)"
          fontSize="56"
          fontWeight="700"
          fontFamily="ui-serif, Georgia, serif"
        >
          $
        </text>
      </>
    ),
  },
  "crew-risk": {
    gradient: "from-slate-950 via-indigo-950 to-cyan-950",
    caption: "Crew-risk framing · Meran Tankers routing decision",
    svg: (
      <>
        <path
          d="M0 160 Q60 140 120 155 T240 150 L280 160 L280 200 L0 200 Z"
          fill="rgba(34,211,238,0.12)"
        />
        <path
          d="M0 175 Q80 158 160 172 T320 165 L320 200 L0 200 Z"
          fill="rgba(99,102,241,0.18)"
        />
        <path
          d="M120 118 L200 118 L188 148 L132 148 Z"
          fill="rgba(226,232,240,0.85)"
        />
        <rect x="148" y="92" width="24" height="26" rx="2" fill="rgba(226,232,240,0.7)" />
        <path d="M132 148 L188 148 L176 168 L144 168 Z" fill="rgba(148,163,184,0.5)" />
        <circle cx="200" cy="108" r="6" fill="rgba(251,191,36,0.9)" />
        <path
          d="M48 130 Q100 110 156 125"
          stroke="rgba(34,211,238,0.5)"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
        />
      </>
    ),
  },
  "workforce-pace": {
    gradient: "from-zinc-950 via-violet-950 to-indigo-900",
    caption: "Modernization pace · Civitas replication trials",
    svg: (
      <>
        <rect x="40" y="140" width="48" height="48" rx="6" fill="rgba(129,140,248,0.25)" />
        <rect x="104" y="116" width="48" height="72" rx="6" fill="rgba(129,140,248,0.4)" />
        <rect x="168" y="88" width="48" height="100" rx="6" fill="rgba(167,139,250,0.55)" />
        <rect x="232" y="56" width="48" height="132" rx="6" fill="rgba(196,181,253,0.35)" />
        <path d="M36 188 H252" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
        <circle cx="64" cy="124" r="10" fill="rgba(167,139,250,0.3)" stroke="rgba(196,181,253,0.6)" />
        <circle cx="128" cy="100" r="10" fill="rgba(167,139,250,0.3)" stroke="rgba(196,181,253,0.6)" />
        <circle cx="192" cy="72" r="10" fill="rgba(167,139,250,0.3)" stroke="rgba(196,181,253,0.6)" />
        <path
          d="M74 124 L118 100 L182 72"
          stroke="rgba(196,181,253,0.45)"
          strokeWidth="2"
          strokeDasharray="4 6"
          fill="none"
        />
      </>
    ),
  },
  "self-credit": {
    gradient: "from-zinc-950 via-indigo-950 to-rose-950",
    caption: "Self vs peer influence · authorship budget conditions",
    svg: (
      <>
        <rect x="52" y="72" width="72" height="112" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
        <rect x="156" y="72" width="72" height="112" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
        <rect x="68" y="108" width="40" height="56" rx="4" fill="rgba(244,63,94,0.55)" />
        <text x="88" y="142" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
          4.0
        </text>
        <text x="88" y="158" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
          self
        </text>
        <rect x="172" y="148" width="40" height="16" rx="4" fill="rgba(129,140,248,0.55)" />
        <text x="192" y="160" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
          1.9
        </text>
        <text x="192" y="176" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
          peers
        </text>
        <path
          d="M124 128 L156 128"
          stroke="rgba(251,191,36,0.7)"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(251,191,36,0.7)" />
          </marker>
        </defs>
      </>
    ),
  },
  "brand-favor": {
    gradient: "from-zinc-950 via-rose-950 to-indigo-950",
    caption: "Peer high ratings · same Grok work, 14/30 named → 23/30 remapped",
    svg: (
      <>
        <rect x="40" y="56" width="88" height="128" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
        <rect x="152" y="56" width="88" height="128" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
        <rect x="56" y="122" width="56" height="47" rx="4" fill="rgba(244,63,94,0.5)" />
        <text x="84" y="150" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
          14/30
        </text>
        <text x="84" y="176" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
          named Grok
        </text>
        <rect x="168" y="91" width="56" height="78" rx="4" fill="rgba(129,140,248,0.6)" />
        <text x="196" y="134" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
          23/30
        </text>
        <text x="196" y="176" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
          another name
        </text>
      </>
    ),
  },
};

export function FindingVisual({
  theme,
  className = "",
  showCaption = false,
}: {
  theme: FindingVisualTheme;
  className?: string;
  showCaption?: boolean;
}) {
  const { gradient, svg, caption } = themes[theme];
  return (
    <figure className={className}>
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${gradient} aspect-[4/3] sm:aspect-[3/2]`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <svg
          viewBox="0 0 280 200"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {svg}
        </svg>
      </div>
      {showCaption ? (
        <figcaption className="mt-2 border-l-2 border-zinc-300 pl-2.5 text-[11px] leading-snug text-zinc-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
