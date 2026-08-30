import snapshot from "@/data/authorship-budget-conditions.json";
import type { ContributionInfluence, LLMProviderName } from "@/types/decision";

export type BudgetConditionInfluenceMap = Record<LLMProviderName, ContributionInfluence>;

export type BudgetConditionProviderLabels = Record<LLMProviderName, string>;

export type BudgetConditionTokenBudget = {
  headline: string;
  subhead: string;
  openai_synthesizer: number;
  other_synthesizers: number;
  note: string;
};

export type BudgetConditionRow = {
  trial: number;
  decision_id: string;
  case_label: string;
  open: BudgetConditionInfluenceMap;
  blind: BudgetConditionInfluenceMap;
  reassigned: BudgetConditionInfluenceMap;
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
  self_open_high: number;
  self_blind_high: number;
  self_reassigned_high: number;
  self_blind_vs_revealed: number;
  self_blind_vs_reassigned: number;
  self_drop_count: number;
};

export type AuthorshipBudgetConditionsSnapshot = {
  id: string;
  title: string;
  scenario_label: string;
  control_label: string;
  rater: LLMProviderName;
  rater_label: string;
  influence_scale: Record<ContributionInfluence, number>;
  takeaway: {
    test: string;
    results: string;
    meaning: string;
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

export const BUDGET_CONDITION_PEER_PROVIDERS: LLMProviderName[] = [
  "anthropic",
  "gemini",
  "xai",
];

export function selfCredit(
  map: BudgetConditionInfluenceMap,
  rater: LLMProviderName = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.rater
): ContributionInfluence {
  return map[rater];
}
