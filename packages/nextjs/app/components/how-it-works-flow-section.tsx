import Link from "next/link";
import type { ReactNode } from "react";
import {
  HOW_IT_WORKS_INTRO,
  HOW_IT_WORKS_STEPS,
  HOW_IT_WORKS_UNIFIED_BRIEF_CTA,
} from "@/lib/how-it-works-flow";

function FlowStep({
  n,
  title,
  desc,
  footer,
}: {
  n: string;
  title: string;
  desc: string;
  footer?: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
        {n}
      </div>
      <div>
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="mt-0.5 text-sm leading-relaxed text-zinc-500">{desc}</div>
        {footer ? <div className="mt-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function HowItWorksFlowSection({
  introLinkHref = "/how-it-works#unified-brief",
  unifiedBriefCtaHref = "/how-it-works#unified-brief",
  showFullWalkthroughLink = false,
  showUnifiedBriefCta = true,
  linkIntroUnifiedBrief = true,
}: {
  introLinkHref?: string;
  unifiedBriefCtaHref?: string;
  showFullWalkthroughLink?: boolean;
  showUnifiedBriefCta?: boolean;
  linkIntroUnifiedBrief?: boolean;
}) {
  return (
    <>
      <div className="text-center mb-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">How it works</h2>
        <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
          {HOW_IT_WORKS_INTRO.beforeLink}
          {linkIntroUnifiedBrief ? (
            <Link
              href={introLinkHref}
              className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {HOW_IT_WORKS_INTRO.linkLabel}
            </Link>
          ) : (
            <span className="font-semibold text-zinc-700">{HOW_IT_WORKS_INTRO.linkLabel}</span>
          )}
          {HOW_IT_WORKS_INTRO.afterLink}
        </p>
        {showFullWalkthroughLink ? (
          <Link
            href="/how-it-works"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Full walkthrough →
          </Link>
        ) : null}
      </div>
      <div className="space-y-8">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <FlowStep
            key={step.n}
            n={step.n}
            title={step.title}
            desc={step.desc}
            footer={
              step.n === "4" && showUnifiedBriefCta ? (
                <Link
                  href={unifiedBriefCtaHref}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {HOW_IT_WORKS_UNIFIED_BRIEF_CTA}
                </Link>
              ) : undefined
            }
          />
        ))}
      </div>
    </>
  );
}
