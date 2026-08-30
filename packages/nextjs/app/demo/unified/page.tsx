"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BriefGeneratedDateLine } from "@/app/components/brief-generated-date";
import { CollapsibleBlock } from "@/app/run/collapsible-block";
import { DemoBriefToolbar } from "@/app/demo/_components/demo-brief-toolbar";
import { DemoBriefTitleBanner, demoBriefBodyClass } from "@/app/demo/_components/demo-brief-title-banner";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import {
  DEMO_PROVIDERS,
  DEMO_UNIFIED_AUTHORSHIP_MODE,
  DEMO_UNIFIED_BRIEF,
  DEMO_UNIFIED_FACT_CHECK_JUDGE,
  DEMO_UNIFIED_SYNTHESIZER,
} from "@/app/demo/_data/demo-fixtures";
import { TOUR_DISAGREEMENTS, TOUR_UNIFIED_BRIEF } from "@/app/tour/_data/tour-demo-data";
import { runProviderLabel } from "@/lib/run-display-name";
import {
  unifiedBriefAuthorshipModeLabel,
  unifiedBriefSynthesizerLabel,
} from "@/lib/unified-briefs";
import type { LLMProviderName } from "@/types/decision";

function parseProvider(value: string | null): LLMProviderName {
  if (value && DEMO_PROVIDERS.includes(value as LLMProviderName)) {
    return value as LLMProviderName;
  }
  return "openai";
}

function DemoUnifiedContent() {
  const searchParams = useSearchParams();
  const provider = parseProvider(searchParams.get("provider"));

  return (
    <>
      <DemoBriefToolbar view="unified" provider={provider} />

      <div className={`${demoBriefBodyClass} ${demoContentClass}`}>
        <DemoBriefTitleBanner title={DEMO_UNIFIED_BRIEF.title}>
          <p className="mt-1 text-xs text-zinc-500">
            Synthesized by {unifiedBriefSynthesizerLabel(DEMO_UNIFIED_SYNTHESIZER)} ·{" "}
            {unifiedBriefAuthorshipModeLabel(DEMO_UNIFIED_AUTHORSHIP_MODE)} authorship
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Fact-check judge: {runProviderLabel(DEMO_UNIFIED_FACT_CHECK_JUDGE)}
          </p>
          <BriefGeneratedDateLine iso={DEMO_UNIFIED_BRIEF.generated_at} className="mt-1" label="Generated" />
        </DemoBriefTitleBanner>

        <div className="space-y-4">
        {TOUR_DISAGREEMENTS.map((d) => (
          <CollapsibleBlock key={d.label} title={d.label} defaultOpen>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4 font-medium">Model</th>
                    <th className="py-2 font-medium">Stance</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((row) => (
                    <tr key={row.provider} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-zinc-800">
                        {runProviderLabel(row.provider)}
                      </td>
                      <td className="py-2.5 text-zinc-700">{row.stance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleBlock>
        ))}

        <CollapsibleBlock title="Synthesized recommendation" defaultOpen>
          <p className="text-sm leading-relaxed text-zinc-700">{DEMO_UNIFIED_BRIEF.summary}</p>
          <p className="mt-4 text-sm font-medium text-zinc-900">Recommendation</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">{DEMO_UNIFIED_BRIEF.recommendation}</p>
          <p className="mt-4 text-sm font-medium text-zinc-900">Key considerations</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {DEMO_UNIFIED_BRIEF.key_considerations.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium text-zinc-900">Next steps</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {DEMO_UNIFIED_BRIEF.next_steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Contributions</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {TOUR_UNIFIED_BRIEF.contributions.map((c) => (
              <li key={c.provider}>
                <span className="font-medium">{runProviderLabel(c.provider)}</span> — {c.note}
              </li>
            ))}
          </ul>
        </CollapsibleBlock>
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 py-6 ${demoContentClass}`}>
        <Link
          href={`/demo/result?provider=${provider}`}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Individual model results
        </Link>
        <Link
          href="/request-access"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Request access
        </Link>
      </div>
    </>
  );
}

export default function DemoUnifiedPage() {
  return (
    <Suspense
      fallback={
        <div className={`py-12 ${demoContentClass}`}>
          <p className="text-zinc-600">Loading…</p>
        </div>
      }
    >
      <DemoUnifiedContent />
    </Suspense>
  );
}
