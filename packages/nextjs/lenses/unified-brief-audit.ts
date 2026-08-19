/**
 * Unified Brief audit — blind structured coding on a generic rubric.
 * SERVER-ONLY.
 */

import "server-only";
import { getClient } from "@/llm";
import type { LLMMessage, LLMProvider } from "@/llm/types";
import { formatBriefForAudit, formatIntakeForAudit } from "@/lib/unified-brief-audit/format";
import {
  coerceUnifiedBriefAuditCodes,
  UNIFIED_BRIEF_AUDIT_RUBRIC_ID,
  UNIFIED_BRIEF_AUDIT_RUBRIC_VERSION,
  UNIFIED_BRIEF_AUDIT_SCHEMA,
  UNIFIED_BRIEF_AUDIT_SYSTEM_PROMPT,
  type UnifiedBriefAuditDimension,
} from "@/lib/unified-brief-audit/rubric";
import type {
  DecisionBrief,
  DecisionIntake,
  LLMProviderName,
  UnifiedBriefAudit,
} from "@/types/decision";

const DEFAULT_JUDGE: LLMProvider = "anthropic";

function resolveJudgeProvider(): LLMProvider {
  const raw = (process.env.UNIFIED_BRIEF_AUDIT_JUDGE ?? DEFAULT_JUDGE).trim().toLowerCase();
  if (raw === "openai" || raw === "anthropic" || raw === "gemini" || raw === "xai") {
    return raw;
  }
  return DEFAULT_JUDGE;
}

function buildAuditMessages(intake: DecisionIntake, briefText: string): LLMMessage[] {
  return [
    { role: "system", content: UNIFIED_BRIEF_AUDIT_SYSTEM_PROMPT },
    {
      role: "user",
      content: `## Decision intake (filer context)

${formatIntakeForAudit(intake)}

---

## Unified Brief to audit (author unknown)

${briefText}

---

Produce the audit coding as structured JSON.`,
    },
  ];
}

function toAuditFields(
  codes: ReturnType<typeof coerceUnifiedBriefAuditCodes>["codes"],
  quotes: Partial<Record<UnifiedBriefAuditDimension, string>>
): UnifiedBriefAudit["codes"] {
  const field = (key: UnifiedBriefAuditDimension) => ({
    value: codes[key],
    quote: quotes[key] ?? "",
  });

  return {
    tradeoff_honesty: field("tradeoff_honesty"),
    filer_alignment: field("filer_alignment"),
    downside_bearer: field("downside_bearer"),
    uncertainty_acknowledgment: field("uncertainty_acknowledgment"),
    stakeholder_dignity: field("stakeholder_dignity"),
    framing_truthfulness: field("framing_truthfulness"),
    premise_scrutiny: field("premise_scrutiny"),
    power_balance: field("power_balance"),
  };
}

/**
 * Blind-audit a Unified Brief against the generic rubric.
 * Caller stores on `unified_brief_audits_by_author` of the persist run.
 */
export async function runUnifiedBriefAudit(
  intake: DecisionIntake,
  brief: DecisionBrief
): Promise<UnifiedBriefAudit> {
  const judge = resolveJudgeProvider();
  const briefText = formatBriefForAudit(brief);
  if (!briefText) {
    throw new Error("Unified Brief has no content to audit.");
  }

  const messages = buildAuditMessages(intake, briefText);
  const requestOpts = {
    schema: UNIFIED_BRIEF_AUDIT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0,
    maxTokens: 4096,
    effort: "low" as const,
  };

  const client = getClient(judge);
  let response = await client.run(messages, requestOpts);
  if (!response.parsed) {
    response = await client.run(
      [
        ...messages,
        {
          role: "user",
          content:
            "Your previous reply was not valid structured JSON for the schema. Return ONLY the JSON object.",
        },
      ],
      requestOpts
    );
  }
  if (!response.parsed) {
    throw new Error("Audit judge returned no parseable structured output.");
  }

  const { codes, quotes } = coerceUnifiedBriefAuditCodes(response.parsed);

  return {
    generated_at: new Date().toISOString(),
    brief_generated_at: brief.generated_at,
    rubric_version: UNIFIED_BRIEF_AUDIT_RUBRIC_VERSION,
    rubric_id: UNIFIED_BRIEF_AUDIT_RUBRIC_ID,
    judge_provider: judge as LLMProviderName,
    codes: toAuditFields(codes, quotes),
  };
}

/** Exposed for API error messages when judge key is missing. */
export function unifiedBriefAuditJudgeProvider(): LLMProvider {
  return resolveJudgeProvider();
}

export function unifiedBriefAuditJudgeEnvKey(provider: LLMProvider): string {
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "anthropic") return "ANTHROPIC_API_KEY";
  if (provider === "gemini") return "GEMINI_API_KEY";
  return "XAI_API_KEY";
}
