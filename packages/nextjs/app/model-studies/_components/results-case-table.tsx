import Link from "next/link";
import type { FindingsStudyMeta } from "@/lib/findings-registry";
import {
  getResultsCaseBrowseMeta,
  getResultsCaseRowMetrics,
} from "@/lib/results-browse-meta";

function CaseRow({ study }: { study: FindingsStudyMeta }) {
  const meta = getResultsCaseBrowseMeta(study);
  const metrics = getResultsCaseRowMetrics(study);
  const isPublished = meta.publicationStatus === "published";
  const href = isPublished
    ? `/model-studies/results/${study.id}`
    : study.deepDiveHref ?? `/model-studies/results#${study.testTypeId}`;

  return (
    <tr className="border-b border-zinc-100 last:border-b-0">
      <td className="px-4 py-3 align-top">
        <p className="font-medium text-zinc-900">{meta.caseTag}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{meta.title}</p>
      </td>
      <td className="px-4 py-3 align-top tabular-nums text-zinc-700">{metrics.conditions}</td>
      <td className="px-4 py-3 align-top tabular-nums text-zinc-700">{metrics.models}</td>
      <td className="px-4 py-3 align-top tabular-nums text-zinc-700">{metrics.outputs}</td>
      <td className="px-4 py-3 align-top text-zinc-700">{meta.keyResult}</td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isPublished ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {isPublished ? "Published" : "Ongoing"}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-right">
        {isPublished ? (
          <Link
            href={href}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Open →
          </Link>
        ) : study.deepDiveHref ? (
          <Link
            href={study.deepDiveHref}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Sign in →
          </Link>
        ) : (
          <span className="text-sm text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}

export function ResultsCaseTable({ studies }: { studies: FindingsStudyMeta[] }) {
  if (studies.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-2.5 font-semibold">Case</th>
            <th className="px-4 py-2.5 font-semibold">Conditions</th>
            <th className="px-4 py-2.5 font-semibold">Models</th>
            <th className="px-4 py-2.5 font-semibold">Coded outputs</th>
            <th className="px-4 py-2.5 font-semibold">Headline result</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 font-semibold text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {studies.map((study) => (
            <CaseRow key={study.id} study={study} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
