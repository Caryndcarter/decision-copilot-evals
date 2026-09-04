"use client";

import { useCallback, useState } from "react";
import { BriefGeneratedDateLine } from "@/app/components/brief-generated-date";
import { CollapsibleBlock } from "@/app/run/collapsible-block";
import {
  DemoBriefGuide,
  DEMO_UNIFIED_GUIDE_STEPS,
  DEMO_UNIFIED_GUIDE_STORAGE_KEY,
} from "@/app/demo/_components/demo-brief-guide";
import { DemoChatPanel } from "@/app/demo/_components/demo-chat-panel";
import { DemoContinueBar } from "@/app/demo/_components/demo-continue-bar";
import { DemoScrollToTop } from "@/app/demo/_components/demo-scroll-to-top";
import { DemoUnifiedCreatePanel } from "@/app/demo/_components/demo-unified-create-panel";
import { DemoBriefTitleBanner, demoBriefBodyClass } from "@/app/demo/_components/demo-brief-title-banner";
import { DEMO_UNIFIED_BRIEF_CHAT } from "@/app/demo/_data/demo-chat-script";
import {
  DEMO_UNIFIED_AUTHORSHIP_MODE,
  DEMO_UNIFIED_BRIEF,
  DEMO_UNIFIED_FACT_CHECK_JUDGE,
  DEMO_UNIFIED_SYNTHESIZER,
} from "@/app/demo/_data/demo-fixtures";
import type { DemoGuideState } from "@/app/demo/_components/demo-replay";
import { useDemoReplayKey } from "@/app/demo/_components/use-demo-replay-key";
import { TOUR_DISAGREEMENTS, TOUR_UNIFIED_BRIEF } from "@/app/tour/_data/tour-demo-data";
import { runProviderLabel } from "@/lib/run-display-name";
import {
  unifiedBriefAuthorshipModeLabel,
  unifiedBriefSynthesizerLabel,
} from "@/lib/unified-briefs";

const IDLE_GUIDE: DemoGuideState = { ready: false, dismissed: false, spot: null, generation: 0 };

export function DemoUnifiedContent() {
  const [guide, setGuide] = useState<DemoGuideState>(IDLE_GUIDE);
  const onGuideState = useCallback((state: DemoGuideState) => setGuide(state), []);
  const createPlayKey = useDemoReplayKey(
    guide.ready,
    guide.dismissed,
    guide.spot,
    guide.generation,
    "unified-synthesizer"
  );
  const chatPlayKey = useDemoReplayKey(
    guide.ready,
    guide.dismissed,
    guide.spot,
    guide.generation,
    "demo-chat"
  );
  const [briefReady, setBriefReady] = useState(false);

  const onCreateFinished = useCallback((done: boolean) => {
    setBriefReady(done);
  }, []);

  const showBrief = briefReady || (guide.ready && guide.dismissed);

  const continueBack = { href: "/demo/result?provider=openai", label: "← Individual model results" };

  return (
    <>
      <DemoBriefGuide
        steps={DEMO_UNIFIED_GUIDE_STEPS}
        storageKey={DEMO_UNIFIED_GUIDE_STORAGE_KEY}
        restartLabel="Show how the Unified Brief is written"
        onGuideState={onGuideState}
      />
      <DemoScrollToTop resetKey="unified" />
      <DemoContinueBar
        className="border-t"
        back={continueBack}
        forward={{ href: "/request-access", label: "Request access →" }}
      />

      <div className={`${demoBriefBodyClass} mx-auto max-w-[1400px] px-6`}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div>
            <div className="mb-6">
              <DemoUnifiedCreatePanel playKey={createPlayKey} onFinished={onCreateFinished} />
            </div>

            <div className={showBrief ? "" : "pointer-events-none opacity-40"}>
              <DemoBriefTitleBanner title={DEMO_UNIFIED_BRIEF.title}>
                <p className="mt-1 text-xs text-zinc-500" data-demo-spot="unified-attribution">
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
          </div>
          <DemoChatPanel script={DEMO_UNIFIED_BRIEF_CHAT} playKey={chatPlayKey} variant="unified" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div
          data-demo-spot="tour-end"
          className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 sm:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
            End of the tour
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-900">
            That&apos;s the full flow — here&apos;s how to run your own
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            You just walked through a real decision end to end: intake, clarifying questions,
            individual model briefs, and the Unified Brief. Decision Copilot is invite-only while
            we&apos;re in early access, so running your own takes three steps:
          </p>
          <ol className="mt-6 space-y-4">
            {[
              {
                title: "Request access",
                body: "Tell us your email and a sentence about what you'd use it for.",
              },
              {
                title: "We review and send an invite",
                body: "You'll get an invitation link at that email from Finlayson Studio.",
              },
              {
                title: "Sign in and start a real decision",
                body: "Follow the invite to create your account, then brief your own think tank on the real intake form.",
              },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-zinc-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <DemoContinueBar
        className="border-t"
        back={continueBack}
        forward={{ href: "/request-access", label: "Request access →", spot: "tour-end" }}
      />
    </>
  );
}
