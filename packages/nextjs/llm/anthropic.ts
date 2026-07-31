/**
 * Anthropic LLM Provider
 *
 * SERVER-ONLY: Do not import from client/UI code.
 */

import "server-only";
import { extractFirstBalancedJsonObject } from "@/lib/extract-json-object";
import type {
  LLMClient,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMError,
  WebSearchSource,
} from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
/** Default chat model; override with `ANTHROPIC_MODEL` in env. */
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-fable-5";
const DEFAULT_MAX_TOKENS = 4096;
const API_VERSION = "2023-06-01";
const DEFAULT_WEB_SEARCH_MAX_CONTINUATIONS = 8;

/**
 * Claude Fable 5 / Mythos 5 keep adaptive thinking always on and reject a custom
 * `temperature` (it must be 1.0 or unset). Omit the field entirely for those models.
 */
export function anthropicRejectsCustomTemperature(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes("fable") || m.includes("mythos");
}

/** Fable/Mythos always use adaptive thinking; depth is steered via output_config.effort. */
export function anthropicUsesAdaptiveEffort(model: string): boolean {
  return anthropicRejectsCustomTemperature(model);
}

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw createError("MISSING_API_KEY", "ANTHROPIC_API_KEY environment variable is not set");
  }
  return key;
}

function createError(code: string, message: string, retryable = false): LLMError {
  return { code, message, provider: "anthropic", retryable };
}

/**
 * Anthropic tool `input_schema` restricts JSON Schema arrays: `minItems` may only be 0 or 1,
 * and `maxItems` is not supported. It also requires every `object` type to explicitly set
 * `additionalProperties: false`. Clone and adjust so other providers can keep stricter schemas.
 */
function sanitizeAnthropicInputSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    const o = node as Record<string, unknown>;
    if (o.type === "array") {
      if (typeof o.minItems === "number" && o.minItems > 1) {
        o.minItems = 1;
      }
      delete o.maxItems;
    }
    // Anthropic requires additionalProperties to be explicitly false on object types.
    if (o.type === "object" && o.additionalProperties === undefined) {
      o.additionalProperties = false;
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(clone);
  return clone;
}

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/** API accepts string content or structured blocks (required to resume server tools after pause_turn). */
type AnthropicApiMessage = {
  role: "user" | "assistant";
  content: string | Record<string, unknown>[];
};

function normalizeMessages(prompt: string | LLMMessage[]): {
  system?: string;
  messages: AnthropicApiMessage[];
} {
  if (typeof prompt === "string") {
    return {
      messages: [{ role: "user", content: prompt }],
    };
  }

  const systemMessage = prompt.find((m) => m.role === "system");
  const otherMessages = prompt
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  return {
    system: systemMessage?.content,
    messages: otherMessages,
  };
}

function processAssistantBlocks(
  blocks: unknown[],
  options: LLMRequestOptions,
  pushSource: (uri: string | undefined, title?: string) => void,
): { text: string; parsed: unknown } {
  let text = "";
  let parsed: unknown;

  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const type = b.type as string | undefined;

    if (type === "text" && typeof b.text === "string") {
      text += b.text;
      if (!parsed && (options.schema || options.preferJsonObject) && b.text.includes("{")) {
        const trimmed = b.text.trim();
        let obj = safeJsonParse(trimmed);
        if (!obj) {
          const balanced = extractFirstBalancedJsonObject(trimmed);
          if (balanced) obj = safeJsonParse(balanced);
        }
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          parsed = obj;
        }
      }
      const citations = b.citations as Array<{ url?: string; title?: string }> | undefined;
      for (const c of citations ?? []) {
        pushSource(c.url, c.title);
      }
    } else if (type === "tool_use" && b.name === "structured_response") {
      const input = b.input;
      if (input !== undefined && input !== null) {
        parsed = typeof input === "string" ? safeJsonParse(input) : input;
        text = typeof parsed === "object" && parsed !== null ? JSON.stringify(parsed) : String(input);
      }
    } else if (type === "web_search_tool_result") {
      const inner = b.content;
      const rows = Array.isArray(inner) ? inner : [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const r = row as { type?: string; url?: string; title?: string };
        if (r.type === "web_search_result") {
          pushSource(r.url, r.title);
        }
      }
    }
  }

  return { text, parsed };
}

