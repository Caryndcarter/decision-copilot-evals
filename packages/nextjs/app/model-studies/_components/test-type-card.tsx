import Link from "next/link";
import type { FindingsStudyMeta, TestTypeMeta } from "@/lib/findings-registry";

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
  const briefTotal = studies.reduce((sum, s) => sum + (s.briefCount ?? 0), 0);

  return (
    <Link
      href={`/model-studies/results#${type.id}`}
      className="group block h-full rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
    >
      <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-500">
        {type.eyebrow}
      </span>
      <h3 className="mt-2 text-base font-semibold text-zinc-900">{type.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{type.heroQuestion}</p>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums text-zinc-900">{studies.length}</span>
        <span className="text-xs text-zinc-400">
          {studies.length === 1 ? "case" : "cases"}
          {briefTotal > 0 ? ` · ${briefTotal} briefs coded` : ""}
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {studies.map((s) => (
          <li
            key={s.id}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 group-hover:bg-indigo-50 group-hover:text-indigo-700"
          >
            {s.name}
          </li>
        ))}
      </ul>
    </Link>
  );
}
