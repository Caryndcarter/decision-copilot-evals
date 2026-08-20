/**
 * xAI LLM Provider (OpenAI-compatible Chat Completions + Responses for web search)
 *
 * SERVER-ONLY: Do not import from client/UI code.
 *
 * Chat Completions for normal / structured calls.
 * Responses API + `web_search` tool when `enableWebSearch` is set
 * (legacy `search_parameters` live search is retired).
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

const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";
const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";
/** Default chat model; override with `XAI_MODEL` in env. */
const DEFAULT_MODEL = process.env.XAI_MODEL?.trim() || "grok-4.5";
const DEFAULT_MAX_TOKENS = 4096;

function getApiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw createError("MISSING_API_KEY", "XAI_API_KEY environment variable is not set");
  }
  return key;
}

function createError(code: string, message: string, retryable = false): LLMError {
  return { code, message, provider: "xai", retryable };
}

function normalizeMessages(prompt: string | LLMMessage[]): LLMMessage[] {
  if (typeof prompt === "string") {
    return [{ role: "user", content: prompt }];
  }
  return prompt;
}

function normalizeAssistantMessageContent(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const msg = message as { content?: unknown };
  const c = msg.content;
  if (typeof c === "string") return c;
  if (c == null || !Array.isArray(c)) return "";
  const parts: string[] = [];
  for (const part of c) {
    if (!part || typeof part !== "object") continue;
    const p = part as { type?: string; text?: string };
    if (p.type === "text" && typeof p.text === "string") parts.push(p.text);
  }
  return parts.join("");
}

/** Grok sometimes wraps JSON in fences or adds a short preface; peel that off before parse. */
function tryParseStructuredContent(content: string): unknown | undefined {
  const trimmed = content.trim();
  if (!trimmed) return undefined;

  const candidates: string[] = [trimmed];
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence?.[1]) candidates.push(fence[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }
  return undefined;
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

  // xAI sometimes returns top-level citations as URL strings.
  const topCitations = Array.isArray(data.citations) ? data.citations : [];
  for (const c of topCitations) {
    if (typeof c === "string") pushSource(c);
    else if (c && typeof c === "object") {
      const src = c as Record<string, unknown>;
      pushSource(src.url ?? src.uri, src.title);
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
  options: LLMRequestOptions
): Promise<LLMResponse> {
  const model = options.model ?? DEFAULT_MODEL;
  const { instructions, input } = splitSystemForResponses(messages);

  const requestBody: Record<string, unknown> = {
    model,
    input,
    tools: [{ type: "web_search" }],
    max_output_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
  };
  if (instructions) requestBody.instructions = instructions;

  const response = await fetch(XAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      (error as { error?: { message?: string } })?.error?.message ??
      `xAI API error: ${response.status}`;
    const retryable = response.status >= 500 || response.status === 429;
    throw createError(`HTTP_${response.status}`, message, retryable);
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (data.error && typeof data.error === "object") {
    const err = data.error as { message?: string };
    throw createError("RESPONSES_ERROR", err.message ?? "xAI Responses error", true);
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
      provider: "xai",
      finishReason: typeof data.status === "string" ? data.status : undefined,
    },
    ...(sources.length || queries.length
      ? { webSearch: { ...(queries.length ? { queries } : {}), ...(sources.length ? { sources } : {}) } }
      : {}),
  };
}

export async function run(
  prompt: string | LLMMessage[],
  options: LLMRequestOptions = {}
): Promise<LLMResponse> {
  const apiKey = getApiKey();
  const messages = normalizeMessages(prompt);

  const useWebSearch = Boolean(
    options.enableWebSearch && !options.schema && !options.preferJsonObject
  );
  if (useWebSearch) {
    return runWithWebSearch(apiKey, messages, options);
  }

  const model = options.model ?? DEFAULT_MODEL;

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
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

  const response = await fetch(XAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error?.error?.message ?? `xAI API error: ${response.status}`;
    const retryable = response.status >= 500 || response.status === 429;
    throw createError(`HTTP_${response.status}`, message, retryable);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = normalizeAssistantMessageContent(choice?.message);

  let parsed: unknown;
  if (options.schema || options.preferJsonObject) {
    parsed = tryParseStructuredContent(content);
    if (parsed === undefined && content.trim()) {
      console.warn("[xAI] Structured response was not valid JSON", {
        model,
        finishReason: choice?.finish_reason,
        contentLen: content.length,
        contentPreview: content.slice(0, 240),
      });
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
      provider: "xai",
      finishReason: choice?.finish_reason,
    },
  };
}

export const xai: LLMClient = { run };
