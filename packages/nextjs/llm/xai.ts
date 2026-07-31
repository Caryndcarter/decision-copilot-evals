/**
 * xAI LLM Provider (OpenAI-compatible Chat Completions API)
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
} from "./types";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
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

export async function run(
  prompt: string | LLMMessage[],
  options: LLMRequestOptions = {}
): Promise<LLMResponse> {
  const apiKey = getApiKey();
  const messages = normalizeMessages(prompt);
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

  const response = await fetch(XAI_API_URL, {
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
