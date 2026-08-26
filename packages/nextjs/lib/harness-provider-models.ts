import type { LLMProviderName } from "@/types/decision";
import {
  MERIDIAN_IC_VOICE_EARLY_BATCH_ID,
  MERIDIAN_IC_VOICE_RUN1_BATCH_ID,
} from "@/lib/harness-meta";

/** Code defaults (match packages/nextjs/llm/*.ts). */
export const DEFAULT_PROVIDER_MODELS: Record<LLMProviderName, string> = {
  openai: "gpt-5.6-sol",
  anthropic: "claude-fable-5",
  gemini: "gemini-3.6-flash",
  xai: "grok-4.5",
};

const PROVIDER_ORDER: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];

const PROVIDER_LABELS: Record<LLMProviderName, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  xai: "xAI",
};

/** Resolve model id for a provider (harness scripts + backfill). */
export function modelIdForProvider(provider: LLMProviderName): string {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_MODEL?.trim() || DEFAULT_PROVIDER_MODELS.openai;
    case "anthropic":
      return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_PROVIDER_MODELS.anthropic;
    case "gemini":
      return process.env.GEMINI_MODEL?.trim() || DEFAULT_PROVIDER_MODELS.gemini;
    case "xai":
      return process.env.XAI_MODEL?.trim() || DEFAULT_PROVIDER_MODELS.xai;
  }
}

export type HarnessBatchModelSnapshot = {
  /** Primary think-tank model per provider (unique values if a batch mixed models). */
  provider_models: Partial<Record<LLMProviderName, string[]>>;
  /** Clarification demo-sample generator (when recorded). */
  clarification_model?: string;
  /** Clarification question dedupe (Gemini). */
  clarification_dedupe_model?: string;
};

/** Recorded snapshots for batches run before `llm_model` was persisted on runs. */
export const HARNESS_BATCH_MODEL_SNAPSHOTS: Record<string, HarnessBatchModelSnapshot> = {
  [MERIDIAN_IC_VOICE_RUN1_BATCH_ID]: {
    provider_models: {
      openai: ["gpt-5.6-sol"],
      anthropic: ["claude-fable-5"],
      gemini: ["gemini-3.6-flash"],
      xai: ["grok-4.5"],
    },
    clarification_model: "claude-fable-5",
    clarification_dedupe_model: "gemini-3.6-flash",
  },
  [MERIDIAN_IC_VOICE_EARLY_BATCH_ID]: {
    provider_models: {
      openai: ["gpt-5.6-sol"],
      anthropic: ["claude-fable-5"],
      gemini: ["gemini-3.6-flash"],
      xai: ["grok-4.5"],
    },
    clarification_model: "claude-fable-5",
    clarification_dedupe_model: "gemini-3.6-flash",
  },
  "7b549540-374c-4fbb-bb4b-72a8902864a9": {
    provider_models: {
      openai: ["gpt-5.6-sol"],
      anthropic: ["claude-fable-5"],
      gemini: ["gemini-3.6-flash"],
      xai: ["grok-4.5"],
    },
    clarification_model: "claude-fable-5",
    clarification_dedupe_model: "gemini-3.6-flash",
  },
  "c40d96df-a530-4f17-96d2-84975f5af930": {
    provider_models: {
      openai: ["gpt-5.6-sol"],
      anthropic: ["claude-fable-5"],
      gemini: ["gemini-3.6-flash"],
      xai: ["grok-4.5"],
    },
    clarification_model: "claude-fable-5",
    clarification_dedupe_model: "gemini-3.6-flash",
  },
  "bc243273-6103-470c-9f11-94943925ca95": {
    provider_models: {
      openai: ["gpt-5.6-sol"],
      anthropic: ["claude-fable-5"],
      gemini: ["gemini-3.6-flash"],
      xai: ["grok-4.5"],
    },
    clarification_model: "claude-fable-5",
    clarification_dedupe_model: "gemini-3.6-flash",
  },
};

function normalizeBatchId(batchId: string | undefined): string | undefined {
  const raw = batchId?.trim();
  if (!raw || raw.includes(":") || raw.startsWith("legacy:")) return undefined;
  return raw;
}

function mergeProviderModelMaps(
  ...maps: Array<Partial<Record<LLMProviderName, string[]>> | undefined>
): Partial<Record<LLMProviderName, string[]>> {
  const out: Partial<Record<LLMProviderName, Set<string>>> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const provider of PROVIDER_ORDER) {
      const models = map[provider];
      if (!models?.length) continue;
      if (!out[provider]) out[provider] = new Set();
      for (const m of models) out[provider]!.add(m);
    }
  }
  const result: Partial<Record<LLMProviderName, string[]>> = {};
  for (const provider of PROVIDER_ORDER) {
    const set = out[provider];
    if (set?.size) result[provider] = [...set];
  }
  return result;
}

/** Merge models observed on runs with a committed snapshot (when present). */
export function resolveHarnessBatchModels(opts: {
  batchId?: string;
  trialModels?: Array<Partial<Record<LLMProviderName, string[]>> | undefined>;
}): HarnessBatchModelSnapshot {
  const fromTrials = mergeProviderModelMaps(...(opts.trialModels ?? []));
  const canonicalId = normalizeBatchId(opts.batchId);
  const snapshot = canonicalId ? HARNESS_BATCH_MODEL_SNAPSHOTS[canonicalId] : undefined;

  const provider_models = mergeProviderModelMaps(snapshot?.provider_models, fromTrials);

  return {
    provider_models,
    clarification_model: snapshot?.clarification_model,
    clarification_dedupe_model: snapshot?.clarification_dedupe_model,
  };
}

function formatProviderModels(
  provider_models: Partial<Record<LLMProviderName, string[]>>
): string | undefined {
  const parts = PROVIDER_ORDER.filter((p) => provider_models[p]?.length).map((p) => {
    const models = provider_models[p]!.join(" / ");
    return `${PROVIDER_LABELS[p]} ${models}`;
  });
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** One- or two-line description for a harness batch header. */
export function formatHarnessBatchModelsDescription(snapshot: HarnessBatchModelSnapshot): string[] {
  const lines: string[] = [];
  const thinkTank = formatProviderModels(snapshot.provider_models);
  if (thinkTank) lines.push(`Think-tank models: ${thinkTank}`);
  const aux: string[] = [];
  if (snapshot.clarification_model) {
    aux.push(`clarification samples ${snapshot.clarification_model}`);
  }
  if (snapshot.clarification_dedupe_model) {
    aux.push(`dedupe ${snapshot.clarification_dedupe_model}`);
  }
  if (aux.length) lines.push(`Also: ${aux.join(" · ")}`);
  return lines;
}
