import { describe, expect, it } from "vitest";
import {
  buildAuthorshipBatchSummaries,
  runQualifiesForAuthorshipSummary,
} from "./authorship-harness-summary";
import { AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT } from "./authorship-budget-conditions";
import {
  AUTHORSHIP_BUDGET_CONDITIONS_TITLE,
  CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
} from "./harness-meta";
import type {
  ContributionInfluence,
  DecisionRunResult,
  LLMProviderName,
  UnifiedBriefContributions,
} from "@/types/decision";

function contrib(
  cells: Partial<Record<LLMProviderName, ContributionInfluence>>
): UnifiedBriefContributions {
  return {
    generated_at: "2026-07-27T00:00:00.000Z",
    overall: "test",
    contributions: (Object.entries(cells) as [LLMProviderName, ContributionInfluence][]).map(
      ([provider, influence]) => ({
        provider,
        provider_label: provider,
        influence,
        summary: "test",
        adopted_ideas: [],
        distinct_contributions: [],
        not_adopted: [],
      })
    ),
  };
}

function run(opts: {
  decision_id: string;
  batch_id: string;
  kind: DecisionRunResult["harness_kind"];
  trial: number;
  demo?: string;
  includeContribs?: boolean;
}): DecisionRunResult {
  return {
    decision_id: opts.decision_id,
    run_id: `${opts.decision_id}-openai`,
    status: "complete",
    harness_run: true,
    harness_kind: opts.kind,
    harness_batch_id: opts.batch_id,
    harness_trial: opts.trial,
    demo_scenario_id: opts.demo ?? "meridian-civitas-saas-rollup",
    unified_brief_contributions_by_author: opts.includeContribs === false
      ? undefined
      : {
          openai: {
            open: contrib({ openai: "high", anthropic: "medium", gemini: "low", xai: "medium" }),
            blind: contrib({ openai: "high", anthropic: "medium", gemini: "low", xai: "medium" }),
          },
        },
  } as DecisionRunResult;
}

describe("buildAuthorshipBatchSummaries budget-conditions include", () => {
  it("includes July 27 without rewriting harness_kind", () => {
    const summaries = buildAuthorshipBatchSummaries([
      run({
        decision_id: "a8d55d23-63d9-48d9-b702-d8c4a46d829b",
        batch_id: CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
        kind: "civitas-replication",
        trial: 1,
      }),
    ]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.harness_kind).toBe("civitas-replication");
    expect(summaries[0]!.kind_label).toBe(AUTHORSHIP_BUDGET_CONDITIONS_TITLE);
    expect(summaries[0]!.budget_condition).toBe("constrained");
    expect(summaries[0]!.demos[0]!.modes.open.contributions).toBe(1);
    expect(summaries[0]!.demos[0]!.modes.blind.contributions).toBe(1);
  });

  it("skips other civitas-replication batches", () => {
    const other = run({
      decision_id: "other-decision",
      batch_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      kind: "civitas-replication",
      trial: 1,
    });
    expect(runQualifiesForAuthorshipSummary(other)).toBe(false);
    expect(buildAuthorshipBatchSummaries([other])).toEqual([]);
  });

  it("still includes multi-demo-authorship batches", () => {
    const summaries = buildAuthorshipBatchSummaries([
      run({
        decision_id: "demo-1",
        batch_id: "11111111-2222-3333-4444-555555555555",
        kind: "multi-demo-authorship",
        trial: 1,
        demo: "vp-sales-underperforming",
      }),
    ]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.harness_kind).toBe("multi-demo-authorship");
    expect(summaries[0]!.budget_condition).toBeUndefined();
  });
});

describe("committed budget-conditions snapshot", () => {
  it("records the T5 self drop and Sol control with no drop", () => {
    const t5 = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.constrained.trials.find((t) => t.trial === 5);
    expect(t5?.open.openai).toBe("high");
    expect(t5?.blind.openai).toBe("medium");
    expect(AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.constrained.self_drop_count).toBe(1);
    expect(AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.control.self_drop_count).toBe(0);
    expect(
      AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.control.demos.every(
        (d) => d.open.openai === "high" && d.blind.openai === "high"
      )
    ).toBe(true);
  });

  it("keeps synthesizer token budget in footnotes, not the title", () => {
    expect(AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.title).toBe(AUTHORSHIP_BUDGET_CONDITIONS_TITLE);
    expect(AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.title.toLowerCase()).not.toMatch(/openai|gpt/);
    expect(AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.methodology_footnotes.join(" ")).toMatch(/4096/);
    expect(AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.scenario_label).toBe("Civitas (constrained tokens)");
  });
});
