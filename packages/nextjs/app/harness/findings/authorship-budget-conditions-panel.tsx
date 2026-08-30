import {
  AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT as SNAP,
  BUDGET_CONDITION_PEER_PROVIDERS,
  BUDGET_CONDITION_PROVIDER_LABELS,
  selfCredit,
  type BudgetConditionInfluenceMap,
} from "@/lib/authorship-budget-conditions";
import type { ContributionInfluence } from "@/types/decision";

const HEAT: Record<ContributionInfluence, string> = {
  high: "bg-indigo-600 text-white",
  medium: "bg-indigo-400 text-white",
  low: "bg-indigo-200 text-indigo-950",
  minimal: "bg-zinc-100 text-zinc-600 border border-zinc-200",
};

function Chip({ value, dropped }: { value: ContributionInfluence; dropped?: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[4.25rem] items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold capitalize ${HEAT[value]} ${
        dropped ? "ring-2 ring-amber-400 ring-offset-1" : ""
      }`}
    >
      {value}
    </span>
  );
}

function ModePair({
  open,
  blind,
  highlightDrop,
}: {
  open: ContributionInfluence;
  blind: ContributionInfluence;
  highlightDrop?: boolean;
}) {
  const changed = highlightDrop && open !== blind;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip value={blind} />
      <span className="text-[10px] text-zinc-400" aria-hidden>
        →
      </span>
      <Chip value={open} dropped={changed} />
    </div>
  );
}

function PeerRow({ map }: { map: BudgetConditionInfluenceMap }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BUDGET_CONDITION_PEER_PROVIDERS.map((p) => (
        <span key={p} className="inline-flex items-center gap-1">
          <span className="text-[10px] text-zinc-500">{BUDGET_CONDITION_PROVIDER_LABELS[p]}</span>
          <Chip value={map[p]} />
        </span>
      ))}
    </div>
  );
}

export function AuthorshipBudgetConditionsPanel() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
          Committed snapshot
        </p>
        <h2 className="mt-1 text-base font-semibold text-zinc-900">{SNAP.title}</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600">
          {SNAP.rater_label} as rater — Blind (default) vs Revealed self-credit and peer credit.
          Scenario:{" "}
          <span className="font-medium text-zinc-800">{SNAP.scenario_label}</span>. Control:{" "}
          <span className="font-medium text-zinc-800">{SNAP.control_label}</span>. Scale: high = 4,
          medium = 3, low = 2, minimal = 1.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Constrained Blind≠Revealed</dt>
            <dd className="text-sm font-semibold text-zinc-900">
              {SNAP.constrained.self_drop_count} of {SNAP.constrained.trials.length}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Constrained Blind self stayed high</dt>
            <dd className="text-sm font-semibold text-zinc-900">
              {SNAP.constrained.self_blind_high} of {SNAP.constrained.trials.length} Blind
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Control Blind≠Revealed</dt>
            <dd className="text-sm font-semibold text-zinc-900">
              {SNAP.control.self_drop_count} of {SNAP.control.demos.length}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Control Blind self</dt>
            <dd className="text-sm font-semibold text-zinc-900">
              {SNAP.control.self_blind_high}/{SNAP.control.demos.length} high
            </dd>
          </div>
        </dl>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">{SNAP.constrained.scenario_label}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {SNAP.constrained.demo_label} · five replication trials · {SNAP.rater_label} as rater
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Trial</th>
                <th className="px-4 py-2 font-medium">Self (Blind → Revealed)</th>
                <th className="px-4 py-2 font-medium">Peers · Blind</th>
                <th className="px-4 py-2 font-medium">Peers · Revealed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {SNAP.constrained.trials.map((row) => {
                const openSelf = selfCredit(row.open);
                const blindSelf = selfCredit(row.blind);
                return (
                  <tr key={row.trial}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-800">
                      Trial {row.trial}
                    </td>
                    <td className="px-4 py-3">
                      <ModePair open={openSelf} blind={blindSelf} highlightDrop />
                    </td>
                    <td className="px-4 py-3">
                      <PeerRow map={row.blind} />
                    </td>
                    <td className="px-4 py-3">
                      <PeerRow map={row.open} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">{SNAP.control.control_label}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Five-demo authorship batch · {SNAP.rater_label} as rater · no Blind vs Revealed self
            change
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Demo</th>
                <th className="px-4 py-2 font-medium">Self (Blind → Revealed)</th>
                <th className="px-4 py-2 font-medium">Peers · Blind</th>
                <th className="px-4 py-2 font-medium">Peers · Revealed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {SNAP.control.demos.map((row) => (
                <tr key={row.decision_id}>
                  <td className="px-4 py-3 font-medium text-zinc-800">{row.demo_label}</td>
                    <td className="px-4 py-3">
                    <ModePair open={selfCredit(row.open)} blind={selfCredit(row.blind)} />
                  </td>
                  <td className="px-4 py-3">
                    <PeerRow map={row.blind} />
                  </td>
                  <td className="px-4 py-3">
                    <PeerRow map={row.open} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
