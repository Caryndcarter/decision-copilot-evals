"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ResultContent } from "@/app/run/result-content";
import { DemoBriefGuide } from "@/app/demo/_components/demo-brief-guide";
import { DemoScrollToTop } from "@/app/demo/_components/demo-scroll-to-top";
import { demoBriefBodyClass } from "@/app/demo/_components/demo-brief-title-banner";
import { getDemoRun } from "@/app/demo/_data/demo-fixtures";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import type { LLMProviderName } from "@/types/decision";

export function DemoResultView({ provider }: { provider: LLMProviderName }) {
  const result = useMemo(() => getDemoRun(provider), [provider]);

  return (
    <>
      <DemoBriefGuide />
      <DemoScrollToTop resetKey={provider} />
      <div className={`${demoBriefBodyClass} ${demoContentClass}`}>
        <ResultContent
          result={result}
          hideInlineBriefTitle
          staticTitleBanner
          disableDeepLinkScroll
          demoTour
        />
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
