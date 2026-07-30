/**
 * Google Gemini LLM Provider
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

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_TOKENS = 4096;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw createError("MISSING_API_KEY", "GEMINI_API_KEY environment variable is not set");
  }
  return key;
}

function createError(code: string, message: string, retryable = false): LLMError {
  return { code, message, provider: "gemini", retryable };
}

/**
 * Gemini 2.5 thinking tokens count against maxOutputTokens. Cap them for structured
 * calls so the visible JSON is not emptied with finishReason MAX_TOKENS.
 * `undefined` = leave the model default (dynamic thinking).
 */
function geminiThinkingBudget(options: LLMRequestOptions): number | undefined {
  const effort =
    options.effort ??
    (options.schema || options.preferJsonObject ? "low" : undefined);
  if (!effort) return undefined;
  switch (effort) {
    case "low":
      return 1024;
    case "medium":
      return 4096;
    case "high":
    case "xhigh":
    case "max":
      return 8192;
    default:
      return 1024;
  }
}

/**
 * Gemini's responseSchema is a subset of JSON Schema.
 * Strip unsupported fields recursively before sending.
 */
function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    // Drop fields Gemini doesn't understand
    if (key === "additionalProperties" || key === "const") continue;

    if (key === "type" && Array.isArray(value)) {
      // e.g. ["array", "null"] → pick first non-null type
      const primary = (value as string[]).find((t) => t !== "null") ?? "string";
      result[key] = primary;
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeSchema(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? sanitizeSchema(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function normalizeMessages(prompt: string | LLMMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
} {
  const messages = typeof prompt === "string" ? [{ role: "user" as const, content: prompt }] : prompt;

  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  return {
    systemInstruction: systemMessage
      ? { parts: [{ text: systemMessage.content }] }
      : undefined,
    // Gemini uses "model" instead of "assistant"
    contents: chatMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  };
}

export async function run(
  prompt: string | LLMMessage[],
  options: LLMRequestOptions = {}
): Promise<LLMResponse> {
  const apiKey = getApiKey();
  const model = options.model ?? DEFAULT_MODEL;
  const { systemInstruction, contents } = normalizeMessages(prompt);

  // Gemini is more verbose than other providers; use a higher floor for structured output
  // to avoid MAX_TOKENS truncation mid-JSON. Same for preferJsonObject (e.g. freeform).
  // Note: on 2.5 thinking models, maxOutputTokens covers thinking + visible text.
  const maxOutputTokens =
    options.schema || options.preferJsonObject
      ? Math.max(options.maxTokens ?? DEFAULT_MAX_TOKENS, 8192)
      : (options.maxTokens ?? DEFAULT_MAX_TOKENS);

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens,
    temperature: options.temperature ?? 0.7,
  };

  // Cap thinking so structured JSON is not emptied by MAX_TOKENS (thinking burns the same budget).
  const thinkingBudget = geminiThinkingBudget(options);
  if (thinkingBudget !== undefined) {
    generationConfig.thinkingConfig = { thinkingBudget };
  }

  // Request structured JSON output. responseMimeType alone only ensures JSON is returned;
  // responseSchema additionally enforces the field names and types.
  if (options.schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = sanitizeSchema(options.schema as Record<string, unknown>);
  } else if (options.preferJsonObject) {
    generationConfig.responseMimeType = "application/json";
  }

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig,
  };

  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  // Grounding with Google Search (billable). Do not combine with JSON MIME/schema —
  // Gemini rejects or empties responses when tools + responseMimeType are both set.
  if (options.enableWebSearch && !options.schema && !options.preferJsonObject) {
    requestBody.tools = [{ google_search: {} }];
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const rawBody = await response.text();

  if (!response.ok) {
    let message = `Gemini API error: ${response.status}`;
    if (rawBody?.trim()) {
      try {
        const error = JSON.parse(rawBody) as { error?: { message?: string } };
        message = error?.error?.message ?? message;
      } catch {
        message = rawBody.slice(0, 200);
      }
    }
    const retryable = response.status >= 500 || response.status === 429;
    throw createError(`HTTP_${response.status}`, message, retryable);
  }

  if (!rawBody?.trim()) {
    throw createError("EMPTY_RESPONSE", "Gemini returned an empty response", true);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw createError("INVALID_JSON", `Gemini response was not valid JSON: ${rawBody.slice(0, 100)}`, true);
  }

  type GeminiPart = { text?: string; thought?: boolean };
  type GeminiCandidate = {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
    groundingMetadata?: {
      webSearchQueries?: string[];
      web_search_queries?: string[];
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      grounding_chunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
    grounding_metadata?: GeminiCandidate["groundingMetadata"];
  };

  const candidates = data.candidates as GeminiCandidate[] | undefined;
  const candidate = candidates?.[0];
  // Skip thought/summary parts — concatenating them into structured JSON breaks parse.
  const content =
    candidate?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("") ?? "";

  const gm = candidate?.groundingMetadata ?? candidate?.grounding_metadata;
  const webQueries = gm?.webSearchQueries ?? gm?.web_search_queries;
  const rawChunks = gm?.groundingChunks ?? gm?.grounding_chunks;
  const webSources: WebSearchSource[] = [];
  for (const ch of rawChunks ?? []) {
    const uri = ch.web?.uri;
    if (uri) webSources.push({ uri, title: ch.web?.title });
  }

  let parsed: unknown;
  if (options.schema || options.preferJsonObject) {
    let jsonStr = content.trim();
    // Strip markdown code fences (may appear anywhere; not always whole-response wrap)
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }
    let obj = safeJsonParse(jsonStr);
    if (!obj && jsonStr.includes("{")) {
      const balanced = extractFirstBalancedJsonObject(jsonStr);
      if (balanced) obj = safeJsonParse(balanced);
    }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      parsed = obj;
    }
  }

  const usageMeta = data.usageMetadata as
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
        thoughtsTokenCount?: number;
      }
    | undefined;

  if ((options.schema || options.preferJsonObject) && !parsed) {
    console.warn("[gemini] Structured response missing/unparseable", {
      model,
      finishReason: candidate?.finishReason,
      contentLen: content.length,
      contentPreview: content.slice(0, 300),
      thoughtsTokenCount: usageMeta?.thoughtsTokenCount,
      candidatesTokenCount: usageMeta?.candidatesTokenCount,
      thinkingBudget,
      maxOutputTokens,
    });
  }

  return {
    content,
    parsed,
    usage: usageMeta
      ? {
          promptTokens: usageMeta.promptTokenCount ?? 0,
          completionTokens: usageMeta.candidatesTokenCount ?? 0,
          totalTokens: usageMeta.totalTokenCount ?? 0,
        }
      : undefined,
    meta: {
      model,
      provider: "gemini",
      finishReason: candidate?.finishReason,
    },
    ...(webSources.length || webQueries?.length
      ? { webSearch: { queries: webQueries, sources: webSources } }
      : {}),
  };
}

// Export a client object matching the LLMClient interface
export const gemini: LLMClient = { run };
