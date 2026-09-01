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
import {
  UNIFIED_BRIEF_AUTHORSHIP_MODE_DISPLAY_ORDER,
  UNIFIED_BRIEF_AUTHORSHIP_MODE_LABELS,
} from "./unified-briefs";
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
  it("records constrained self-inflation vs peer consensus and Sol control alignment", () => {
    const t5 = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.constrained.trials.find((t) => t.trial === 5);
    expect(t5?.self.open).toBe("high");
    expect(t5?.self.blind).toBe("medium");
    expect(t5?.self.reassigned).toBe("high");

    const constrainedOpen = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.aggregate.constrained.modes.open;
    const controlOpen = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.aggregate.control.modes.open;
    expect(constrainedOpen.mean_self).toBe(4.0);
    expect(constrainedOpen.mean_peers_to_openai).toBeCloseTo(1.87, 2);
    expect(constrainedOpen.self_minus_peers).toBeCloseTo(2.13, 2);
    expect(controlOpen.mean_self).toBe(4.0);
    expect(controlOpen.mean_peers_to_openai).toBeCloseTo(3.93, 2);
    expect(controlOpen.self_minus_peers).toBeCloseTo(0.07, 2);

    expect(
      AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT.control.demos.every(
        (d) => d.self.open === "high" && d.self.blind === "high" && d.self.reassigned === "high"
      )
    ).toBe(true);
  });

  it("labels stored open as Revealed and leads charts with Blind", () => {
    expect(UNIFIED_BRIEF_AUTHORSHIP_MODE_LABELS.open).toBe("Revealed");
    expect(UNIFIED_BRIEF_AUTHORSHIP_MODE_LABELS.blind).toBe("Blind");
    expect(UNIFIED_BRIEF_AUTHORSHIP_MODE_DISPLAY_ORDER[0]).toBe("blind");
  });

  it("records effective caps, reasoning conditions, and per-batch models", () => {
    const snap = AUTHORSHIP_BUDGET_CONDITIONS_SNAPSHOT;
    expect(snap.title).toBe(AUTHORSHIP_BUDGET_CONDITIONS_TITLE);
    expect(snap.title.toLowerCase()).not.toMatch(/openai|gpt/);
    expect(snap.constrained.token_budget.effective_max_tokens).toEqual({
      openai: 4096,
      anthropic: 4096,
      gemini: 8192,
      xai: 4096,
    });
    expect(snap.constrained.token_budget.reasoning_note.toLowerCase()).toMatch(
      /gpt-5\.5.*reasoning_effort = .low./
    );
    expect(snap.control.token_budget.effective_max_tokens).toEqual({
      openai: 8192,
      anthropic: 16384,
      gemini: 16384,
      xai: 16384,
    });
    expect(snap.constrained.provider_labels.anthropic).toBe("Sonnet");
    expect(snap.constrained.think_tank_models.anthropic).toBe("claude-sonnet-4-6");
    expect(snap.control.provider_labels.anthropic).toBe("Fable");
    expect(snap.control.think_tank_models.anthropic).toBe("claude-fable-5");
    expect(snap.scenario_label).toBe("Civitas (constrained tokens)");
    expect(snap.takeaway.meaning.toLowerCase()).toMatch(/self|peer|inflation|consensus/);
  });
});