async function postMessages(
  apiKey: string,
  requestBody: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify(requestBody),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    let message = `Anthropic API error: ${response.status}`;
    if (rawBody?.trim()) {
      try {
        const error = JSON.parse(rawBody) as { error?: { message?: string }; message?: string };
        message = error?.error?.message ?? error?.message ?? message;
      } catch {
        message = rawBody.slice(0, 200);
      }
    }
    const retryable = response.status >= 500 || response.status === 429;
    throw createError(`HTTP_${response.status}`, message, retryable);
  }

  if (!rawBody?.trim()) {
    throw createError("EMPTY_RESPONSE", "Anthropic returned an empty response", true);
  }
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw createError("INVALID_JSON", `Anthropic response was not valid JSON: ${rawBody.slice(0, 100)}`, true);
  }
}

export async function run(
  prompt: string | LLMMessage[],
  options: LLMRequestOptions = {},
): Promise<LLMResponse> {
  const apiKey = getApiKey();
  const { system, messages: baseMessages } = normalizeMessages(prompt);
  const model = options.model ?? DEFAULT_MODEL;

  const requestBase: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
  if (!anthropicRejectsCustomTemperature(model)) {
    requestBase.temperature = options.temperature ?? 0.7;
  }

  if (system) {
    requestBase.system = system;
  }

  // Fable/Mythos adaptive thinking counts against max_tokens. For structured tool
  // output, default to low effort so the response is not truncated before the
  // nested arrays (e.g. contributions[]) are filled.
  if (anthropicUsesAdaptiveEffort(model)) {
    const effort =
      options.effort ??
      (options.schema || options.preferJsonObject ? "low" : undefined);
    if (effort) {
      requestBase.output_config = { effort };
    }
  }

  if (options.schema) {
    requestBase.tools = [
      {
        name: "structured_response",
        description: "Return a structured response matching the schema",
        input_schema: sanitizeAnthropicInputSchema(options.schema as Record<string, unknown>),
        strict: true,
      },
    ];
    requestBase.tool_choice = { type: "tool", name: "structured_response" };
  } else if (options.enableWebSearch) {
    requestBase.tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 8,
      },
    ];
  }

  const webSources: WebSearchSource[] = [];
  const seenUris = new Set<string>();
  const pushSource = (uri: string | undefined, title?: string) => {
    if (!uri || seenUris.has(uri)) return;
    seenUris.add(uri);
    webSources.push({ uri, title });
  };

  let content = "";
  let parsed: unknown;
  let promptTokens = 0;
  let completionTokens = 0;
  let modelOut = model;
  let stopReason: string | undefined;

  const usePauseLoop = Boolean(options.enableWebSearch && !options.schema);
  const maxContinuations = usePauseLoop
    ? Math.max(
        1,
        Number.parseInt(process.env.ANTHROPIC_WEB_SEARCH_MAX_CONTINUATIONS ?? "", 10) ||
          DEFAULT_WEB_SEARCH_MAX_CONTINUATIONS,
      )
    : 1;

  let workingMessages: AnthropicApiMessage[] = baseMessages;
  const mergedAssistantBlocks: Record<string, unknown>[] = [];

  for (let round = 0; round < maxContinuations; round++) {
    const data = await postMessages(apiKey, { ...requestBase, messages: workingMessages });

    const blocks = Array.isArray(data.content) ? data.content : [];
    mergedAssistantBlocks.push(...(blocks as Record<string, unknown>[]));

    const { text, parsed: roundParsed } = processAssistantBlocks(blocks, options, pushSource);
    content += text;
    if (roundParsed !== undefined) parsed = roundParsed;

    const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    if (usage) {
      promptTokens += usage.input_tokens ?? 0;
      completionTokens += usage.output_tokens ?? 0;
    }
    if (typeof data.model === "string") modelOut = data.model;
    stopReason = typeof data.stop_reason === "string" ? data.stop_reason : undefined;

    if (!usePauseLoop || stopReason !== "pause_turn") {
      break;
    }

    workingMessages = [...baseMessages, { role: "assistant", content: [...mergedAssistantBlocks] }];
  }

  if (!parsed && options.preferJsonObject && content.includes("{")) {
    const trimmed = content.trim();
    let obj = safeJsonParse(trimmed);
    if (!obj) {
      const balanced = extractFirstBalancedJsonObject(trimmed);
      if (balanced) obj = safeJsonParse(balanced);
    }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      parsed = obj;
    }
  }

  return {
    content,
    parsed,
    usage:
      promptTokens > 0 || completionTokens > 0
        ? {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          }
        : undefined,
    meta: {
      model: modelOut,
      provider: "anthropic",
      finishReason: stopReason,
    },
    ...(webSources.length ? { webSearch: { sources: webSources } } : {}),
  };
}

// Export a client object matching the LLMClient interface
export const anthropic: LLMClient = { run };
