import type { FindingsCard } from "@/lib/findings-registry";

export function FindingCardGrid({ findings }: { findings: FindingsCard[] }) {
  if (findings.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {findings.map((f, i) => (
        <div
          key={f.headline}
          className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
            Finding {i + 1}
          </span>
          <h3 className="mt-1.5 text-sm font-semibold text-zinc-900">{f.headline}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.body}</p>
        </div>
      ))}
    </div>
  );
}
