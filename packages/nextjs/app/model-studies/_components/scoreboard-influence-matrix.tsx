import Link from "next/link";

/**
 * Placeholder scoreboard for "influence-matrix" studies that pull from live
 * study batches rather than a committed snapshot (e.g. multi-demo authorship).
 * No numbers are fabricated here — once a batch is committed the same way
 * Meridian/Hormuz are, this can be swapped for a real rollup renderer.
 */
export function InfluenceMatrixPlaceholder({ deepDiveHref }: { deepDiveHref?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
      <p className="text-sm font-medium text-zinc-700">
        This study updates continuously against live study batches.
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        A committed scoreboard snapshot isn&apos;t published yet — the current rollup is in the
        signed-in dashboard.
      </p>
      {deepDiveHref && (
        <Link
          href={deepDiveHref}
          className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Sign in to view the live rollup →
        </Link>
      )}
    </div>
  );
}
