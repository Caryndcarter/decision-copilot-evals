"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResultContent } from "@/app/run/result-content";
import { DemoBriefToolbar } from "@/app/demo/_components/demo-brief-toolbar";
import { demoBriefBodyClass } from "@/app/demo/_components/demo-brief-title-banner";
import { getDemoRun, DEMO_PROVIDERS } from "@/app/demo/_data/demo-fixtures";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import type { LLMProviderName } from "@/types/decision";

function parseProvider(value: string | null): LLMProviderName {
  if (value && DEMO_PROVIDERS.includes(value as LLMProviderName)) {
    return value as LLMProviderName;
  }
  return "openai";
}

function DemoResultContent() {
  const searchParams = useSearchParams();
  const provider = parseProvider(searchParams.get("provider"));
  const result = useMemo(() => getDemoRun(provider), [provider]);

  return (
    <>
      <DemoBriefToolbar view="single" provider={provider} />

      <div className={`${demoBriefBodyClass} ${demoContentClass}`}>
        <ResultContent result={result} hideInlineBriefTitle staticTitleBanner />
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

export default function DemoResultPage() {
  return (
    <Suspense
      fallback={
        <div className={`py-12 ${demoContentClass}`}>
          <p className="text-zinc-600">Loading…</p>
        </div>
      }
    >
      <DemoResultContent />
    </Suspense>
  );
}
