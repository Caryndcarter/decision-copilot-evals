import { getTestTypeCardMetrics, type FindingsStudyMeta, type TestTypeMeta } from "@/lib/findings-registry";

/**
 * Overview-page card for one study — the primary grouping unit. Lists which
 * cases currently live inside it, so it's visible at a glance that a study
 * can (and will) hold more than one case over time.
 */
export function TestTypeCard({
  type,
  studies,
}: {
  type: TestTypeMeta;
  studies: FindingsStudyMeta[];
}) {
  const metrics = getTestTypeCardMetrics(type.id);
  const caseLabel = metrics.caseCount === 1 ? "case" : "cases";
  const detailParts = [
    `${metrics.caseCount} ${caseLabel}`,
    metrics.midSegment,
    metrics.briefCount > 0 ? `${metrics.briefCount} ${metrics.briefLabel}` : null,
  ].filter(Boolean);

  return (
    <div className="block h-full rounded-xl border border-zinc-200 bg-white p-5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-500">
        {type.eyebrow}
      </span>
      <h3 className="mt-2 text-base font-semibold text-zinc-900">{type.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{type.heroQuestion}</p>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-xs text-zinc-500">{detailParts.join(" · ")}</span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {studies.map((s) => (
          <li
            key={s.id}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
          >
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
