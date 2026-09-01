"use client";

import { useEffect, useState } from "react";
import {
  AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT as SNAP,
  scoreForInfluence,
} from "@/lib/authorship-budget-conditions";
import type {
  ContributionInfluence,
  LLMProviderName,
  UnifiedBriefAuthorshipMode,
} from "@/types/decision";

type ConditionKey = "constrained" | "control";

const CONDITIONS: { key: ConditionKey; label: string }[] = [
  { key: "constrained", label: SNAP.constrained.scenario_label },
  { key: "control", label: SNAP.control.control_label },
];

/** Columns of the heatmap — the three authorship modes, in product order. */
const MODE_COLUMNS: { key: UnifiedBriefAuthorshipMode; label: string; note?: string }[] = [
  { key: "blind", label: "Blind", note: "default" },
  { key: "open", label: "Revealed" },
  { key: "reassigned", label: "Reassigned" },
];

/** Rows — the rated model first (highlighted), then its three peers. */
const RATERS: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];

/** Same indigo scale as the Unified Brief influence charts. */
const HEATMAP_CELL: Record<ContributionInfluence, string> = {
  high: "bg-indigo-600 text-white",
  medium: "bg-indigo-400 text-white",
  low: "bg-indigo-200 text-indigo-950",
  minimal: "bg-zinc-100 text-zinc-600 border border-zinc-200",
};

const INFLUENCE_LABEL: Record<ContributionInfluence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  minimal: "Minimal",
};

const MAX_SCORE = 4;

function conditionBlock(key: ConditionKey) {
  return key === "constrained" ? SNAP.constrained : SNAP.control;
}
function aggregateModes(key: ConditionKey) {
  return key === "constrained" ? SNAP.aggregate.constrained.modes : SNAP.aggregate.control.modes;
}

/** Numeric self-mean → the influence bucket that colors the cell. */
function levelFromScore(score: number): ContributionInfluence {
  if (score >= 3.5) return "high";
  if (score >= 2.5) return "medium";
  if (score >= 1.5) return "low";
  return "minimal";
}

function GapBadge({ gap }: { gap: number }) {
  const wide = gap >= 1.5;
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
        wide
          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
          : "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
      }`}
    >
      {gap >= 0 ? "+" : ""}
      {gap.toFixed(1)}
    </span>
  );
}

function HeatCell({
  influence,
  score,
  decimals,
}: {
  influence: ContributionInfluence;
  score: number;
  decimals: number;
}) {
  return (
    <div
      className={`flex min-h-[3.25rem] min-w-[5.25rem] flex-col items-center justify-center rounded-md px-2 py-2 text-center transition-colors duration-500 ${HEATMAP_CELL[influence]}`}
    >
      <span className="text-xs font-semibold leading-tight">{INFLUENCE_LABEL[influence]}</span>
      <span className="mt-0.5 text-[10px] opacity-90">
        {score.toFixed(decimals)}/{MAX_SCORE}
      </span>
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { key: ConditionKey; label: string }[];
  value: ConditionKey;
  onChange: (key: ConditionKey) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Legend() {
  const levels: ContributionInfluence[] = ["high", "medium", "low", "minimal"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Scale</span>
      {levels.map((level) => (
        <span
          key={level}
          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${HEATMAP_CELL[level]}`}
        >
          {INFLUENCE_LABEL[level]} ({scoreForInfluence(level)})
        </span>
      ))}
    </div>
  );
}

