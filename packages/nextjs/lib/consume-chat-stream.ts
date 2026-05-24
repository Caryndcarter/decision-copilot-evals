/**
 * Client helper: read SSE chat streams from our API routes.
 */

export type ChatStreamDonePayload = Record<string, unknown>;

export async function consumeChatStream(
  res: Response,
  handlers: {
    onDelta: (text: string) => void;
    onDone: (payload: ChatStreamDonePayload) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("text/event-stream")) {
    let data: ChatStreamDonePayload = {};
    try {
      data = (await res.json()) as ChatStreamDonePayload;
    } catch {
      handlers.onError(res.ok ? "Invalid response" : `Request failed (${res.status})`);
      return;
    }
    if (!res.ok) {
      handlers.onError(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
      return;
    }
    handlers.onDone(data);
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError(`Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushEvent = (line: string) => {
    if (!line.startsWith("data: ")) return;
    const jsonStr = line.slice(6).trim();
    if (!jsonStr) return;
    let event: { type?: string; text?: string; error?: string };
    try {
      event = JSON.parse(jsonStr) as { type?: string; text?: string; error?: string };
    } catch {
      return;
    }
    if (event.type === "delta" && typeof event.text === "string" && event.text.length > 0) {
      handlers.onDelta(event.text);
    } else if (event.type === "done") {
      handlers.onDone(event as ChatStreamDonePayload);
    } else if (event.type === "error") {
      handlers.onError(typeof event.error === "string" ? event.error : "Stream failed");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      flushEvent(line.trimEnd());
    }
  }
  if (buffer.trim()) flushEvent(buffer.trimEnd());
}

/** Append streamed text to the last assistant message, or add a new one. */
export function appendAssistantStreamDelta<T extends { role: string; content: string }>(
  prev: T[],
  delta: string
): T[] {
  const last = prev[prev.length - 1];
  if (last?.role === "assistant") {
    return [...prev.slice(0, -1), { ...last, content: last.content + delta } as T];
  }
  return [...prev, { role: "assistant", content: delta } as T];
}

/** Ensure an empty assistant bubble exists before the first delta. */
export function ensureAssistantStreamPlaceholder<T extends { role: string; content: string }>(
  prev: T[]
): T[] {
  const last = prev[prev.length - 1];
  if (last?.role === "assistant") return prev;
  return [...prev, { role: "assistant", content: "" } as T];
}
