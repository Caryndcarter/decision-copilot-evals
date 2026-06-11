import type { LLMProviderName } from "@/types/decision";
import { runProviderLabel } from "@/lib/run-display-name";

export const ALL_LLM_PROVIDERS: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];

export function isLLMProviderName(value: string): value is LLMProviderName {
  return ALL_LLM_PROVIDERS.includes(value as LLMProviderName);
}

export type ParsedIntakeLlmSelection =
  | { mode: "all"; providers: LLMProviderName[] }
  | { mode: "single"; providers: [LLMProviderName] }
  | { mode: "multi"; providers: LLMProviderName[] };

export function parseIntakeLlmSelection(body: {
  llm_provider?: LLMProviderName | "all";
  llm_providers?: LLMProviderName[];
}): { ok: true; value: ParsedIntakeLlmSelection } | { ok: false; error: string } {
  const hasAll = body.llm_provider === "all";
  const listed = Array.isArray(body.llm_providers) ? body.llm_providers : [];

  if (hasAll && listed.length > 0) {
    return { ok: false, error: "Cannot combine llm_provider 'all' with llm_providers" };
  }

  if (hasAll) {
    return { ok: true, value: { mode: "all", providers: ALL_LLM_PROVIDERS } };
  }

  if (listed.length > 0) {
    const invalid = listed.filter((p) => !isLLMProviderName(p));
    if (invalid.length > 0) {
      return { ok: false, error: `Invalid llm_providers: ${invalid.join(", ")}` };
    }
    const unique = [...new Set(listed)];
    if (unique.length === 0) {
      return { ok: false, error: "llm_providers must include at least one provider" };
    }
    if (unique.length === 1) {
      return { ok: true, value: { mode: "single", providers: [unique[0]!] } };
    }
    return { ok: true, value: { mode: "multi", providers: unique } };
  }

  const single = body.llm_provider ?? "openai";
  if (!isLLMProviderName(single)) {
    return { ok: false, error: `Invalid llm_provider: ${single}` };
  }
  return { ok: true, value: { mode: "single", providers: [single] } };
}

/** Build intake / freeform request body from UI selection state. */
export function buildIntakeLlmRequestBody(
  runAllProviders: boolean,
  selectedProviders: LLMProviderName[]
): { llm_provider?: LLMProviderName | "all"; llm_providers?: LLMProviderName[] } {
  if (runAllProviders) {
    return { llm_provider: "all" };
  }
  if (selectedProviders.length === 1) {
    return { llm_provider: selectedProviders[0] };
  }
  return { llm_providers: selectedProviders };
}

export function isParallelIntakeRun(runAllProviders: boolean, selectedProviders: LLMProviderName[]): boolean {
  return runAllProviders || selectedProviders.length > 1;
}

export function intakeProvidersProgressLabel(
  runAllProviders: boolean,
  selectedProviders: LLMProviderName[]
): string {
  if (runAllProviders) {
    return ALL_LLM_PROVIDERS.map(runProviderLabel).join(", ");
  }
  return selectedProviders.map(runProviderLabel).join(", ");
}
