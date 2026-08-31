"use client";

import { HormuzMoralDashboard } from "./hormuz-moral-dashboard";
import { MeridianMoralPanel } from "./meridian-moral-panel";
import { CivitasMoralPanel } from "./civitas-moral-panel";

export function CaseMoralEval({ studyId }: { studyId: string }) {
  switch (studyId) {
    case "meran-tankers":
      return <HormuzMoralDashboard embedded />;
    case "meridian-ic":
      return <MeridianMoralPanel showLeanBars />;
    case "civitas-replication":
      return <CivitasMoralPanel showLeanBars authorshipMode="blind" compareSynthesizers />;
    default:
      return null;
  }
}
