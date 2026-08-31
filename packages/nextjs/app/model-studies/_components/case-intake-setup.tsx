"use client";

import { useState } from "react";
import type { CaseIntake, CaseIntakeCondition } from "@/lib/case-intake-display";

function Paragraphs({ text, splitOn = "\n\n" }: { text: string; splitOn?: string }) {
  return (
    <div className="space-y-2.5">
      {text
        .split(splitOn)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-zinc-700">
            {p}
          </p>
        ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-zinc-100 pt-5 first:border-t-0 first:pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ConditionBody({ condition }: { condition: CaseIntakeCondition }) {
  return (
    <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <Field label="Situation">
        <Paragraphs text={condition.situation} />
      </Field>
      <Field label="Constraints">
        <Paragraphs text={condition.constraints} />
      </Field>
      {condition.leaningDirection ? (
        <Field label="The filer's lean — submitted to be pressure-tested">
          <Paragraphs text={condition.leaningDirection} />
        </Field>
      ) : null}
      <Field label="What they treat as known vs assumed">
        <Paragraphs text={condition.knownsAssumptions} splitOn={"\n"} />
      </Field>
      <Field label="Open questions">
        <Paragraphs text={condition.unknowns} />
      </Field>
    </div>
  );
}

export function CaseIntakeSetup({ intake }: { intake: CaseIntake }) {
  const [activeId, setActiveId] = useState(intake.conditions[0]?.id);
  const active =
    intake.conditions.find((c) => c.id === activeId) ?? intake.conditions[0];
  const multiple = intake.conditions.length > 1;

  if (!active) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-zinc-900">{intake.scenarioTitle}</p>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">{intake.intro}</p>

      {multiple ? (
        <div className="mt-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            {intake.conditions.length} {intake.conditionNoun}s — same facts, different framing
          </p>
          <div
            role="tablist"
            aria-label={`${intake.conditionNoun} switcher`}
            className="mt-2 flex flex-wrap gap-2"
          >
            {intake.conditions.map((c) => {
              const selected = c.id === active.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveId(c.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 hover:text-indigo-700"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {active.sub ? (
            <p className="mt-3 text-sm text-zinc-500">
              <span className="font-semibold text-zinc-700">{active.label}:</span> {active.sub}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <ConditionBody condition={active} />
      </div>
    </div>
  );
}
