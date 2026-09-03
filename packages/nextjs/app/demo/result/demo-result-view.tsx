"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ResultContent } from "@/app/run/result-content";
import { DemoBriefGuide } from "@/app/demo/_components/demo-brief-guide";
import { DemoChatPanel } from "@/app/demo/_components/demo-chat-panel";
import { DemoScrollToTop } from "@/app/demo/_components/demo-scroll-to-top";
import { demoBriefBodyClass } from "@/app/demo/_components/demo-brief-title-banner";
import { getDemoRun } from "@/app/demo/_data/demo-fixtures";
import { DEMO_DECISION_BRIEF_CHAT } from "@/app/demo/_data/demo-chat-script";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import type { LLMProviderName } from "@/types/decision";

export function DemoResultView({ provider }: { provider: LLMProviderName }) {
  const result = useMemo(() => getDemoRun(provider), [provider]);
  const [chatPlay, setChatPlay] = useState(false);
  const onSpotChange = useCallback((spot: string | null) => {
    setChatPlay(spot === "demo-chat");
  }, []);

  return (
    <>
      <DemoBriefGuide onSpotChange={onSpotChange} />
      <DemoScrollToTop resetKey={provider} />
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
          <DemoChatPanel script={DEMO_DECISION_BRIEF_CHAT} play={chatPlay} variant="decision" />
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 py-6 ${demoContentClass}`}>
        <Link href="/demo/clarify" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Clarifying questions
        </Link>
        <Link
          href="/demo/unified"
          data-demo-spot="unified-cta"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Continue to Unified Brief →
        </Link>
      </div>
    </>
  );
}
