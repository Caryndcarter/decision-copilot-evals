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
  const maxOutputTokens =
    options.schema || options.preferJsonObject
      ? Math.max(options.maxTokens ?? DEFAULT_MAX_TOKENS, 8192)
      : (options.maxTokens ?? DEFAULT_MAX_TOKENS);

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens,
    temperature: options.temperature ?? 0.7,
  };

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

  // Grounding with Google Search (billable). Not combined with JSON schema in this app.
  if (options.enableWebSearch && !options.schema) {
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

  type GeminiCandidate = {
    content?: { parts?: { text?: string }[] };
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
  const content = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

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
    | { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
    | undefined;

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
