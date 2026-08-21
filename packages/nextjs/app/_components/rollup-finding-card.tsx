import Link from "next/link";
import type { RollupFinding } from "@/lib/findings-registry";

/**
 * Cross-study finding card for the homepage / results rollup — tagged with
 * which study it came from and linking through to that study's full page,
 * instead of the per-study "Finding N" numbering.
 */
export function RollupFindingGrid({ findings }: { findings: RollupFinding[] }) {
  if (findings.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {findings.map((f) => (
        <Link
          key={`${f.studyId}-${f.headline}`}
          href={`/results/${f.studyId}`}
          className="block rounded-xl border border-zinc-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
            {f.studyName}
          </span>
          <h3 className="mt-1.5 text-sm font-semibold text-zinc-900">{f.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.body}</p>
        </Link>
      ))}
    </div>
  );
}
