/**
 * OpenAI LLM Provider
 *
 * SERVER-ONLY: Do not import from client/UI code.
 *
 * Chat Completions for normal / structured calls.
 * Responses API + `web_search` tool when `enableWebSearch` is set
 * (replaces deprecated `gpt-4o-search-preview`).
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

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
/** Default chat model; override with `OPENAI_MODEL` in env (e.g. `gpt-5.6-terra` for lower cost). */
const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
/** GPT-5 reasoning burns completion budget; 4k often yields empty content + finish_reason length. */
const DEFAULT_MAX_TOKENS = 8192;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOpenAI(
  apiKey: string,
  url: string,
  requestBody: Record<string, unknown>,
  attempt = 1
): Promise<Response> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (attempt < 3 && /fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(message)) {
      console.warn(`[openai] fetch failed (attempt ${attempt}/3); retrying…`, message);
      await sleep(400 * attempt);
      return fetchOpenAI(apiKey, url, requestBody, attempt + 1);
    }
    throw createError("FETCH_FAILED", message, true);
  }
}

function splitSystemForResponses(messages: LLMMessage[]): {
  instructions?: string;
  input: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemParts: string[] = [];
  const input: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of messages) {
    if (m.role === "system") systemParts.push(m.content);
    else input.push({ role: m.role, content: m.content });
  }
  return {
    ...(systemParts.length ? { instructions: systemParts.join("\n\n") } : {}),
    input: input.length > 0 ? input : [{ role: "user", content: "" }],
  };
}

function parseResponsesPayload(data: Record<string, unknown>): {
  content: string;
  sources: WebSearchSource[];
  queries: string[];
} {
  const textParts: string[] = [];
  const sources: WebSearchSource[] = [];
  const queries: string[] = [];
  const seen = new Set<string>();

  const pushSource = (uri: unknown, title?: unknown) => {
    if (typeof uri !== "string" || !uri || seen.has(uri)) return;
    seen.add(uri);
    sources.push({
      uri,
      ...(typeof title === "string" && title ? { title } : {}),
    });
  };

  const output = Array.isArray(data.output) ? data.output : [];
  for (const raw of output) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (item.type === "web_search_call") {
      const action =
        item.action && typeof item.action === "object"
          ? (item.action as Record<string, unknown>)
          : undefined;
      if (typeof action?.query === "string" && action.query.trim()) {
        queries.push(action.query.trim());
      }
      const actionSources = Array.isArray(action?.sources) ? action.sources : [];
      for (const s of actionSources) {
        if (!s || typeof s !== "object") continue;
        const src = s as Record<string, unknown>;
        pushSource(src.url ?? src.uri, src.title);
      }
    }
    if (item.type === "message") {
      const content = Array.isArray(item.content) ? item.content : [];
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const c = part as Record<string, unknown>;
        if (
          (c.type === "output_text" || c.type === "text") &&
          typeof c.text === "string"
        ) {
          textParts.push(c.text);
          const anns = Array.isArray(c.annotations) ? c.annotations : [];
          for (const a of anns) {
            if (!a || typeof a !== "object") continue;
            const ann = a as Record<string, unknown>;
            if (ann.type === "url_citation") pushSource(ann.url, ann.title);
          }
        }
      }
    }
  }

  const joined = textParts.join("\n").trim();
  const fallback =
    typeof data.output_text === "string" ? data.output_text.trim() : "";
  return {
    content: joined || fallback,
    sources,
    queries,
  };
}

