/**
 * Unified Brief Contributions Analysis
 *
 * Anthropic (the Unified Brief author) explains which model's ideas made the cut
 * in the merged "best of all worlds" brief. Reuses the exact same source payload
 * that produced the brief, plus the resulting brief, so attributions are grounded.
 * SERVER-ONLY.
 */

import "server-only";
import { getClient } from "@/llm";
import type { LLMMessage } from "@/llm/types";
import { buildBestOfWorldsSourceUserContent } from "@/lenses/brief";
import { runProviderLabel } from "@/lib/run-display-name";
import {
  buildProviderAliasMap,
  buildProviderAliasMapFromRemap,
  decodeAliasesInText,
  providerSlugForBlindSchema,
  resolveBlindProvider,
  scrambleRemapFromAliasMap,
  type ProviderAliasMap,
} from "@/lib/unified-brief-blind";
import {
  unifiedBriefSynthesizerCoachLabel,
  type UnifiedBriefAuthorshipMode,
  type UnifiedBriefSynthesizer,
} from "@/lib/unified-briefs";
import type {
  ContributionInfluence,
  DecisionBrief,
  DecisionRunResult,
  LLMProviderName,
  ProviderContribution,
  UnifiedBriefContributions,
} from "@/types/decision";

const INFLUENCE_VALUES: ContributionInfluence[] = ["high", "medium", "low", "minimal"];
const PROVIDER_VALUES: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];

