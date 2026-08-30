import { describe, expect, it } from "vitest";
import { formatBriefForAudit } from "./unified-brief-audit/format";
import { stripProviderBrandsFromText } from "./unified-brief-blind";
import {
  applyFactCorrectionsToBrief,
  parseFactCheckJudgePayload,
  parseJsonObjectFromModelText,
  recommendationLeanPreserved,
  resolveFactCheckedBrief,
} from "./unified-brief-fact-check";
import {
  getUnifiedBriefFactCheckForAuthor,
  mergeUnifiedBriefFactCheckIntoRun,
} from "./unified-briefs";
import type { DecisionBrief, DecisionRunResult, UnifiedBriefFactCheck } from "@/types/decision";

function draftBrief(overrides: Partial<DecisionBrief> = {}): DecisionBrief {
  return {
    title: "Acquire MidWest Health Partners",
    generated_at: "2026-01-15T12:00:00.000Z",
    summary:
      "OpenAI and Anthropic both treat the 2019 CMS rule as binding. The target was founded in 1998.",
    recommendation:
      "Proceed with the acquisition if quality-of-earnings confirms the stated margin.",
    key_considerations: ["The 2019 CMS rule still governs reimbursement."],
    next_steps: ["Commission QoE", "Confirm 2019 CMS rule status"],
    ...overrides,
  };
}

describe("parseJsonObjectFromModelText", () => {
  it("parses a fenced JSON object", () => {
    const obj = parseJsonObjectFromModelText('prefix\n```json\n{"summary":"ok","corrections":[]}\n```\n');
    expect(obj).toEqual({ summary: "ok", corrections: [] });
  });

  it("parses a balanced object from prose", () => {
    const obj = parseJsonObjectFromModelText('Here you go: {"summary":"none","corrections":[]} thanks');
    expect(obj).toEqual({ summary: "none", corrections: [] });
  });
});

describe("empty corrections path", () => {
  it("keeps the draft substance when the judge reports no corrections", () => {
    const draft = draftBrief();
    const payload = parseFactCheckJudgePayload(
      {
        summary: "No factual corrections.",
        corrections: [],
        corrected_brief: {
          title: draft.title,
          summary: draft.summary,
          recommendation: draft.recommendation,
          key_considerations: draft.key_considerations,
          next_steps: draft.next_steps,
        },
      },
      draft.generated_at
    );
    expect(payload).not.toBeNull();
    const next = resolveFactCheckedBrief(draft, payload!);
    expect(next.summary).toBe(draft.summary);
    expect(next.recommendation).toBe(draft.recommendation);
    expect(next.generated_at).toBe(draft.generated_at);
  });
});

describe("constrained rewrite", () => {
  it("applies only factual replacements", () => {
    const draft = draftBrief();
    const next = applyFactCorrectionsToBrief(draft, [
      {
        claim_as_written: "2019 CMS rule",
        status: "corrected",
        corrected_to: "2020 CMS Interoperability rule",
        rationale: "The cited rule was finalized in 2020, not 2019.",
        sources: [{ title: "CMS", url: "https://www.cms.gov/example" }],
      },
    ]);
    expect(next.summary).toContain("2020 CMS Interoperability rule");
    expect(next.summary).not.toContain("2019 CMS rule");
    expect(next.recommendation).toBe(draft.recommendation);
    expect(next.key_considerations[0]).toContain("2020 CMS Interoperability rule");
  });

  it("does not flip the recommendation lean", () => {
    const draft = draftBrief();
    const payload = parseFactCheckJudgePayload(
      {
        summary: "One date fix.",
        corrections: [
          {
            claim_as_written: "2019 CMS rule",
            status: "corrected",
            corrected_to: "2020 CMS Interoperability rule",
            rationale: "Wrong year.",
          },
        ],
        corrected_brief: {
          title: draft.title,
          summary: "Do not acquire.",
          recommendation: "Walk away from the acquisition immediately.",
          key_considerations: ["Walk away"],
          next_steps: ["Stop"],
        },
      },
      draft.generated_at
    );
    expect(payload).not.toBeNull();
    // Judge rewrite flipped the lean → fall back to thin rewrite from the draft.
    expect(recommendationLeanPreserved(draft.recommendation, payload!.corrected_brief!.recommendation)).toBe(
      false
    );
    const next = resolveFactCheckedBrief(draft, payload!);
    expect(next.recommendation).toBe(draft.recommendation);
    expect(next.summary).toContain("2020 CMS Interoperability rule");
  });
});

describe("judge input blinding", () => {
  it("strips synthesizer and think-tank brand names from the draft text", () => {
    const text = stripProviderBrandsFromText(formatBriefForAudit(draftBrief()));
    expect(text).not.toMatch(/OpenAI|Anthropic|ChatGPT|Claude|Gemini|xAI|Grok/i);
    expect(text).toContain("an analysis");
  });
});

describe("persistence helpers", () => {
  it("stores a fact-check on the matching synthesizer and authorship mode", () => {
    const draft = draftBrief();
    const record: UnifiedBriefFactCheck = {
      generated_at: "2026-01-15T12:05:00.000Z",
      judge_provider: "gemini",
      summary: "No factual corrections.",
      corrections: [],
      draft_brief: draft,
    };
    const run = mergeUnifiedBriefFactCheckIntoRun(
      { unified_brief_fact_checks_by_author: {} } as DecisionRunResult,
      "anthropic",
      record,
      "blind"
    );
    expect(getUnifiedBriefFactCheckForAuthor(run, "anthropic", "blind")?.summary).toBe(
      "No factual corrections."
    );
    expect(getUnifiedBriefFactCheckForAuthor(run, "anthropic", "open")).toBeUndefined();
  });
});
