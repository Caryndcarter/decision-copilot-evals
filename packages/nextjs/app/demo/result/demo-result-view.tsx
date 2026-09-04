"use client";

import { useCallback, useMemo, useState } from "react";
import { ResultContent } from "@/app/run/result-content";
import { DemoBriefGuide } from "@/app/demo/_components/demo-brief-guide";
import { DemoChatPanel } from "@/app/demo/_components/demo-chat-panel";
import { DemoContinueBar } from "@/app/demo/_components/demo-continue-bar";
import { DemoScrollToTop } from "@/app/demo/_components/demo-scroll-to-top";
import { demoBriefBodyClass } from "@/app/demo/_components/demo-brief-title-banner";
import { getDemoRun } from "@/app/demo/_data/demo-fixtures";
import { DEMO_DECISION_BRIEF_CHAT } from "@/app/demo/_data/demo-chat-script";
import type { DemoGuideState } from "@/app/demo/_components/demo-replay";
import { useDemoReplayKey } from "@/app/demo/_components/use-demo-replay-key";
import type { LLMProviderName } from "@/types/decision";

const IDLE_GUIDE: DemoGuideState = { ready: false, dismissed: false, spot: null, generation: 0 };

export function DemoResultView({ provider }: { provider: LLMProviderName }) {
  const result = useMemo(() => getDemoRun(provider), [provider]);
  const [guide, setGuide] = useState<DemoGuideState>(IDLE_GUIDE);
  const onGuideState = useCallback((state: DemoGuideState) => setGuide(state), []);
  const chatPlayKey = useDemoReplayKey(
    guide.ready,
    guide.dismissed,
    guide.spot,
    guide.generation,
    "demo-chat"
  );

  const continueBack = { href: "/demo/clarify", label: "← Clarifying questions" };

  return (
    <>
      <DemoBriefGuide onGuideState={onGuideState} />
      <DemoScrollToTop resetKey={provider} />
      <DemoContinueBar
        className="border-t"
        back={continueBack}
        forward={{ href: "/demo/unified", label: "Continue to Unified Brief →" }}
      />
      <div className={`${demoBriefBodyClass} mx-auto max-w-[1400px] px-6`}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div>
            <ResultContent
              result={result}
              hideInlineBriefTitle
              staticTitleBanner
              disableDeepLinkScroll
              demoTour
            />
          </div>
          <DemoChatPanel script={DEMO_DECISION_BRIEF_CHAT} playKey={chatPlayKey} variant="decision" />
        </div>
      </div>
      <DemoContinueBar
        className="border-t"
        back={continueBack}
        forward={{ href: "/demo/unified", label: "Continue to Unified Brief →", spot: "unified-cta" }}
      />
    </>
  );
}
