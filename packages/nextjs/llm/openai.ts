/**
 * OpenAI LLM Provider
 *
 * SERVER-ONLY: Do not import from client/UI code.
 */

import "server-only";
import type {
  LLMClient,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMError,
  WebSearchSource,
} from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
/** Default chat model; override with `OPENAI_MODEL` in env (e.g. `gpt-5.6-terra` for lower cost). */
const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
const DEFAULT_MAX_TOKENS = 4096;

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw createError("MISSING_API_KEY", "OPENAI_API_KEY environment variable is not set");
  }
  return key;
}

function createError(code: string, message: string, retryable = false): LLMError {
  return { code, message, provider: "openai", retryable };
}

function normalizeMessages(prompt: string | LLMMessage[]): LLMMessage[] {
  if (typeof prompt === "string") {
    return [{ role: "user", content: prompt }];
  }
  return prompt;
}

/**
 * GPT-5 reasoning models and o-series reject custom temperature/top_p on Chat Completions
 * (400 "unsupported_value" for temperature). `gpt-5-chat-*` is the exception.
 */
function shouldOmitSamplingParams(modelId: string): boolean {
  const m = modelId.toLowerCase();
  if (m.includes("gpt-5-chat")) return false;
  if (m.startsWith("gpt-5")) return true;
  if (/^o\d/i.test(m)) return true;
  return false;
}

/** GPT-5 / o-series Chat Completions reject `max_tokens`; require `max_completion_tokens`. */
function usesMaxCompletionTokensParam(modelId: string): boolean {
  const m = modelId.toLowerCase();
  if (m.startsWith("gpt-5")) return true;
  if (/^o\d/i.test(m)) return true;
  return false;
}

/** Assistant `content` may be a string or an array of `{ type: "text", text }` parts (reasoning-era models). */
function normalizeAssistantMessageContent(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const msg = message as { content?: unknown; refusal?: string | null };
  if (typeof msg.refusal === "string" && msg.refusal.trim()) return "";
  const c = msg.content;
  if (typeof c === "string") return c;
  if (c == null) return "";
  if (!Array.isArray(c)) return "";
  const parts: string[] = [];
  for (const part of c) {
    if (!part || typeof part !== "object") continue;
    const p = part as { type?: string; text?: string };
    if (p.type === "text" && typeof p.text === "string") parts.push(p.text);
  }
  return parts.join("");
}

export async function run(
  prompt: string | LLMMessage[],
  options: LLMRequestOptions = {}
): Promise<LLMResponse> {
  const apiKey = getApiKey();
  const messages = normalizeMessages(prompt);
  const baseModel = options.model ?? DEFAULT_MODEL;
  const useWebSearch = Boolean(options.enableWebSearch && !options.schema && !options.preferJsonObject);
  const model = useWebSearch
    ? (process.env.OPENAI_WEB_SEARCH_MODEL?.trim() || "gpt-4o-search-preview")
    : baseModel;

  const maxOut = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    ...(usesMaxCompletionTokensParam(model)
      ? { max_completion_tokens: maxOut }
      : { max_tokens: maxOut }),
    ...(!useWebSearch && !shouldOmitSamplingParams(model)
      ? { temperature: options.temperature ?? 0.7 }
      : {}),
  };

  // Add JSON schema for structured output if provided
  if (options.schema) {
    requestBody.response_format = {
      type: "json_schema",
      json_schema: {
        name: "response",
        strict: true,
        schema: options.schema,
      },
    };
  } else if (options.preferJsonObject) {
    requestBody.response_format = { type: "json_object" };
  }

  // Reasoning models burn completion budget internally; JSON/text output can be empty if effort stays high.
  const mLower = model.toLowerCase();
  if (
    (options.schema || options.preferJsonObject) &&
    usesMaxCompletionTokensParam(model) &&
    !mLower.includes("gpt-5-pro") // pro tier fixes reasoning effort (typically high only)
  ) {
    requestBody.reasoning_effort = "low";
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error?.error?.message ?? `OpenAI API error: ${response.status}`;
    const retryable = response.status >= 500 || response.status === 429;
    throw createError(`HTTP_${response.status}`, message, retryable);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const msg = choice?.message as
    | { content?: string | null; annotations?: Array<{ type?: string; url?: string; title?: string }> }
    | undefined;
  const content = normalizeAssistantMessageContent(msg);

  let parsed: unknown;
  if (options.schema || options.preferJsonObject) {
    try {
      parsed = JSON.parse(content);
    } catch {
      // Content wasn't valid JSON despite schema / json_object request
    }
  }

  const webSources: WebSearchSource[] = [];
  const seen = new Set<string>();
  for (const a of msg?.annotations ?? []) {
    if (a.type === "url_citation" && a.url && !seen.has(a.url)) {
      seen.add(a.url);
      webSources.push({ uri: a.url, title: a.title });
    }
  }

  return {
    content,
    parsed,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
    meta: {
      model: data.model ?? model,
      provider: "openai",
      finishReason: choice?.finish_reason,
    },
    ...(webSources.length ? { webSearch: { sources: webSources } } : {}),
  };
}

// Export a client object matching the LLMClient interface
export const openai: LLMClient = { run };
