import Link from "next/link";
import type { FindingsStudyMeta } from "@/lib/findings-registry";
import { getResultsCaseBrowseMeta } from "@/lib/results-browse-meta";

export function ResultsCaseCard({ study }: { study: FindingsStudyMeta }) {
  const meta = getResultsCaseBrowseMeta(study);
  const isPublished = meta.publicationStatus === "published";
  const href = isPublished ? `/model-studies/results/${study.id}` : study.deepDiveHref ?? `/model-studies/results#${study.testTypeId}`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isPublished ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {isPublished ? "Published" : "Ongoing"}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {meta.caseTag}
        </span>
      </div>
      <h3 className="mt-2 text-base font-semibold text-zinc-900">{meta.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{meta.keyResult}</p>
      {isPublished ? (
        <Link
          href={href}
          className="mt-4 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View case results →
        </Link>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          No committed public result yet —{" "}
          {study.deepDiveHref ? (
            <Link href={study.deepDiveHref} className="font-semibold text-indigo-600 hover:text-indigo-800">
              sign in for live rollup
            </Link>
          ) : (
            "rollup updates with each harness run"
          )}
        </p>
      )}
    </div>
  );
}
