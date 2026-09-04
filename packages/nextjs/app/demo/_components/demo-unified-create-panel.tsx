"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEMO_UNIFIED_AUTHORSHIP_MODE,
  DEMO_UNIFIED_SYNTHESIZER,
} from "@/app/demo/_data/demo-fixtures";
import {
  UNIFIED_BRIEF_SYNTHESIZERS,
  unifiedBriefAuthorshipModeLabel,
  unifiedBriefSynthesizerLabel,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const GENERATE_STEPS = [
  "Gathering analyses from your think tank…",
  "Merging lens outputs and individual briefs…",
  `Building the consolidated prompt for ${unifiedBriefSynthesizerLabel(DEMO_UNIFIED_SYNTHESIZER)}…`,
  "Synthesizing your Unified Brief…",
  "Checking facts…",
];

const PICK_ORDER: UnifiedBriefSynthesizer[] = ["anthropic", "gemini", "xai", "openai"];

export function DemoUnifiedCreatePanel({
  playKey,
  onFinished,
}: {
  playKey: number;
  onFinished?: (done: boolean) => void;
}) {
  const [highlight, setHighlight] = useState<UnifiedBriefSynthesizer>(DEMO_UNIFIED_SYNTHESIZER);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [glow, setGlow] = useState(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (playKey === 0) return;
    let cancelled = false;

    const run = async () => {
      setDone(false);
      setGenerating(false);
      setGlow(false);
      setStep(0);
      setHighlight("anthropic");
      onFinishedRef.current?.(false);

      for (const author of PICK_ORDER) {
        if (cancelled) return;
        setHighlight(author);
        await sleep(320);
      }
      if (cancelled) return;
      setHighlight(DEMO_UNIFIED_SYNTHESIZER);
      setGlow(true);
      await sleep(420);
      if (cancelled) return;
      setGlow(false);
      setGenerating(true);
      for (let i = 0; i < GENERATE_STEPS.length; i++) {
        if (cancelled) return;
        setStep(i);
        await sleep(480);
      }
      if (cancelled) return;
      setGenerating(false);
      setDone(true);
      onFinishedRef.current?.(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [playKey]);

  const selectedLabel = unifiedBriefSynthesizerLabel(highlight);
  const authorshipLabel = unifiedBriefAuthorshipModeLabel(DEMO_UNIFIED_AUTHORSHIP_MODE);

  return (
    <div
      data-demo-spot="unified-synthesizer"
      className="rounded-xl border border-zinc-200 bg-white shadow-sm"
      aria-label="Unified brief controls (demo)"
    >
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Active model</p>
          <p className="text-xs text-zinc-500">View and generate with the same model</p>
        </div>

        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
          role="tablist"
          aria-label="Active synthesis model (demo)"
        >
          {UNIFIED_BRIEF_SYNTHESIZERS.map((author) => {
            const selected = author === highlight;
            const statusLabel = done && author === DEMO_UNIFIED_SYNTHESIZER ? "Saved" : "New";
            return (
              <span
                key={author}
                role="tab"
                aria-selected={selected}
                className={`flex min-w-[9.5rem] shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left ${
                  selected
                    ? "border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-600/20"
                    : "border-zinc-200 bg-zinc-50/80 text-zinc-400"
                }`}
              >
                <span className="text-sm font-medium leading-tight">
                  {unifiedBriefSynthesizerLabel(author)}
                </span>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    done && author === DEMO_UNIFIED_SYNTHESIZER
                      ? "bg-emerald-100 text-emerald-800"
                      : selected
                        ? "bg-zinc-200/80 text-zinc-600"
                        : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {statusLabel}
                </span>
              </span>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
          <button
            type="button"
            disabled
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-80 sm:w-auto ${
              glow ? "ring-2 ring-indigo-300" : ""
            }`}
          >
            {generating ? (
              <>
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
                Generating with {selectedLabel}…
              </>
            ) : done ? (
              <>Generated with {unifiedBriefSynthesizerLabel(DEMO_UNIFIED_SYNTHESIZER)}</>
            ) : (
              <>Generate with {selectedLabel}</>
            )}
          </button>

          <fieldset
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2"
            aria-label="Authorship mode (demo)"
          >
            {(
              [
                ["blind", "Blind", "default"],
                ["open", "Revealed", null],
                ["reassigned", "Reassigned", "research"],
              ] as const
            ).map(([mode, label, hint]) => (
              <label
                key={mode}
                className="inline-flex items-center gap-2 text-sm text-zinc-600 select-none"
              >
                <input
                  type="radio"
                  name="demo-authorship-mode"
                  checked={mode === DEMO_UNIFIED_AUTHORSHIP_MODE}
                  disabled
                  className="h-4 w-4 shrink-0 border-zinc-300 text-indigo-600"
                />
                {label}
                {hint ? <span className="text-xs text-zinc-400">({hint})</span> : null}
              </label>
            ))}
          </fieldset>

          <p className="text-xs leading-relaxed text-zinc-500">
            Demo replay — {unifiedBriefSynthesizerLabel(DEMO_UNIFIED_SYNTHESIZER)} writes this Unified Brief
            under {authorshipLabel} authorship. Nothing is sent to a model.
          </p>
        </div>
      </div>

      {generating ? (
        <div className="border-t border-zinc-100 px-4 py-3 text-sm text-indigo-800" role="status">
          <p className="font-medium">{GENERATE_STEPS[step]}</p>
          <p className="mt-1 text-xs text-indigo-600">
            {selectedLabel} reads every member&apos;s run, then a separate judge checks public facts.
          </p>
        </div>
      ) : null}
    </div>
  );
}
