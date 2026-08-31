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

function SnippetContent({ snippet }: { snippet: MajorFindingSnippet }) {
  if (snippet.kind === "full-chart" && snippet.studyId === "hormuz") {
    return (
      <>
        {snippet.intro ? <ChartIntro intro={snippet.intro} /> : null}
        {!snippet.intro && snippet.caption ? (
          <p className="text-[11px] leading-snug text-zinc-600">{snippet.caption}</p>
        ) : null}
        <div className={snippet.intro || snippet.caption ? "mt-4" : undefined}>
          <HormuzMoralDashboard
            gridOnly
            dimensions={
              snippet.dimensions as Parameters<typeof HormuzMoralDashboard>[0]["dimensions"]
            }
            cases={snippet.cases}
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

function FindingEvidenceSection({ finding }: { finding: MajorFinding }) {
  if (finding.snippets.length === 0) return null;

  return (
    <div className="border-b border-zinc-200 py-8 first:border-t first:border-zinc-200 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{finding.headline}</h3>
        <p className="text-xs text-zinc-500">
          {finding.supportingCases.map((c, i) => (
            <span key={c.studyId}>
              {i > 0 ? " · " : null}
              <Link
                href={`/model-studies/results/${c.studyId}`}
                className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-indigo-700"
              >
                {c.label}
              </Link>
            </span>
          ))}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-6">
        {finding.snippets.map((snippet, i) => (
          <div key={i} className="min-w-0">
            <SnippetContent snippet={snippet} />
          </div>
        ))}
      </div>
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
