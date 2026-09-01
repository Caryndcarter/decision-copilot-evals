"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import type { MajorFinding } from "@/lib/cross-study-findings";
import {
  getPublishedFindings,
  getStorySlugForMajorFinding,
} from "@/lib/model-studies-overview-findings";
import { EvidenceBars } from "./cross-study-finding-card";

const DECK_LABELS: Record<string, string> = {
  "gemini-pe-owner": "Whose risk",
  "explicit-human-harm": "Named harm",
  "chatgpt-self-credit": "Self-credit",
  "grok-brand-penalty": "Grok's name",
};

function deckLabel(finding: MajorFinding): string {
  return DECK_LABELS[finding.id] ?? finding.headline;
}

function scopeLabel(scope: MajorFinding["scope"]): string {
  return scope === "cross-case" ? "Cross-case finding" : "Case finding";
}

function storyFor(finding: MajorFinding) {
  return getPublishedFindings().find((f) => f.majorFindingId === finding.id);
}

export function MajorFindingDeck({ findings }: { findings: MajorFinding[] }) {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const count = findings.length;
  const finding = findings[index];

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const i = findings.findIndex((f) => f.id === raw);
    if (i >= 0) setIndex(i);
  }, [findings]);

  useEffect(() => {
    if (!finding) return;
    const url = new URL(window.location.href);
    url.hash = finding.id;
    window.history.replaceState(null, "", url);
  }, [finding]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index]);

  if (!finding) return null;

  const story = storyFor(finding);
  const storySlug = getStorySlugForMajorFinding(finding.id);
  const storyHref = storySlug ? `/model-studies/findings/${storySlug}?from=results` : undefined;
  const paragraphs = (story?.body ?? finding.statsNote ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Major findings"
      >
        {findings.map((f, i) => {
          const selected = i === index;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              id={`${labelId}-tab-${f.id}`}
              aria-selected={selected}
              aria-controls={`${labelId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => goTo(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                selected
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              }`}
            >
              <span className="mr-1.5 tabular-nums text-[10px] opacity-70">{i + 1}</span>
              {deckLabel(f)}
            </button>
          );
        })}
      </div>

      <article
        id={`${labelId}-panel`}
        role="tabpanel"
        aria-labelledby={`${labelId}-tab-${finding.id}`}
        className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="grid lg:grid-cols-12">
          <div className="flex flex-col border-b border-zinc-100 p-6 sm:p-8 lg:col-span-5 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
              {scopeLabel(finding.scope)}
              <span className="mx-2 text-zinc-300">·</span>
              <span className="tabular-nums text-zinc-400">
                {index + 1} of {count}
              </span>
            </p>
            <h3 className="mt-3 text-xl font-bold leading-snug tracking-tight text-zinc-900 sm:text-2xl">
              {finding.headline}
            </h3>
            <p className="mt-2 text-xs text-zinc-500">{finding.contextLine}</p>

            <div className="mt-5 space-y-3">
              {paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-zinc-600">
                  {p}
                </p>
              ))}
            </div>

            {story?.whyItMatters ? (
              <p className="mt-5 border-l-2 border-indigo-200 pl-3 text-sm leading-relaxed text-zinc-700">
                <span className="font-semibold text-zinc-900">Why it matters. </span>
                {story.whyItMatters}
              </p>
            ) : null}

            <p className="mt-5 text-xs text-zinc-500">
              <span className="font-medium text-zinc-600">Cases:</span>{" "}
              {finding.supportingCases.map((c, i) => (
                <span key={c.studyId}>
                  {i > 0 ? " · " : null}
                  <Link
                    href={`/model-studies/results/${c.studyId}`}
                    className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-indigo-700 hover:decoration-indigo-300"
                  >
                    {c.label}
                  </Link>
                </span>
              ))}
            </p>

            {storyHref ? (
              <Link
                href={storyHref}
                className="mt-6 inline-flex items-center gap-1 self-start text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              >
                Read the full finding →
              </Link>
            ) : null}
          </div>

          <div className="bg-zinc-50 p-6 sm:p-8 lg:col-span-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              What the coded briefs show
            </p>
            <div className="mt-5 space-y-6">
              {finding.evidence.map((block, i) => (
                <EvidenceBars key={i} block={block} />
              ))}
            </div>
            {finding.statsNote ? (
              <p className="mt-6 text-xs leading-relaxed text-zinc-500">{finding.statsNote}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3 sm:px-8">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            ← Previous
          </button>
          <p className="hidden text-xs text-zinc-400 sm:block">← → to move between findings</p>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Next →
          </button>
        </div>
      </article>
    </div>
  );
}
