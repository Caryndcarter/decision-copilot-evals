import snapshot from "@/data/authorship-budget-conditions.json";
import type { ContributionInfluence, LLMProviderName, UnifiedBriefAuthorshipMode } from "@/types/decision";

export type BudgetConditionPeerCredit = Record<
  Exclude<LLMProviderName, "openai">,
  ContributionInfluence
>;

export type BudgetConditionModeCredit = Record<UnifiedBriefAuthorshipMode, ContributionInfluence>;

export type BudgetConditionProviderLabels = Record<LLMProviderName, string>;

export type BudgetConditionTokenBudget = {
  headline: string;
  subhead: string;
  effective_max_tokens: Record<LLMProviderName, number>;
  reasoning_note: string;
  note: string;
};

export type BudgetConditionAggregateMode = {
  mean_self: number;
  mean_peers_to_openai: number;
  self_minus_peers: number;
  peers_to_openai: BudgetConditionPeerCredit;
};

export type BudgetConditionRow = {
  trial: number;
  decision_id: string;
  case_label: string;
  self: BudgetConditionModeCredit;
  peers_to_openai: Record<UnifiedBriefAuthorshipMode, BudgetConditionPeerCredit>;
  peer_mean_received?: Partial<Record<UnifiedBriefAuthorshipMode, number>>;
};

export type BudgetConditionControlDemo = BudgetConditionRow & {
  demo_id: string;
  demo_label: string;
};

export type BudgetConditionBatchBlock = {
  batch_id: string;
  harness_kind: string;
  token_budget: BudgetConditionTokenBudget;
  think_tank_models: Record<LLMProviderName, string>;
  provider_labels: BudgetConditionProviderLabels;
};

export type AuthorshipBudgetConditionsSnapshot = {
  id: string;
  title: string;
  scenario_label: string;
  control_label: string;
  rated: LLMProviderName;
  rated_label: string;
  influence_scale: Record<ContributionInfluence, number>;
  takeaway: {
    test: string;
    results: string;
    meaning: string;
  };
  aggregate: {
    constrained: {
      source: string;
      modes: Record<UnifiedBriefAuthorshipMode, BudgetConditionAggregateMode>;
    };
    control: {
      source: string;
      modes: Record<UnifiedBriefAuthorshipMode, BudgetConditionAggregateMode>;
    };
  };
  constrained: BudgetConditionBatchBlock & {
    scenario_label: string;
    demo_id: string;
    demo_label: string;
    trials: BudgetConditionRow[];
  };
  control: BudgetConditionBatchBlock & {
    control_label: string;
    demos: BudgetConditionControlDemo[];
  };
  methodology_footnotes: string[];
};

export const AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT =
  snapshot as AuthorshipBudgetConditionsSnapshot;

export const BUDGET_CONDITION_PEER_PROVIDERS: Array<Exclude<LLMProviderName, "openai">> = [
  "anthropic",
  "gemini",
  "xai",
];

export function selfCredit(
  self: BudgetConditionModeCredit,
  mode: UnifiedBriefAuthorshipMode
): ContributionInfluence {
  return self[mode];
}

export function meanPeerCredit(
  peers: BudgetConditionPeerCredit
): number {
  const snap = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT;
  const scores = BUDGET_CONDITION_PEER_PROVIDERS.map((p) => snap.influence_scale[peers[p]]);
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function scoreForInfluence(influence: ContributionInfluence): number {
  return AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.influence_scale[influence];
}

export function selfMinusPeers(
  self: ContributionInfluence,
  peers: BudgetConditionPeerCredit
): number {
  return scoreForInfluence(self) - meanPeerCredit(peers);
}
