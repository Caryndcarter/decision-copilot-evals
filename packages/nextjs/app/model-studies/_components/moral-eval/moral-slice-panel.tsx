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
            highlight={
              slice.highlight as Parameters<typeof MeridianMoralPanel>[0]["highlight"]
            }
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
            synthesizerOrder={slice.synthesizerOrder}
            highlight={
              slice.highlight as Parameters<typeof CivitasMoralPanel>[0]["highlight"]
            }
            caption={slice.caption}
          />
        );
      default:
        return null;
    }
  })();

  if (!panel) return null;

  return <div className="min-w-0">{panel}</div>;
}
