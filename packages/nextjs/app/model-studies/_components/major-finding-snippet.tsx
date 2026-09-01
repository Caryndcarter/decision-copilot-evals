"use client";

import Link from "next/link";
import type {
  MajorFinding,
  MajorFindingChartIntro,
  MajorFindingSnippet,
} from "@/lib/cross-study-findings";
import { ChipLegend } from "./moral-eval/chip-legend";
import { HormuzMoralDashboard } from "./moral-eval/hormuz-moral-dashboard";
import { MoralSlicePanel } from "./moral-eval/moral-slice-panel";

function ChartIntro({ intro }: { intro: MajorFindingChartIntro }) {
  return (
    <div>
      <div className="space-y-3">
        {intro.lead.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-zinc-600">
            {paragraph}
          </p>
        ))}
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {intro.conditions.map((condition) => (
          <div
            key={condition.label}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <dt className="text-xs font-semibold text-zinc-900">{condition.label}</dt>
            <dd className="mt-1.5 text-xs leading-relaxed text-zinc-600">{condition.body}</dd>
          </div>
        ))}
      </dl>

      {intro.readingNote ? (
        <p className="mt-4 text-xs text-zinc-500">{intro.readingNote}</p>
      ) : null}
    </div>
  );
}

function SnippetChart({ snippet }: { snippet: MajorFindingSnippet }) {
  if (snippet.kind === "full-chart" && snippet.studyId === "meran-tankers") {
    return (
      <>
        {snippet.intro ? <ChartIntro intro={snippet.intro} /> : null}
        {!snippet.intro && snippet.caption ? (
          <p className="text-[11px] leading-snug text-zinc-600">{snippet.caption}</p>
        ) : null}
        <div className={snippet.intro || snippet.caption ? "mt-3" : undefined}>
          <HormuzMoralDashboard
            gridOnly
            dimensions={
              snippet.dimensions as Parameters<typeof HormuzMoralDashboard>[0]["dimensions"]
            }
            cases={snippet.cases}
            highlight={
              snippet.highlight as Parameters<typeof HormuzMoralDashboard>[0]["highlight"]
            }
          />
        </div>
      </>
    );
  }
  if (snippet.kind === "moral-slice") {
    return <MoralSlicePanel slice={snippet} />;
  }
  return null;
}

function EvidenceCaseBlock({ snippet }: { snippet: MajorFindingSnippet }) {
  const hasHeader =
    Boolean(snippet.caseLabel) ||
    Boolean(snippet.testType) ||
    Boolean(snippet.testExplainer) ||
    Boolean(snippet.briefsCoded);

  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      {hasHeader ? (
        <div className="mb-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
            {snippet.caseLabel ? (
              snippet.caseHref ? (
                <Link
                  href={snippet.caseHref}
                  className="group inline-flex items-center gap-1.5 text-lg font-bold tracking-tight text-zinc-900 transition-colors hover:text-indigo-700"
                >
                  {snippet.caseLabel}
                  <span className="text-indigo-600 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              ) : (
                <span className="text-lg font-bold tracking-tight text-zinc-900">
                  {snippet.caseLabel}
                </span>
              )
            ) : (
              <span />
            )}
            {snippet.briefsCoded ? (
              <span className="text-xs font-medium text-zinc-500">{snippet.briefsCoded}</span>
            ) : null}
          </div>
          {snippet.testType ? (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
              {snippet.testType}
            </p>
          ) : null}
          {snippet.testExplainer ? (
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">{snippet.testExplainer}</p>
          ) : null}
        </div>
      ) : null}
      <SnippetChart snippet={snippet} />
    </div>
  );
}

function FindingEvidenceSection({ finding }: { finding: MajorFinding }) {
  if (finding.snippets.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {finding.snippets.map((snippet, i) => (
        <EvidenceCaseBlock key={i} snippet={snippet} />
      ))}
    </div>
  );
}

export function MajorFindingEvidenceSections({ findings }: { findings: MajorFinding[] }) {
  const withSnippets = findings.filter((f) => f.snippets.length > 0);
  if (withSnippets.length === 0) return null;

  return (
    <div>
      <ChipLegend />
      {withSnippets.map((finding) => (
        <FindingEvidenceSection key={finding.id} finding={finding} />
      ))}
    </div>
  );
}