function contributionsSchema(providerEnum: string[], providerDescription: string, labelDescription: string) {
  return {
    type: "object",
    properties: {
      overall: {
        type: "string",
        description:
          "2-4 sentence narrative of how the blend came together: which model was most influential overall, where ideas converged, and where one model's distinct angle shaped the final brief.",
      },
      contributions: {
        type: "array",
        description:
          "One entry per model that participated in this decision. Do not invent models that were not present.",
        items: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              enum: providerEnum,
              description: providerDescription,
            },
            provider_label: {
              type: "string",
              description: labelDescription,
            },
            influence: {
              type: "string",
              enum: INFLUENCE_VALUES,
              description:
                "How much of this model's thinking shaped the FINAL Unified Brief. 'high' = central ideas/recommendation; 'minimal' = mostly echoed others.",
            },
            summary: {
              type: "string",
              description:
                "1-3 sentences on what this model contributed (or why it contributed little). Be specific, not generic praise.",
            },
            adopted_ideas: {
              type: "array",
              items: { type: "string" },
              description:
                "Concrete ideas/angles from this model that appear in the Unified Brief. Cite the specific idea, not a category.",
            },
            distinct_contributions: {
              type: "array",
              items: { type: "string" },
              description:
                "Unique angles ONLY this model raised that survived into the brief. Empty if it only reinforced shared points.",
            },
            not_adopted: {
              type: "array",
              items: { type: "string" },
              description:
                "Notable ideas this model raised that were deliberately NOT used, with a brief reason. Empty if none.",
            },
          },
          required: [
            "provider",
            "provider_label",
            "influence",
            "summary",
            "adopted_ideas",
            "distinct_contributions",
            "not_adopted",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["overall", "contributions"],
    additionalProperties: false,
  } as const;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function formatUnifiedBriefForPrompt(b: DecisionBrief): string {
  const lines: string[] = [];
  lines.push(`# ${b.title || "Unified Brief"}`);
  if (b.generated_at) lines.push(`Generated (ISO): ${b.generated_at}`);
  lines.push("\n## Summary\n" + truncate(b.summary ?? "", 6000));
  lines.push("\n## Recommendation\n" + truncate(b.recommendation ?? "", 2500));
  if (b.key_considerations?.length) {
    lines.push("\n## Key considerations\n" + b.key_considerations.map((k) => `- ${k}`).join("\n"));
  }
  if (b.next_steps?.length) {
    lines.push("\n## Next steps\n" + b.next_steps.map((n, i) => `${i + 1}. ${n}`).join("\n"));
  }
  if (b.custom_sections?.length) {
    lines.push("\n## Extra sections");
    for (const s of b.custom_sections) {
      if (!s.heading?.trim()) continue;
      lines.push(`\n### ${s.heading.trim()}`);
      lines.push(truncate(s.content ?? "", 4000));
    }
  }
  return lines.join("\n");
}

/** Providers that actually fed the brief, with their display labels (deduped, stable order). */
function participatingProviders(
  canonicalRuns: DecisionRunResult[],
  aliasMap: ProviderAliasMap | null
): { provider: LLMProviderName; label: string; schemaKey: string }[] {
  if (aliasMap) {
    return aliasMap.providers.map((provider) => ({
      provider,
      label: aliasMap.toAlias[provider],
      schemaKey: providerSlugForBlindSchema(provider, aliasMap),
    }));
  }
  const seen = new Map<LLMProviderName, string>();
  for (const r of canonicalRuns) {
    const provider = (r.llm_provider ?? "openai") as LLMProviderName;
    if (!seen.has(provider)) seen.set(provider, runProviderLabel(provider));
  }
  return [...seen.entries()].map(([provider, label]) => ({
    provider,
    label,
    schemaKey: provider,
  }));
}

function buildContributionsMessages(
  anchorRun: DecisionRunResult,
  canonicalRuns: DecisionRunResult[],
  allRunsForResearch: DecisionRunResult[],
  brief: DecisionBrief,
  author: UnifiedBriefSynthesizer,
  authorshipMode: UnifiedBriefAuthorshipMode,
  aliasMap: ProviderAliasMap | null
): LLMMessage[] {
  const providers = participatingProviders(canonicalRuns, aliasMap);
  const useAliasKeys = authorshipMode === "blind" || authorshipMode === "reassigned";
  const providerList = useAliasKeys
    ? providers.map((p) => `- ${p.label} (\`${p.schemaKey}\`)`).join("\n")
    : providers.map((p) => `- ${p.label} (\`${p.provider}\`)`).join("\n");
  const coach = unifiedBriefSynthesizerCoachLabel(author);

  const identityRule =
    authorshipMode === "blind"
      ? "- Models are labeled only as AI Model 1, AI Model 2, … Use those labels and the matching `ai_model_N` provider keys. Do not invent vendor brands (OpenAI, Anthropic, Gemini, xAI, etc.)."
      : authorshipMode === "reassigned"
        ? "- Provider brand names in the source blocks are reassigned (unique labels that may not match the true vendor). Use the labels and provider keys from the participating list exactly as shown."
        : "- Use the real provider keys and labels from the participating list.";

  const systemPrompt = `You are ${coach}. You are the author of the **Unified Brief** below — you merged every model/posture run, all research, and all saved variants into that one brief.

Your job now is an honest **attribution**: explain which model's ideas made the cut. For every participating model, say what they contributed to the FINAL Unified Brief, how much influence they had, and what notable ideas of theirs you deliberately left out.

**Rules**
- Produce exactly one contribution entry per model in the participating list — no more, no fewer. Never invent a model that did not participate.
${identityRule}
- Ground every claim in the raw run blocks and the Unified Brief shown below. Cite the **specific idea**, not generic praise ("good analysis" is not allowed).
- \`influence\`: high = its ideas are central to the recommendation/summary; medium = clearly shaped some sections; low = a few accents; minimal = mostly echoed what other models already said.
- \`adopted_ideas\`: concrete points from that model that you can see reflected in the brief.
- \`distinct_contributions\`: angles ONLY that model raised that survived into the brief. Leave empty if it only reinforced shared points.
- \`not_adopted\`: notable ideas that model raised that you chose NOT to include, each with a short reason. Leave empty if none.
- Be candid: it is fine (and useful) to say a model contributed little, or that its strongest idea was cut.
- \`overall\`: 2-4 sentences naming who was most influential and how the blend came together.

Return ONLY structured JSON matching the schema.`;

  const source = buildBestOfWorldsSourceUserContent(anchorRun, canonicalRuns, {
    allRunsForResearch,
    authorshipMode,
    scrambleRemap: brief.authorship_provider_remap,
  });

  const userContent = `## Participating models (one contribution entry required per item)

${providerList}

---

## The Unified Brief you authored (attribute contributions to THIS artifact)

${formatUnifiedBriefForPrompt(brief)}

---

## Raw inputs used to create the Unified Brief (same construction as synthesis)

${source}

---

Produce the contribution attribution as structured JSON. Exactly one entry per model listed above.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function coerceProvider(
  value: unknown,
  label: unknown,
  aliasMap: ProviderAliasMap | null
): LLMProviderName | undefined {
  if (typeof value === "string") {
    if (aliasMap) {
      const fromBlind = resolveBlindProvider(value, aliasMap);
      if (fromBlind) return fromBlind;
    }
    const v = value.trim().toLowerCase();
    if ((PROVIDER_VALUES as string[]).includes(v)) return v as LLMProviderName;
  }
  if (aliasMap && typeof label === "string") {
    return resolveBlindProvider(label, aliasMap);
  }
  return undefined;
}

function coerceInfluence(value: unknown): ContributionInfluence {
  if (typeof value === "string" && (INFLUENCE_VALUES as string[]).includes(value.trim().toLowerCase())) {
    return value.trim().toLowerCase() as ContributionInfluence;
  }
  return "low";
}

function realProviderLabel(provider: LLMProviderName): string {
  return provider === "openai" ? "ChatGPT" : runProviderLabel(provider);
}

function decodeTextFields(value: string, aliasMap: ProviderAliasMap | null): string {
  if (!aliasMap) return value;
  return decodeAliasesInText(value, aliasMap);
}

function coerceContributions(
  raw: unknown,
  providers: { provider: LLMProviderName; label: string }[],
  briefGeneratedAt: string | undefined,
  aliasMap: ProviderAliasMap | null
): UnifiedBriefContributions {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const overallRaw = typeof obj.overall === "string" ? obj.overall.trim() : "";
  const overall = decodeTextFields(overallRaw, aliasMap);
  const rawList = Array.isArray(obj.contributions) ? obj.contributions : [];

  const byProvider = new Map<LLMProviderName, ProviderContribution>();
  for (const item of rawList) {
    const entry = (item ?? {}) as Record<string, unknown>;
    const provider = coerceProvider(entry.provider, entry.provider_label, aliasMap);
    if (!provider) continue;
    const label = realProviderLabel(provider);
    // First entry per provider wins; ignore duplicates the model may emit.
    if (byProvider.has(provider)) continue;
    byProvider.set(provider, {
      provider,
      provider_label: label,
      influence: coerceInfluence(entry.influence),
      summary: decodeTextFields(
        typeof entry.summary === "string" ? entry.summary.trim() : "",
        aliasMap
      ),
      adopted_ideas: coerceStringArray(entry.adopted_ideas).map((s) => decodeTextFields(s, aliasMap)),
      distinct_contributions: coerceStringArray(entry.distinct_contributions).map((s) =>
        decodeTextFields(s, aliasMap)
      ),
      not_adopted: coerceStringArray(entry.not_adopted).map((s) => decodeTextFields(s, aliasMap)),
    });
  }

  // Guarantee one entry per participating provider, in a stable order, even if the model skipped one.
  const contributions: ProviderContribution[] = providers.map(({ provider }) => {
    const existing = byProvider.get(provider);
    if (existing) return existing;
    return {
      provider,
      provider_label: realProviderLabel(provider),
      influence: "minimal",
      summary: "No distinct attribution was returned for this model.",
      adopted_ideas: [],
      distinct_contributions: [],
      not_adopted: [],
    };
  });

  return {
    generated_at: new Date().toISOString(),
    brief_generated_at: briefGeneratedAt,
    overall,
    contributions,
    ...(aliasMap?.kind === "reassigned"
      ? { authorship_provider_remap: scrambleRemapFromAliasMap(aliasMap) }
      : {}),
  };
}

/**
 * Generate the Unified Brief author's attribution of which model's ideas made the cut.
 * Caller stores on `unified_brief_contributions_by_author` of the chosen storage run.
 */
export async function runUnifiedBriefContributionsAnalysis(
  anchorRun: DecisionRunResult,
  canonicalRuns: DecisionRunResult[],
  brief: DecisionBrief,
  allRunsForResearch?: DecisionRunResult[],
  author: UnifiedBriefSynthesizer = "anthropic",
  authorshipMode: UnifiedBriefAuthorshipMode | boolean = "open"
): Promise<UnifiedBriefContributions> {
  const mode: UnifiedBriefAuthorshipMode =
    typeof authorshipMode === "boolean"
      ? authorshipMode
        ? "blind"
        : "open"
      : authorshipMode;
  const researchRuns = allRunsForResearch ?? canonicalRuns;
  const aliasMap =
    mode === "blind"
      ? buildProviderAliasMap(canonicalRuns)
      : mode === "reassigned"
        ? buildProviderAliasMapFromRemap(brief.authorship_provider_remap, canonicalRuns)
        : null;
  const providers = participatingProviders(canonicalRuns, aliasMap);
  const messages = buildContributionsMessages(
    anchorRun,
    canonicalRuns,
    researchRuns,
    brief,
    author,
    mode,
    aliasMap
  );

  const schema = contributionsSchema(
    providers.map((p) => p.schemaKey),
    mode === "blind"
      ? "Blind model key: ai_model_1, ai_model_2, … matching the participating list."
      : mode === "reassigned"
        ? "Reassigned brand key as shown in the participating list (openai, anthropic, gemini, or xai)."
        : "Provider key: openai, anthropic, gemini, or xai.",
    mode === "blind"
      ? "Blind label, e.g. 'AI Model 1', 'AI Model 2'."
      : mode === "reassigned"
        ? "Brand label as shown in the participating list (may not be the true vendor)."
        : "Human label, e.g. 'OpenAI', 'Anthropic', 'Google Gemini', 'xAI'."
  );

  const response = await getClient(author).run(messages, {
    schema: schema as unknown as Record<string, unknown>,
    temperature: 0.3,
    maxTokens: 4096,
  });

  if (!response.parsed) {
    throw new Error("Unified brief contributions analysis did not return valid structured output");
  }

  return coerceContributions(
    response.parsed,
    providers.map(({ provider, label }) => ({ provider, label })),
    brief.generated_at,
    aliasMap
  );
}
