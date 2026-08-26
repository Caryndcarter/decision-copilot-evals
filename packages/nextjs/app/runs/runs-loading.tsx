export function RunsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-48 rounded bg-zinc-200" />
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="h-5 w-2/3 rounded bg-zinc-200" />
        <div className="mt-3 h-3 w-full rounded bg-zinc-100" />
        <div className="mt-2 h-3 w-4/5 rounded bg-zinc-100" />
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="h-5 w-1/2 rounded bg-zinc-200" />
        <div className="mt-3 h-3 w-full rounded bg-zinc-100" />
      </div>
      <p className="text-center text-sm text-zinc-500">Loading your studies…</p>
    </div>
  );
}
