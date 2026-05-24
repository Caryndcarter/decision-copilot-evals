/**
 * Streaming text generation for chat (server-only).
 *
 * Structured output (`schema`) and Anthropic/OpenAI web-search loops fall back to
 * buffered `run()` then emit the full text as one delta before returning.
 */

import "server-only";
import type { LLMMessage, LLMRequestOptions, LLMResponse, LLMProvider } from "./types";
import { openai } from "./openai";
import { anthropic } from "./anthropic";
import { gemini } from "./gemini";
import { xai } from "./xai";

export type StreamDeltaHandler = (text: string) => void;

async function readSseLines(
  body: ReadableStream<Uint8Array>,
  onDataLine: (payload: string) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data: ")) {
        onDataLine(trimmed.slice(6).trim());
      }
    }
  }
  const tail = buffer.trim();
  if (tail.startsWith("data: ")) {
    onDataLine(tail.slice(6).trim());
  }
}

function mustStreamBody(response: Response, label: string): ReadableStream<Uint8Array> {
  if (!response.ok) {
    throw new Error(`${label} stream HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error(`${label} returned no response body`);
  }
  return response.body;
}

/** OpenAI Chat Completions SSE (also used by xAI). */
async function streamOpenAiCompat(
  url: string,
  apiKey: string,
  requestBody: Record<string, unknown>,
  onDelta: StreamDeltaHandler,
  provider: LLMProvider
): Promise<LLMResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...requestBody, stream: true }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      (error as { error?: { message?: string } })?.error?.message ??
      `${provider} API error: ${response.status}`;
    throw new Error(message);
  }

  let content = "";
  let finishReason: string | undefined;
  let model = String(requestBody.model ?? "");

  await readSseLines(mustStreamBody(response, provider), (payload) => {
    if (payload === "[DONE]") return;
    let chunk: {
      model?: string;
      choices?: Array<{
        delta?: { content?: string };
        finish_reason?: string | null;
      }>;
    };
    try {
      chunk = JSON.parse(payload) as typeof chunk;
    } catch {
      return;
    }
    if (chunk.model) model = chunk.model;
    const choice = chunk.choices?.[0];
    if (choice?.finish_reason) finishReason = choice.finish_reason ?? undefined;
    const piece = choice?.delta?.content;
    if (typeof piece === "string" && piece.length > 0) {
      content += piece;
      onDelta(piece);
    }
  });

  return {
    content,
    meta: { model, provider, finishReason },
  };
}

/** Anthropic Messages API SSE. */
async function streamAnthropicMessages(
  apiKey: string,
  requestBody: Record<string, unknown>,
  onDelta: StreamDeltaHandler
): Promise<LLMResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ ...requestBody, stream: true }),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let message = `Anthropic API error: ${response.status}`;
    try {
      const err = JSON.parse(raw) as { error?: { message?: string } };
      message = err?.error?.message ?? message;
    } catch {
      if (raw) message = raw.slice(0, 200);
    }
    throw new Error(message);
  }

  let content = "";
  let model = String(requestBody.model ?? "");
  let stopReason: string | undefined;

  await readSseLines(mustStreamBody(response, "anthropic"), (payload) => {
    let event: {
      type?: string;
      message?: { model?: string };
      delta?: { type?: string; text?: string };
    };
    try {
      event = JSON.parse(payload) as typeof event;
    } catch {
      return;
    }
    if (event.type === "message_start" && event.message?.model) {
      model = event.message.model;
    }
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      const piece = event.delta.text ?? "";
      if (piece) {
        content += piece;
        onDelta(piece);
      }
    }
    if (event.type === "message_delta") {
      const d = event as { delta?: { stop_reason?: string } };
      if (d.delta?.stop_reason) stopReason = d.delta.stop_reason;
    }
  });

  return {
    content,
    meta: { model, provider: "anthropic", finishReason: stopReason },
  };
}

/** Gemini `streamGenerateContent` with `alt=sse`. */
async function streamGemini(
  apiKey: string,
  model: string,
  requestBody: Record<string, unknown>,
  onDelta: StreamDeltaHandler
): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(raw.slice(0, 200) || `Gemini API error: ${response.status}`);
  }

  let content = "";
  let finishReason: string | undefined;

  await readSseLines(mustStreamBody(response, "gemini"), (payload) => {
    let chunk: {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };
    try {
      chunk = JSON.parse(payload) as typeof chunk;
    } catch {
      return;
    }
    const candidate = chunk.candidates?.[0];
    if (candidate?.finishReason) finishReason = candidate.finishReason;
    const parts = candidate?.content?.parts ?? [];
    for (const p of parts) {
      const piece = p.text ?? "";
      if (piece) {
        content += piece;
        onDelta(piece);
      }
    }
  });

  return {
    content,
    meta: { model, provider: "gemini", finishReason },
  };
}

function bufferedAsStream(response: LLMResponse, onDelta: StreamDeltaHandler): LLMResponse {
  if (response.content) onDelta(response.content);
  return response;
}

export async function runStream(
  provider: LLMProvider,
  prompt: string | LLMMessage[],
  options: LLMRequestOptions,
  onDelta: StreamDeltaHandler
): Promise<LLMResponse> {
  if (options.schema) {
    const client =
      provider === "openai"
        ? openai
        : provider === "anthropic"
          ? anthropic
          : provider === "gemini"
            ? gemini
            : xai;
    return bufferedAsStream(await client.run(prompt, options), onDelta);
  }

  if (provider === "openai") {
    if (options.enableWebSearch) {
      return bufferedAsStream(await openai.run(prompt, options), onDelta);
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY environment variable is not set");
    const messages =
      typeof prompt === "string" ? [{ role: "user" as const, content: prompt }] : prompt;
    const model = (options.model ?? process.env.OPENAI_MODEL?.trim()) || "gpt-5.5";
    const mLower = model.toLowerCase();
    const usesMax = mLower.startsWith("gpt-5") || /^o\d/i.test(mLower);
    const body: Record<string, unknown> = {
      model,
      messages,
      ...(usesMax
        ? { max_completion_tokens: options.maxTokens ?? 4096 }
        : { max_tokens: options.maxTokens ?? 4096 }),
    };
    if (!(mLower.startsWith("gpt-5") || /^o\d/i.test(mLower)) || mLower.includes("gpt-5-chat")) {
      body.temperature = options.temperature ?? 0.7;
    } else if (usesMax && !mLower.includes("gpt-5-pro")) {
      body.reasoning_effort = "low";
    }
    return streamOpenAiCompat(
      "https://api.openai.com/v1/chat/completions",
      key,
      body,
      onDelta,
      "openai"
    );
  }

  if (provider === "xai") {
    const key = process.env.XAI_API_KEY;
    if (!key) throw new Error("XAI_API_KEY environment variable is not set");
    const messages =
      typeof prompt === "string" ? [{ role: "user" as const, content: prompt }] : prompt;
    return streamOpenAiCompat(
      "https://api.x.ai/v1/chat/completions",
      key,
      {
        model: (options.model ?? process.env.XAI_MODEL?.trim()) || "grok-4.3",
        messages,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        ...(options.preferJsonObject ? { response_format: { type: "json_object" } } : {}),
      },
      onDelta,
      "xai"
    );
  }

  if (provider === "anthropic") {
    if (options.enableWebSearch) {
      return bufferedAsStream(await anthropic.run(prompt, options), onDelta);
    }
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    const systemMsg =
      typeof prompt === "string"
        ? undefined
        : prompt.find((m) => m.role === "system")?.content;
    const other =
      typeof prompt === "string"
        ? [{ role: "user", content: prompt }]
        : prompt
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content }));
    const body: Record<string, unknown> = {
      model: options.model ?? "claude-sonnet-4-6",
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      messages: other,
    };
    if (systemMsg) body.system = systemMsg;
    return streamAnthropicMessages(key, body, onDelta);
  }

  if (provider === "gemini") {
    if (options.enableWebSearch) {
      return bufferedAsStream(await gemini.run(prompt, options), onDelta);
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is not set");
    const model = options.model ?? "gemini-2.5-flash";
    const messages =
      typeof prompt === "string" ? [{ role: "user" as const, content: prompt }] : prompt;
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");
    const requestBody: Record<string, unknown> = {
      contents: chatMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        ...(options.preferJsonObject ? { responseMimeType: "application/json" } : {}),
      },
    };
    if (systemMessage) {
      requestBody.systemInstruction = { parts: [{ text: systemMessage.content }] };
    }
    return streamGemini(key, model, requestBody, onDelta);
  }

  throw new Error(`Unknown provider: ${provider}`);
}
