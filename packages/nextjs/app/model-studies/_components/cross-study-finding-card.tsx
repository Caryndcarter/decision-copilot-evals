import Link from "next/link";
import type {
  MajorFinding,
  MajorFindingEvidenceBar,
  MajorFindingEvidenceBlock,
} from "@/lib/cross-study-findings";
import { getStorySlugForMajorFinding } from "@/lib/model-studies-overview-findings";

function scopeLabel(scope: MajorFinding["scope"]): string {
  return scope === "cross-case" ? "Cross-case finding" : "Case finding";
}

function barFillClass(variant: MajorFindingEvidenceBar["variant"] | undefined): string {
  switch (variant) {
    case "highlight":
      return "h-full rounded-full bg-indigo-500";
    case "phased":
      return "h-full rounded-full bg-indigo-500";
    case "rebuild":
      return "h-full rounded-full bg-indigo-300";
    default:
      return "h-full rounded-full bg-indigo-300";
  }
}

function barLabelClass(variant: MajorFindingEvidenceBar["variant"] | undefined): string {
  switch (variant) {
    case "highlight":
      return "text-indigo-900 font-medium";
    case "phased":
      return "text-indigo-900 font-medium";
    case "rebuild":
      return "text-indigo-800";
    default:
      return "text-indigo-800";
  }
}

export function EvidenceBars({ block }: { block: MajorFindingEvidenceBlock }) {
  return (
    <div>
      <p className="text-[11px] font-medium leading-snug text-zinc-600">{block.caption}</p>
      <ul className="mt-2 space-y-2" aria-label={block.caption}>
        {block.bars.map((bar) => {
          const pct = bar.max > 0 ? Math.round((bar.value / bar.max) * 100) : 0;
          return (
            <li key={bar.label}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className={barLabelClass(bar.variant)}>{bar.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  {bar.value}/{bar.max}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div className={barFillClass(bar.variant)} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {block.takeaway ? (
        <p className="mt-2.5 border-l-2 border-indigo-200 pl-2.5 text-xs leading-snug text-zinc-700">
          {block.takeaway}
        </p>
      ) : null}
    </div>
  );
}

function MajorFindingPanel({ finding, wide = false }: { finding: MajorFinding; wide?: boolean }) {
  // The wide card is the story page's own evidence, so it has nowhere to link back to.
  const storySlug = wide ? undefined : getStorySlugForMajorFinding(finding.id);
  const storyHref = storySlug ? `/model-studies/findings/${storySlug}?from=results` : undefined;

  return (
    <article className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
        {scopeLabel(finding.scope)}
      </p>
      <h3 className="mt-2 text-base font-bold leading-snug tracking-tight text-zinc-900">
        {storyHref ? (
          <Link
            href={storyHref}
            className="underline decoration-indigo-200 decoration-2 underline-offset-4 transition-colors hover:text-indigo-700 hover:decoration-indigo-400"
          >
            {finding.headline}
          </Link>
        ) : (
          finding.headline
        )}
      </h3>
      <p className="mt-1.5 text-xs text-zinc-500">{finding.contextLine}</p>

      <div
        className={`mt-4 flex-1 rounded-lg bg-zinc-50 p-3 ${
          wide && finding.evidence.length > 1
            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "space-y-4"
        }`}
      >
        {finding.evidence.map((block, i) => (
          <EvidenceBars key={i} block={block} />
        ))}
      </div>

      {finding.statsNote ? (
        <p className="mt-3 text-xs font-medium text-zinc-500">{finding.statsNote}</p>
      ) : null}

      {storyHref ? (
        <Link
          href={storyHref}
          className="mt-4 inline-flex items-center gap-1 self-start rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 hover:text-indigo-800"
        >
          Read the full finding →
        </Link>
      ) : null}

      <p className="mt-3 text-xs text-zinc-500">
        <span className="font-medium text-zinc-600">Cases:</span>{" "}
        {finding.supportingCases.map((c, i) => (
          <span key={c.studyId}>
            {i > 0 ? " · " : null}
            <Link
              href={`/model-studies/results/${c.studyId}`}
              className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-indigo-700 hover:decoration-indigo-300"
            >
              {c.label}
            </Link>
          </span>
        ))}
      </p>
    </article>
  );
}

export function MajorFindingGrid({
  findings,
  wide = false,
}: {
  findings: MajorFinding[];
  wide?: boolean;
}) {
  // Multiples of three tile evenly in three columns; any other count (currently four)
  // would leave an orphan on the last row, so those fall back to a 2-up grid.
  const columns = findings.length % 3 === 0 ? "lg:grid-cols-3" : "md:grid-cols-2";

  return (
    <div className={wide ? "grid gap-4" : `grid gap-4 ${columns}`}>
      {findings.map((f) => (
        <MajorFindingPanel key={f.id} finding={f} wide={wide} />
      ))}
    </div>
  );
}

/** @deprecated Use MajorFindingGrid */
export function MajorFindingList({ findings }: { findings: MajorFinding[] }) {
  return <MajorFindingGrid findings={findings} />;
}

/** @deprecated Use MajorFindingGrid */
export function CrossStudyFindingGrid({ findings }: { findings: MajorFinding[] }) {
  return <MajorFindingGrid findings={findings} />;
}
