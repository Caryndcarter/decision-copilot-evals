import {
  AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT as SNAP,
  BUDGET_CONDITION_PEER_PROVIDERS,
  meanPeerCredit,
  scoreForInfluence,
  selfCredit,
  selfMinusPeers,
  type BudgetConditionAggregateMode,
  type BudgetConditionBatchBlock,
  type BudgetConditionPeerCredit,
  type BudgetConditionRow,
  type BudgetConditionTokenBudget,
} from "@/lib/authorship-budget-conditions";
import type { ContributionInfluence, UnifiedBriefAuthorshipMode } from "@/types/decision";

const MODES: UnifiedBriefAuthorshipMode[] = ["blind", "open", "reassigned"];
const MODE_LABEL: Record<UnifiedBriefAuthorshipMode, string> = {
  blind: "Blind",
  open: "Revealed",
  reassigned: "Reassigned",
};

const HEAT: Record<ContributionInfluence, string> = {
  high: "bg-indigo-600 text-white",
  medium: "bg-indigo-400 text-white",
  low: "bg-indigo-200 text-indigo-950",
  minimal: "bg-zinc-100 text-zinc-600 border border-zinc-200",
};

function Chip({ value }: { value: ContributionInfluence }) {
  return (
    <span
      className={`inline-flex min-w-[3.15rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize ${HEAT[value]}`}
    >
      {value}
    </span>
  );
}

function GapBadge({ gap }: { gap: number }) {
  const wide = gap >= 1.5;
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        wide ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200" : "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200"
      }`}
    >
      {gap >= 0 ? "+" : ""}
      {gap.toFixed(1)}
    </span>
  );
}

function AggregateCard({
  label,
  budget,
  agg,
  tone,
}: {
  label: string;
  budget: BudgetConditionTokenBudget;
  agg: BudgetConditionAggregateMode;
  tone: "amber" | "emerald";
}) {
  const border = tone === "amber" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
  const title = tone === "amber" ? "text-amber-800" : "text-emerald-800";
  const num = tone === "amber" ? "text-amber-950" : "text-emerald-950";
  return (
    <div className={`rounded-xl border px-4 py-3 ${border}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${title}`}>{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${num}`}>
        {budget.headline}
      </p>
      <p className={`text-sm ${tone === "amber" ? "text-amber-900" : "text-emerald-900"}`}>
        {budget.subhead}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Self</dt>
          <dd className="text-lg font-semibold tabular-nums text-zinc-900">{agg.mean_self.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Peers</dt>
          <dd className="text-lg font-semibold tabular-nums text-zinc-900">
            {agg.mean_peers_to_openai.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Gap</dt>
          <dd className="mt-0.5 flex justify-center">
            <GapBadge gap={agg.self_minus_peers} />
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">{budget.note}</p>
    </div>
  );
}

function PeerChips({ peers, labels }: { peers: BudgetConditionPeerCredit; labels: Record<string, string> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {BUDGET_CONDITION_PEER_PROVIDERS.map((p) => (
        <span key={p} className="inline-flex items-center gap-1">
          <span className="text-[10px] text-zinc-500">{labels[p]}</span>
          <Chip value={peers[p]} />
        </span>
      ))}
    </div>
  );
}

function SelfPeerTable({
  title,
  subtitle,
  budget,
  block,
  rows,
}: {
  title: string;
  subtitle: string;
  budget: BudgetConditionTokenBudget;
  block: BudgetConditionBatchBlock;
  rows: BudgetConditionRow[];
}) {
  const models = block.think_tank_models;
  const labels = block.provider_labels;
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
              <th className="w-20 px-3 py-2 font-medium">Case</th>
              {MODES.map((mode) => (
                <th key={mode} className="px-3 py-2 font-medium">
                  {MODE_LABEL[mode]}
                  {mode === "blind" ? " (default)" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={row.decision_id}>
                <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold text-zinc-800">
                  {row.case_label}
                </td>
                {MODES.map((mode) => {
                  const self = selfCredit(row.self, mode);
                  const peers = row.peers_to_openai[mode];
                  const gap = selfMinusPeers(self, peers);
                  return (
                    <td key={mode} className="px-3 py-3 align-top">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-medium text-zinc-500">Self</span>
                          <Chip value={self} />
                          <GapBadge gap={gap} />
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-medium text-zinc-500">Peers → {SNAP.rated_label}</p>
                          <PeerChips peers={peers} labels={labels} />
                        </div>
                        <p className="text-[10px] tabular-nums text-zinc-400">
                          mean peers {meanPeerCredit(peers).toFixed(1)} · self {scoreForInfluence(self)}
                        </p>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AuthorshipBudgetConditionsPanel() {
  const aggOpen = SNAP.aggregate.constrained.modes.open;
  const controlOpen = SNAP.aggregate.control.modes.open;

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

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <AggregateCard
            label={SNAP.constrained.scenario_label}
            budget={SNAP.constrained.token_budget}
            agg={aggOpen}
            tone="amber"
          />
          <AggregateCard
            label={SNAP.control.control_label}
            budget={SNAP.control.token_budget}
            agg={controlOpen}
            tone="emerald"
          />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Summary uses Revealed authorship (brands visible). Self = what {SNAP.rated_label} assigned
          itself. Peers = mean of Sonnet/Fable, Gemini, and Grok rating {SNAP.rated_label}. Gap =
          self minus peers (on the 1–4 scale).
        </p>
      </div>

      <SelfPeerTable
        title={SNAP.constrained.scenario_label}
        subtitle={`${SNAP.constrained.demo_label} · five replication trials · self vs peers→${SNAP.rated_label}`}
        budget={SNAP.constrained.token_budget}
        block={SNAP.constrained}
        rows={SNAP.constrained.trials}
      />

      <SelfPeerTable
        title={SNAP.control.control_label}
        subtitle={`Five-demo authorship batch · self and peers align once budget is adequate`}
        budget={SNAP.control.token_budget}
        block={SNAP.control}
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
