"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ResultContent } from "@/app/run/result-content";
import { DemoScrollToTop } from "@/app/demo/_components/demo-scroll-to-top";
import { demoBriefBodyClass } from "@/app/demo/_components/demo-brief-title-banner";
import { getDemoRun } from "@/app/demo/_data/demo-fixtures";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import type { LLMProviderName } from "@/types/decision";

export function DemoResultView({ provider }: { provider: LLMProviderName }) {
  const result = useMemo(() => getDemoRun(provider), [provider]);

  return (
    <>
      <DemoScrollToTop resetKey={provider} />
      <div className={`${demoBriefBodyClass} ${demoContentClass}`}>
        <ResultContent
          result={result}
          hideInlineBriefTitle
          staticTitleBanner
          disableDeepLinkScroll
        />
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 py-6 ${demoContentClass}`}>
        <Link href="/demo/clarify" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Clarifying questions
        </Link>
        <Link
          href="/request-access"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Request access to run your own
        </Link>
      </div>
    </>
  );
}