async function runWithWebSearch(
  apiKey: string,
  messages: LLMMessage[],
  options: LLMRequestOptions,
  maxOut: number
): Promise<LLMResponse> {
  const model =
    process.env.OPENAI_WEB_SEARCH_MODEL?.trim() ||
    options.model ||
    DEFAULT_MODEL;
  const { instructions, input } = splitSystemForResponses(messages);

  const requestBody: Record<string, unknown> = {
    model,
    input,
    tools: [{ type: "web_search" }],
    max_output_tokens: maxOut,
  };
  if (instructions) requestBody.instructions = instructions;

  // Keep reasoning light so search + answer fit the output budget.
  const mLower = model.toLowerCase();
  if (usesMaxCompletionTokensParam(model) && !mLower.includes("gpt-5-pro")) {
    requestBody.reasoning = { effort: options.effort ?? "low" };
  }

  const response = await fetchOpenAI(apiKey, OPENAI_RESPONSES_URL, requestBody);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      (error as { error?: { message?: string } })?.error?.message ??
      `OpenAI API error: ${response.status}`;
    const retryable = response.status >= 500 || response.status === 429;
    throw createError(`HTTP_${response.status}`, message, retryable);
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (data.error && typeof data.error === "object") {
    const err = data.error as { message?: string };
    throw createError("RESPONSES_ERROR", err.message ?? "OpenAI Responses error", true);
  }

  const { content, sources, queries } = parseResponsesPayload(data);
  const usage =
    data.usage && typeof data.usage === "object"
      ? (data.usage as {
          input_tokens?: number;
          output_tokens?: number;
          total_tokens?: number;
        })
      : undefined;

  return {
    content,
    usage: usage
      ? {
          promptTokens: usage.input_tokens ?? 0,
          completionTokens: usage.output_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
        }
      : undefined,
    meta: {
      model: typeof data.model === "string" ? data.model : model,
      provider: "openai",
      finishReason: typeof data.status === "string" ? data.status : undefined,
    },
    ...(sources.length || queries.length
      ? { webSearch: { ...(queries.length ? { queries } : {}), ...(sources.length ? { sources } : {}) } }
      : {}),
  };
}

async function runOnce(
  apiKey: string,
  messages: LLMMessage[],
  options: LLMRequestOptions,
  maxOut: number
): Promise<LLMResponse> {
  const useWebSearch = Boolean(
    options.enableWebSearch && !options.schema && !options.preferJsonObject
  );
  if (useWebSearch) {
    return runWithWebSearch(apiKey, messages, options, maxOut);
  }

  const model = options.model ?? DEFAULT_MODEL;

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    ...(usesMaxCompletionTokensParam(model)
      ? { max_completion_tokens: maxOut }
      : { max_tokens: maxOut }),
    ...(!shouldOmitSamplingParams(model)
      ? { temperature: options.temperature ?? 0.7 }
      : {}),
  };

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

  const mLower = model.toLowerCase();
  if (
    (options.schema || options.preferJsonObject) &&
    usesMaxCompletionTokensParam(model) &&
    !mLower.includes("gpt-5-pro")
  ) {
    requestBody.reasoning_effort = "low";
  }

  const response = await fetchOpenAI(apiKey, OPENAI_CHAT_URL, requestBody);

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

export async function run(
  prompt: string | LLMMessage[],
  options: LLMRequestOptions = {}
): Promise<LLMResponse> {
  const apiKey = getApiKey();
  const messages = normalizeMessages(prompt);
  const wantsJson = Boolean(options.schema || options.preferJsonObject);
  let maxOut = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  let result = await runOnce(apiKey, messages, options, maxOut);

  // GPT-5 often returns empty content when reasoning eats the whole completion budget.
  if (wantsJson && !result.parsed && usesMaxCompletionTokensParam(result.meta?.model ?? DEFAULT_MODEL)) {
    const bumped = Math.max(maxOut, 16_384);
    if (bumped > maxOut || !result.content.trim()) {
      console.warn("[openai] Empty/unparseable structured output; retrying with higher max_completion_tokens.", {
        finishReason: result.meta?.finishReason,
        contentLen: result.content.length,
        completionTokens: result.usage?.completionTokens,
        fromMaxTokens: maxOut,
        toMaxTokens: bumped,
      });
      maxOut = bumped;
      result = await runOnce(apiKey, messages, options, maxOut);
    }
  }

  return result;
}

export const openai: LLMClient = { run };
