import type { LLMProviderName } from "@/types/decision";
import { runProviderLabel } from "@/lib/run-display-name";

/** Stable order for assigning AI Model N aliases / scramble slots. */
const PROVIDER_ALIAS_ORDER: LLMProviderName[] = ["anthropic", "openai", "gemini", "xai"];

export type ProviderAliasMap = {
  /** Real provider → display label shown in the prompt */
  toAlias: Record<LLMProviderName, string>;
  /** Display label (lowercased) → real provider */
  fromAliasLabel: Map<string, LLMProviderName>;
  /** Schema / slug key shown to the model → real provider */
  fromAliasSlug: Map<string, LLMProviderName>;
  /** Ordered participating providers that received an alias. */
  providers: LLMProviderName[];
  /**
   * Reassigned mode only: real provider → brand key used as its label in the prompt
   * (bijection over `providers`).
   */
  realToLabelKey?: Partial<Record<LLMProviderName, LLMProviderName>>;
  kind?: "blind" | "reassigned";
};

function aliasLabel(n: number): string {
  return `AI Model ${n}`;
}

function aliasSlug(n: number): string {
  return `ai_model_${n}`;
}

function displayNameForProviderKey(key: LLMProviderName): string {
  return key === "openai" ? "ChatGPT" : runProviderLabel(key);
}

/** Extra label spellings the model may emit for a brand key. */
function labelVariantsForKey(key: LLMProviderName): string[] {
  switch (key) {
    case "openai":
      return ["ChatGPT", "OpenAI", "GPT", "GPT-4", "GPT-5"];
    case "anthropic":
      return ["Anthropic", "Claude", "Anthropic Claude"];
    case "gemini":
      return ["Google Gemini", "Gemini", "Google"];
    case "xai":
      return ["xAI", "Grok", "x.ai"];
    default:
      return [displayNameForProviderKey(key)];
  }
}

function participatingProvidersFromRuns(
  runs: { llm_provider?: LLMProviderName | string }[]
): LLMProviderName[] {
  const present = new Set<LLMProviderName>();
  for (const r of runs) {
    const p = (r.llm_provider ?? "openai") as LLMProviderName;
    present.add(p);
  }
  const providers = PROVIDER_ALIAS_ORDER.filter((p) => present.has(p));
  for (const p of present) {
    if (!providers.includes(p)) providers.push(p);
  }
  return providers;
}

function emptyAliasMaps(): Pick<ProviderAliasMap, "toAlias" | "fromAliasLabel" | "fromAliasSlug"> {
  return {
    toAlias: {} as Record<LLMProviderName, string>,
    fromAliasLabel: new Map<string, LLMProviderName>(),
    fromAliasSlug: new Map<string, LLMProviderName>(),
  };
}

function registerLabel(map: ProviderAliasMap, label: string, real: LLMProviderName) {
  const lower = label.toLowerCase();
  map.fromAliasLabel.set(lower, real);
  map.fromAliasLabel.set(label.replace(/\s+/g, "").toLowerCase(), real);
}

