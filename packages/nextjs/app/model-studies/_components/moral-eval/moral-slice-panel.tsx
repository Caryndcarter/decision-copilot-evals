"use client";

import type { MajorFindingMoralSlice } from "@/lib/cross-study-findings";
import { MeridianMoralPanel } from "./meridian-moral-panel";
import { CivitasMoralPanel } from "./civitas-moral-panel";

export function MoralSlicePanel({ slice }: { slice: MajorFindingMoralSlice }) {
  const panel = (() => {
    switch (slice.studyId) {
      case "meridian-ic":
        return (
          <MeridianMoralPanel
            dimensions={
              slice.dimensions as Parameters<typeof MeridianMoralPanel>[0]["dimensions"]
            }
            cases={slice.cases}
            caption={slice.caption}
          />
        );
      case "civitas-replication":
        return (
          <CivitasMoralPanel
            dimensions={
              slice.dimensions as Parameters<typeof CivitasMoralPanel>[0]["dimensions"]
            }
            trials={slice.trials}
            authorshipMode="blind"
            compareSynthesizers={slice.compareSynthesizers}
            caption={slice.caption}
          />
        );
      default:
        return null;
    }
  })();

  if (!panel) return null;

  return (
    <figure className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white p-4">
      {panel}
    </figure>
  );
}
