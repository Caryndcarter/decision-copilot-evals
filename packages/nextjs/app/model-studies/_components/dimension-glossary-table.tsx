type Entry = { code: string; gloss: string };

/**
 * Dimension | plain-English gloss table — for a study whose full rubric is
 * dense enough that a comma-separated sentence of snake_case names isn't
 * readable (e.g. Hormuz's 11 dimensions). See FindingsStudyMeta.dimensionGlossary.
 */
export function DimensionGlossaryTable({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Dimension
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              What it checks
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.code} className="border-b border-zinc-100 last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 align-top font-mono text-xs text-zinc-700">
                {e.code}
              </td>
              <td className="px-4 py-2.5 align-top text-zinc-600">{e.gloss}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
