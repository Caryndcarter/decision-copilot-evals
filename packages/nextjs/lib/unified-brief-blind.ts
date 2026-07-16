import type { LLMProviderName } from "@/types/decision";
import { runProviderLabel } from "@/lib/run-display-name";

/** Stable order for assigning AI Model N aliases (not alphabetical brand names). */
const PROVIDER_ALIAS_ORDER: LLMProviderName[] = ["anthropic", "openai", "gemini", "xai"];

export type ProviderAliasMap = {
  /** Real provider → "AI Model 1" */
  toAlias: Record<LLMProviderName, string>;
  /** "AI Model 1" / "ai_model_1" → real provider */
  fromAliasLabel: Map<string, LLMProviderName>;
  fromAliasSlug: Map<string, LLMProviderName>;
  /** Ordered participating providers that received an alias. */
  providers: LLMProviderName[];
};

function aliasLabel(n: number): string {
  return `AI Model ${n}`;
}

function aliasSlug(n: number): string {
  return `ai_model_${n}`;
}

/** Build a deterministic alias map for the providers present in the given runs. */
export function buildProviderAliasMap(
  runs: { llm_provider?: LLMProviderName | string }[]
): ProviderAliasMap {
  const present = new Set<LLMProviderName>();
  for (const r of runs) {
    const p = (r.llm_provider ?? "openai") as LLMProviderName;
    present.add(p);
  }
  const providers = PROVIDER_ALIAS_ORDER.filter((p) => present.has(p));
  for (const p of present) {
    if (!providers.includes(p)) providers.push(p);
  }

  const toAlias = {} as Record<LLMProviderName, string>;
  const fromAliasLabel = new Map<string, LLMProviderName>();
  const fromAliasSlug = new Map<string, LLMProviderName>();

  providers.forEach((provider, i) => {
    const n = i + 1;
    const label = aliasLabel(n);
    const slug = aliasSlug(n);
    toAlias[provider] = label;
    fromAliasLabel.set(label.toLowerCase(), provider);
    fromAliasLabel.set(label.replace(/\s+/g, "").toLowerCase(), provider);
    fromAliasSlug.set(slug, provider);
  });

  return { toAlias, fromAliasLabel, fromAliasSlug, providers };
}

export function providerDisplayForPrompt(
  provider: LLMProviderName | string | undefined,
  map: ProviderAliasMap | null
): string {
  const p = (provider ?? "openai") as LLMProviderName;
  if (map?.toAlias[p]) return map.toAlias[p];
  return runProviderLabel(p);
}

export function providerSlugForBlindSchema(provider: LLMProviderName, map: ProviderAliasMap): string {
  const label = map.toAlias[provider];
  const n = label.match(/(\d+)$/)?.[1] ?? "1";
  return `ai_model_${n}`;
}

/** Resolve a model-returned provider key or label back to a real provider. */
export function resolveBlindProvider(
  value: string | undefined,
  map: ProviderAliasMap
): LLMProviderName | undefined {
  if (!value?.trim()) return undefined;
  const raw = value.trim();
  const lower = raw.toLowerCase();
  if (map.fromAliasSlug.has(lower)) return map.fromAliasSlug.get(lower);
  if (map.fromAliasLabel.has(lower)) return map.fromAliasLabel.get(lower);
  // Also accept "AI Model 1" with odd spacing
  const normalized = lower.replace(/\s+/g, " ").trim();
  if (map.fromAliasLabel.has(normalized)) return map.fromAliasLabel.get(normalized);
  return undefined;
}

/** Best-effort: replace alias labels in free text with real provider display names. */
export function decodeAliasesInText(text: string, map: ProviderAliasMap): string {
  if (!text) return text;
  let out = text;
  // Longer labels first (AI Model 10 before AI Model 1)
  const labels = Object.values(map.toAlias).sort((a, b) => b.length - a.length);
  for (const label of labels) {
    const provider = map.fromAliasLabel.get(label.toLowerCase());
    if (!provider) continue;
    const real = provider === "openai" ? "ChatGPT" : runProviderLabel(provider);
    const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, real);
  }
  // Slugs that sometimes leak into prose
  for (const [slug, provider] of map.fromAliasSlug) {
    const real = provider === "openai" ? "ChatGPT" : runProviderLabel(provider);
    const re = new RegExp(slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, real);
  }
  return out;
}
