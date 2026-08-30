import snapshot from "@/data/authorship-budget-conditions.json";
import type { ContributionInfluence, LLMProviderName } from "@/types/decision";

export type BudgetConditionInfluenceMap = Record<LLMProviderName, ContributionInfluence>;

export type BudgetConditionTrial = {
  trial: number;
  decision_id: string;
  open: BudgetConditionInfluenceMap;
  blind: BudgetConditionInfluenceMap;
};

export type BudgetConditionControlDemo = BudgetConditionTrial & {
  demo_id: string;
  demo_label: string;
};

export type AuthorshipBudgetConditionsSnapshot = {
  id: string;
  title: string;
  scenario_label: string;
  control_label: string;
  rater: LLMProviderName;
  rater_label: string;
  influence_scale: Record<ContributionInfluence, number>;
  starved: {
    batch_id: string;
    harness_kind: string;
    scenario_label: string;
    demo_id: string;
    demo_label: string;
    self_open_high: number;
    self_blind_high: number;
    self_drop_count: number;
    trials: Array<BudgetConditionTrial & { open: BudgetConditionInfluenceMap; blind: BudgetConditionInfluenceMap }>;
  };
  control: {
    batch_id: string;
    harness_kind: string;
    control_label: string;
    self_open_high: number;
    self_blind_high: number;
    self_drop_count: number;
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

export const BUDGET_CONDITION_PROVIDER_LABELS: Record<LLMProviderName, string> = {
  openai: "ChatGPT",
  anthropic: "Fable",
  gemini: "Gemini",
  xai: "Grok",
};

export function selfCredit(
  map: BudgetConditionInfluenceMap,
  rater: LLMProviderName = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.rater
): ContributionInfluence {
  return map[rater];
}