/** Build a deterministic alias map for the providers present in the given runs (AI Model N). */
export function buildProviderAliasMap(
  runs: { llm_provider?: LLMProviderName | string }[]
): ProviderAliasMap {
  const providers = participatingProvidersFromRuns(runs);
  const map: ProviderAliasMap = {
    ...emptyAliasMaps(),
    providers,
    kind: "blind",
  };

  providers.forEach((provider, i) => {
    const n = i + 1;
    const label = aliasLabel(n);
    const slug = aliasSlug(n);
    map.toAlias[provider] = label;
    registerLabel(map, label, provider);
    map.fromAliasSlug.set(slug, provider);
  });

  return map;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * Random bijection of participating providers onto brand labels (each voice used once).
 * Prefers a derangement (no provider labeled as itself) when n ≥ 2.
 */
export function randomProviderPermutation(providers: LLMProviderName[]): LLMProviderName[] {
  if (providers.length <= 1) return [...providers];
  const labels = [...providers];
  for (let attempt = 0; attempt < 48; attempt++) {
    shuffleInPlace(labels);
    if (providers.every((p, i) => labels[i] !== p)) return [...labels];
  }
  // Guaranteed derangement via rotation
  return [...providers.slice(1), providers[0]!];
}

/** Build a random scramble map: each real provider is shown under a unique other brand name. */
export function buildProviderScrambleMap(
  runs: { llm_provider?: LLMProviderName | string }[]
): ProviderAliasMap {
  const providers = participatingProvidersFromRuns(runs);
  const labelKeys = randomProviderPermutation(providers);
  return buildProviderAliasMapFromRemap(
    Object.fromEntries(providers.map((real, i) => [real, labelKeys[i]!])) as Partial<
      Record<LLMProviderName, LLMProviderName>
    >,
    runs
  );
}

/** Rebuild a scramble map from a persisted real→label-key remap (for contributions). */
export function buildProviderAliasMapFromRemap(
  remap: Partial<Record<LLMProviderName, LLMProviderName>> | undefined,
  runs: { llm_provider?: LLMProviderName | string }[]
): ProviderAliasMap {
  const providers = participatingProvidersFromRuns(runs);
  const map: ProviderAliasMap = {
    ...emptyAliasMaps(),
    providers,
    realToLabelKey: {},
    kind: "reassigned",
  };

  // Ensure bijection: use remap when valid, otherwise fill remaining with unused labels.
  const usedLabels = new Set<LLMProviderName>();
  for (const real of providers) {
    const labelKey = remap?.[real];
    if (labelKey && providers.includes(labelKey) && !usedLabels.has(labelKey)) {
      map.realToLabelKey![real] = labelKey;
      usedLabels.add(labelKey);
    }
  }
  const unusedLabels = providers.filter((p) => !usedLabels.has(p));
  for (const real of providers) {
    if (map.realToLabelKey![real]) continue;
    const labelKey = unusedLabels.shift() ?? real;
    map.realToLabelKey![real] = labelKey;
  }

  for (const real of providers) {
    const labelKey = map.realToLabelKey![real]!;
    const display = displayNameForProviderKey(labelKey);
    map.toAlias[real] = display;
    map.fromAliasSlug.set(labelKey, real);
    for (const variant of labelVariantsForKey(labelKey)) {
      registerLabel(map, variant, real);
    }
  }

  return map;
}

export function scrambleRemapFromAliasMap(
  map: ProviderAliasMap
): Partial<Record<LLMProviderName, LLMProviderName>> | undefined {
  if (map.kind !== "reassigned" || !map.realToLabelKey) return undefined;
  return { ...map.realToLabelKey };
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
  if (map.kind === "reassigned" && map.realToLabelKey?.[provider]) {
    return map.realToLabelKey[provider]!;
  }
  const label = map.toAlias[provider];
  const n = label?.match(/(\d+)$/)?.[1] ?? "1";
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
  const normalized = lower.replace(/\s+/g, " ").trim();
  if (map.fromAliasLabel.has(normalized)) return map.fromAliasLabel.get(normalized);
  return undefined;
}

/**
 * Best-effort: replace prompt aliases / scrambled brand names in free text with real provider names.
 * Uses placeholders so swapped brand names (reassigned mode) do not double-replace.
 */
export function decodeAliasesInText(text: string, map: ProviderAliasMap): string {
  if (!text) return text;

  type Replacement = { pattern: string; real: string };
  const replacements: Replacement[] = [];

  if (map.kind === "reassigned" && map.realToLabelKey) {
    for (const real of map.providers) {
      const labelKey = map.realToLabelKey[real];
      if (!labelKey) continue;
      const realDisplay = displayNameForProviderKey(real);
      for (const variant of labelVariantsForKey(labelKey)) {
        replacements.push({ pattern: variant, real: realDisplay });
      }
    }
  } else {
    for (const label of Object.values(map.toAlias).sort((a, b) => b.length - a.length)) {
      const provider = map.fromAliasLabel.get(label.toLowerCase());
      if (!provider) continue;
      replacements.push({ pattern: label, real: displayNameForProviderKey(provider) });
    }
    for (const [slug, provider] of map.fromAliasSlug) {
      replacements.push({ pattern: slug, real: displayNameForProviderKey(provider) });
    }
  }

  // Longer patterns first
  replacements.sort((a, b) => b.pattern.length - a.pattern.length);

  let out = text;
  const tokens: string[] = [];
  for (let i = 0; i < replacements.length; i++) {
    const { pattern } = replacements[i]!;
    const token = `\u0000PH${i}\u0000`;
    tokens[i] = token;
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, token);
  }
  for (let i = 0; i < replacements.length; i++) {
    out = out.split(tokens[i]!).join(replacements[i]!.real);
  }
  return out;
}
