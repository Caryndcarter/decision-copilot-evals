import type { FindingsStat } from "@/lib/findings-registry";

export function StatStrip({ stats }: { stats: FindingsStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="grid grid-flow-col auto-cols-fr divide-x divide-white/10 border-t border-white/10 overflow-x-auto">
      {stats.map((s) => (
        <div key={s.label} className="min-w-[6.5rem] px-4 py-5 sm:px-6">
          <div className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{s.value}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