export function AuthorshipBudgetConditionsPanel() {
  const [condition, setCondition] = useState<ConditionKey>("constrained");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCondition((c) => (c === "constrained" ? "control" : "constrained"));
    }, 1900);
    return () => clearInterval(id);
  }, [playing]);

  const block = conditionBlock(condition);
  const modes = aggregateModes(condition);
  const labels = block.provider_labels;
  const models = block.think_tank_models;
  const budget = block.token_budget;
  const selfLabel = labels[SNAP.rated];

  // How many Unified Briefs each run scored for influence — 4 synthesizers ×
  // 3 authorship modes × the run's repetitions. Stated for continuity with the
  // other findings (which each cite their N).
  const runUnitCount =
    condition === "constrained" ? SNAP.constrained.trials.length : SNAP.control.demos.length;
  const runUnitNoun = condition === "constrained" ? "replication trials" : "demos";
  const briefsScored = RATERS.length * MODE_COLUMNS.length * runUnitCount;

  // Representative gap (Revealed) drives the caption tone.
  const headlineGap = modes.open.self_minus_peers;
  const wideGap = headlineGap >= 1.5;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
          What we tested
        </p>
        <h2 className="mt-1 text-base font-semibold text-zinc-900">{SNAP.title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-700">{SNAP.takeaway.test}</p>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-700">{SNAP.takeaway.results}</p>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-800">
          <span className="font-semibold text-zinc-900">Takeaway. </span>
          {SNAP.takeaway.meaning}
        </p>
      </div>

      {/* Flip-through influence heatmap */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900">
              How the room rated {selfLabel}&apos;s contribution
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Each cell is that model&apos;s influence rating of {selfLabel}, on the 1–4 scale. Flip the
              condition and watch the peer rows move — {selfLabel} rating itself barely does.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            {playing ? "❚❚ Pause" : "▶ Watch peers catch up"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Condition
            </span>
            <SegmentedControl
              options={CONDITIONS}
              value={condition}
              onChange={(k) => {
                setPlaying(false);
                setCondition(k);
              }}
              ariaLabel="Run condition"
            />
          </div>
          <Legend />
        </div>

        <div className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500">
          <span className="font-semibold tabular-nums text-zinc-700">{budget.headline}</span>
          {" · "}
          {budget.subhead}
          <span className="mx-1.5 text-zinc-300">|</span>
          <span className="tabular-nums">{briefsScored}</span> Unified Briefs scored for influence
          <span className="text-zinc-400">
            {" "}
            ({RATERS.length} synthesizers × {MODE_COLUMNS.length} modes × {runUnitCount} {runUnitNoun})
          </span>
        </div>

        {/* Heatmap */}
        <div className="overflow-x-auto px-4 pt-4 pb-2">
          <table className="w-full border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Rating {selfLabel} ↓
                </th>
                {MODE_COLUMNS.map((mode) => (
                  <th
                    key={mode.key}
                    className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    {mode.label}
                    {mode.note ? (
                      <span className="block font-normal normal-case tracking-normal text-zinc-400">
                        {mode.note}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RATERS.map((p) => {
                const isSelf = p === SNAP.rated;
                return (
                  <tr key={p}>
                    <td className="whitespace-nowrap px-2 py-1 align-middle">
                      <div
                        className={`text-sm ${
                          isSelf ? "font-bold text-zinc-900" : "font-medium text-zinc-700"
                        }`}
                      >
                        {labels[p]}
                        {isSelf ? (
                          <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                            self
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10px] font-normal tabular-nums text-zinc-400">
                        {models[p]}
                      </div>
                    </td>
                    {MODE_COLUMNS.map((mode) => {
                      const agg = modes[mode.key];
                      if (isSelf) {
                        const score = agg.mean_self;
                        return (
                          <td key={mode.key}>
                            <HeatCell influence={levelFromScore(score)} score={score} decimals={1} />
                          </td>
                        );
                      }
                      const influence = agg.peers_to_openai[p as Exclude<LLMProviderName, "openai">];
                      return (
                        <td key={mode.key}>
                          <HeatCell
                            influence={influence}
                            score={scoreForInfluence(influence)}
                            decimals={0}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Gap row */}
              <tr>
                <td className="whitespace-nowrap px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Self − peers
                </td>
                {MODE_COLUMNS.map((mode) => (
                  <td key={mode.key} className="pt-2 text-center">
                    <GapBadge gap={modes[mode.key].self_minus_peers} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div
          className={`border-t px-4 py-3 text-[11px] leading-relaxed ${
            wideGap ? "border-amber-100 bg-amber-50/60 text-zinc-700" : "border-emerald-100 bg-emerald-50/60 text-zinc-700"
          }`}
        >
          {wideGap
            ? `${selfLabel} rates its own contribution near the top while its peers, reading the same work, rate it far lower — the gap is widest in Revealed and narrows only when its own brand is stripped off in Reassigned.`
            : `${selfLabel}'s self-rating and its peers' ratings land in the same place across every mode — once the work is strong, the room agrees.`}
        </div>
      </section>

      <aside className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Methodology footnotes
        </p>
        <ul className="mt-2 space-y-1.5">
          {SNAP.methodology_footnotes.map((note) => (
            <li key={note} className="text-xs leading-relaxed text-zinc-600">
              {note}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
