import { describe, expect, it } from "vitest";
import {
  AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_BATCH_ID,
  AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_LABEL,
  AUTHORSHIP_BUDGET_CONDITIONS_SCENARIO_LABEL,
  AUTHORSHIP_BUDGET_CONDITIONS_TITLE,
  CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
  authorshipBatchKindLabel,
  authorshipOnlyMongoClause,
  harnessBatchPurpose,
  harnessBatchTitle,
  harnessStudyTabForKind,
  harnessStudyTabsForBatch,
  isAuthorshipBudgetConditionsConstrainedBatch,
  isAuthorshipInfluenceIncludeBatch,
} from "./harness-meta";
import { FINDINGS_STUDIES } from "./findings-registry";

describe("authorship budget-conditions inclusion", () => {
  it("whitelists July 27 without treating it as multi-demo-authorship", () => {
    expect(isAuthorshipBudgetConditionsConstrainedBatch(CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID)).toBe(
      true
    );
    expect(isAuthorshipInfluenceIncludeBatch(CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID)).toBe(true);
    expect(harnessStudyTabForKind("civitas-replication")).toBe("replication");
    expect(isAuthorshipInfluenceIncludeBatch("00000000-0000-0000-0000-000000000000")).toBe(false);
  });

  it("dual-lists July 27 under replication and authorship", () => {
    expect(
      harnessStudyTabsForBatch({
        kind: "civitas-replication",
        batchId: CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
      })
    ).toEqual(["replication", "authorship-influence"]);
    expect(
      harnessStudyTabsForBatch({
        kind: "civitas-replication",
        batchId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      })
    ).toEqual(["replication"]);
  });

  it("uses budget-conditions title on the authorship tab only", () => {
    expect(
      harnessBatchTitle({
        kind: "civitas-replication",
        batchId: CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
        studyTab: "authorship-influence",
      })
    ).toBe(AUTHORSHIP_BUDGET_CONDITIONS_TITLE);
    expect(
      harnessBatchTitle({
        kind: "civitas-replication",
        batchId: CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
        studyTab: "replication",
      })
    ).toBe("Replication · Civitas");
    expect(
      authorshipBatchKindLabel({
        harnessKind: "multi-demo-authorship",
        batchId: AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_BATCH_ID,
      })
    ).toContain(AUTHORSHIP_BUDGET_CONDITIONS_CONTROL_LABEL);
  });

  it("keeps model names out of the primary title and in purpose footnotes only", () => {
    expect(AUTHORSHIP_BUDGET_CONDITIONS_TITLE.toLowerCase()).not.toMatch(/openai|gpt/);
    expect(AUTHORSHIP_BUDGET_CONDITIONS_SCENARIO_LABEL).toBe("Civitas (constrained tokens)");
    const purpose = harnessBatchPurpose("civitas-replication", {
      batchId: CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID,
      studyTab: "authorship-influence",
    });
    expect(purpose).toContain("budget conditions");
    expect(purpose.toLowerCase()).not.toMatch(/gpt-5|maxTokens|4096/);
  });

  it("expands the authorship Mongo clause beyond multi-demo-authorship", () => {
    const clause = authorshipOnlyMongoClause();
    expect(clause.harness_run).toBe(true);
    const or = clause.$or as Array<Record<string, unknown>>;
    expect(or).toEqual(
      expect.arrayContaining([
        { harness_kind: "multi-demo-authorship" },
        {
          harness_batch_id: {
            $in: expect.arrayContaining([CIVITAS_REPLICATION_DYNAMO_JULY27_BATCH_ID]),
          },
        },
      ])
    );
  });

  it("uses constrained-tokens labels in findings copy", () => {
    const study = FINDINGS_STUDIES.find((s) => s.id === "authorship-budget-conditions");
    expect(study).toBeDefined();
    expect(study!.name.toLowerCase()).not.toMatch(/openai/);
    expect(study!.eyebrow).toBe(AUTHORSHIP_BUDGET_CONDITIONS_TITLE);
    const blob = [
      study!.name,
      study!.eyebrow,
      study!.dek,
      ...study!.findings.map((f) => `${f.headline} ${f.body}`),
      ...study!.methodology,
      ...study!.stats.map((s) => s.label),
    ].join(" ");
    expect(blob.toLowerCase()).not.toMatch(/starv/);
    expect(blob).toContain("constrained tokens");
    expect(blob).toContain("4,096");
    expect(blob).toContain("Sonnet");
    expect(blob).toMatch(/Reassigned/);
  });
});
