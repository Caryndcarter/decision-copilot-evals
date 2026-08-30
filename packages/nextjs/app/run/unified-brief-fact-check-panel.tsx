"use client";

import { useState } from "react";
import type { FactCheckStatus, UnifiedBriefFactCheck } from "@/types/decision";

const STATUS_LABEL: Record<FactCheckStatus, string> = {
  corrected: "Corrected",
  confirmed: "Confirmed",
  unverified: "Unverified",
  out_of_scope: "Out of scope",
};

const STATUS_CHIP: Record<FactCheckStatus, string> = {
  corrected: "bg-amber-50 text-amber-900 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  unverified: "bg-slate-50 text-slate-700 border-slate-200",
  out_of_scope: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function formatJudgeLabel(factCheck: UnifiedBriefFactCheck): string {
  const provider =
    factCheck.judge_provider === "openai"
      ? "ChatGPT"
      : factCheck.judge_provider === "anthropic"
        ? "Claude"
        : factCheck.judge_provider === "gemini"
          ? "Gemini"
          : "xAI";
  return factCheck.judge_model ? `${provider} · ${factCheck.judge_model}` : provider;
}

export function UnifiedBriefFactCheckPanel({
  factCheck,
  className = "",
}: {
  factCheck: UnifiedBriefFactCheck;
  className?: string;
}) {
  const corrections = factCheck.corrections ?? [];
  const factual = corrections.filter((c) => c.status === "corrected");
  const [open, setOpen] = useState(factual.length > 0 || Boolean(factCheck.error));

  return (
    <details
      className={`mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm print:hidden ${className}`.trim()}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Fact check</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Blind public-web review · {formatJudgeLabel(factCheck)}
            </p>
          </div>
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {factual.length === 0
              ? "No factual corrections"
              : `${factual.length} correction${factual.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </summary>

      <div className="border-t border-zinc-100 px-5 py-4">
        {factCheck.error ? (
          <p className="mb-3 text-sm text-amber-800">
            Fact-check did not finish ({factCheck.error}). The draft Unified Brief is shown unchanged.
          </p>
        ) : null}

        {factCheck.summary ? (
          <p className="text-sm text-zinc-700">{factCheck.summary}</p>
        ) : null}

        {corrections.length === 0 && !factCheck.error ? (
          <p className="mt-3 text-sm text-zinc-600">No factual corrections.</p>
        ) : null}

        {corrections.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {corrections.map((c, i) => (
              <li
                key={`${c.status}-${i}`}
                className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm text-zinc-800">
                    <span className="font-medium text-zinc-500">Claim: </span>
                    {c.claim_as_written}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                {c.status === "corrected" && c.corrected_to ? (
                  <p className="mt-2 text-sm text-zinc-800">
                    <span className="font-medium text-zinc-500">Corrected to: </span>
                    {c.corrected_to}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-zinc-600">{c.rationale}</p>
                {c.sources && c.sources.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {c.sources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-700 hover:underline"
                        >
                          {s.title || s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
