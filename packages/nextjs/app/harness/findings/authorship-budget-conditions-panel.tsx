import {
  AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT as SNAP,
  BUDGET_CONDITION_PEER_PROVIDERS,
  selfCredit,
  type BudgetConditionInfluenceMap,
  type BudgetConditionProviderLabels,
  type BudgetConditionRow,
  type BudgetConditionTokenBudget,
} from "@/lib/authorship-budget-conditions";
import type { ContributionInfluence, LLMProviderName } from "@/types/decision";

const HEAT: Record<ContributionInfluence, string> = {
  high: "bg-indigo-600 text-white",
  medium: "bg-indigo-400 text-white",
  low: "bg-indigo-200 text-indigo-950",
  minimal: "bg-zinc-100 text-zinc-600 border border-zinc-200",
};

function Chip({
  value,
  changed,
}: {
  value: ContributionInfluence;
  changed?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-[3.15rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize ${HEAT[value]} ${
        changed ? "ring-2 ring-amber-400 ring-offset-1" : ""
      }`}
    >
      {value}
    </span>
  );
}

function ModeHeat({
  map,
  labels,
  baseline,
  markSelfChange,
}: {
  map: BudgetConditionInfluenceMap;
  labels: BudgetConditionProviderLabels;
  baseline?: BudgetConditionInfluenceMap;
  markSelfChange?: boolean;
}) {
  const self = selfCredit(map);
  const selfChanged = Boolean(markSelfChange && baseline && selfCredit(baseline) !== self);
  const cells: Array<{ key: LLMProviderName; label: string; value: ContributionInfluence; changed?: boolean }> = [
    { key: SNAP.rater, label: labels[SNAP.rater], value: self, changed: selfChanged },
    ...BUDGET_CONDITION_PEER_PROVIDERS.map((p) => ({
      key: p,
      label: labels[p],
      value: map[p],
    })),
  ];
  return (
    <div className="flex flex-nowrap items-center gap-2">
      {cells.map((cell) => (
        <span key={cell.key} className="inline-flex flex-nowrap items-center gap-1">
          <span className="whitespace-nowrap text-[10px] text-zinc-500">{cell.label}</span>
          <Chip value={cell.value} changed={cell.changed} />
        </span>
      ))}
    </div>
  );
}

function ConditionTable({
  title,
  subtitle,
  budget,
  models,
  labels,
  rows,
}: {
  title: string;
  subtitle: string;
  budget: BudgetConditionTokenBudget;
  models: Record<LLMProviderName, string>;
  labels: BudgetConditionProviderLabels;
  rows: BudgetConditionRow[];
}) {
  const modelLine = `${labels.openai} ${models.openai} · ${labels.anthropic} ${models.anthropic} · ${labels.gemini} ${models.gemini} · ${labels.xai} ${models.xai}`;
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
          <p className="mt-1 text-[11px] text-zinc-500">{modelLine}</p>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
            Token budget
          </p>
          <p className="text-sm font-semibold tabular-nums text-indigo-950">{budget.headline}</p>
          <p className="text-[11px] text-indigo-800">{budget.subhead}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-24 px-3 py-2 font-medium">Case</th>
              <th className="px-3 py-2 font-medium">Blind (default)</th>
              <th className="px-3 py-2 font-medium">Revealed</th>
              <th className="px-3 py-2 font-medium">Reassigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={row.decision_id}>
                <td className="w-24 whitespace-nowrap px-3 py-3 text-xs font-semibold text-zinc-800">
                  {row.case_label}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <ModeHeat map={row.blind} labels={labels} />
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <ModeHeat map={row.open} labels={labels} baseline={row.blind} markSelfChange />
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <ModeHeat map={row.reassigned} labels={labels} baseline={row.blind} markSelfChange />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AuthorshipBudgetConditionsPanel() {
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              {SNAP.constrained.scenario_label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-amber-950">
              {SNAP.constrained.token_budget.headline}
            </p>
            <p className="text-sm text-amber-900">{SNAP.constrained.token_budget.subhead}</p>
            <p className="mt-2 text-xs text-amber-800">
              Blind≠Revealed self {SNAP.constrained.self_blind_vs_revealed} of{" "}
              {SNAP.constrained.trials.length} · Blind≠Reassigned self{" "}
              {SNAP.constrained.self_blind_vs_reassigned} of {SNAP.constrained.trials.length}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              {SNAP.control.control_label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-emerald-950">
              {SNAP.control.token_budget.headline}
            </p>
            <p className="text-sm text-emerald-900">{SNAP.control.token_budget.subhead}</p>
            <p className="mt-2 text-xs text-emerald-800">
              Blind≠Revealed self {SNAP.control.self_blind_vs_revealed} of {SNAP.control.demos.length} ·
              Blind≠Reassigned self {SNAP.control.self_blind_vs_reassigned} of {SNAP.control.demos.length}
            </p>
          </div>
        </div>
      </div>

      <ConditionTable
        title={SNAP.constrained.scenario_label}
        subtitle={`${SNAP.constrained.demo_label} · five replication trials · ${SNAP.rater_label} as rater`}
        budget={SNAP.constrained.token_budget}
        models={SNAP.constrained.think_tank_models}
        labels={SNAP.constrained.provider_labels}
        rows={SNAP.constrained.trials}
      />

      <ConditionTable
        title={SNAP.control.control_label}
        subtitle={`Five-demo authorship batch · ${SNAP.rater_label} as rater · self-credit held high in every mode`}
        budget={SNAP.control.token_budget}
        models={SNAP.control.think_tank_models}
        labels={SNAP.control.provider_labels}
        rows={SNAP.control.demos}
      />

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
