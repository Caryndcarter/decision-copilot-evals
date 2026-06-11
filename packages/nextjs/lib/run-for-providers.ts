import type { LLMProviderName } from "@/types/decision";

export type FailedProvider = {
  provider: LLMProviderName;
  message: string;
};

/**
 * Run a builder across the given providers in parallel and tolerate partial failure.
 */
export async function runForProviders<T>(
  providers: LLMProviderName[],
  build: (p: LLMProviderName) => Promise<T>
): Promise<{ runs: T[]; failed_providers: FailedProvider[] }> {
  const settled = await Promise.allSettled(providers.map((p) => build(p)));
  const runs: T[] = [];
  const failed_providers: FailedProvider[] = [];
  settled.forEach((res, i) => {
    const provider = providers[i]!;
    if (res.status === "fulfilled") {
      runs.push(res.value);
    } else {
      const message = res.reason instanceof Error ? res.reason.message : String(res.reason);
      console.error(`[Run] Provider ${provider} failed:`, message);
      failed_providers.push({ provider, message });
    }
  });
  return { runs, failed_providers };
}
