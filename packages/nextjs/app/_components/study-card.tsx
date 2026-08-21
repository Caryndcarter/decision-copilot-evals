import Link from "next/link";
import type { FindingsStudyMeta } from "@/lib/findings-registry";

export function StudyCard({ study }: { study: FindingsStudyMeta }) {
  const comingSoon = study.status === "coming-soon";

  const card = (
    <div
      className={`group h-full rounded-xl border p-5 transition-all duration-200 ${
        comingSoon
          ? "border-dashed border-zinc-300 bg-zinc-50"
          : "border-zinc-200 bg-white hover:border-indigo-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-500">
          {study.eyebrow}
        </span>
        {comingSoon && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold text-zinc-900">{study.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
        {comingSoon ? study.dek : study.heroQuestion}
      </p>
      {!comingSoon && study.stats[0] && (
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-lg font-bold tabular-nums text-zinc-900">{study.stats[0].value}</span>
          <span className="text-xs text-zinc-400">{study.stats[0].label}</span>
        </div>
      )}
    </div>
  );

  if (comingSoon) return card;

  return (
    <Link href={`/results/${study.id}`} className="block h-full">
      {card}
    </Link>
  );
}
