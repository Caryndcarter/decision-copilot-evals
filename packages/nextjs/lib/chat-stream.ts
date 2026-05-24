import "server-only";
import { NextResponse } from "next/server";

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" } & Record<string, unknown>
  | { type: "error"; error: string };

function sseEncode(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** SSE response for chat endpoints. Handler must emit exactly one `done` or `error` event. */
export function createChatSseResponse(
  handler: (emit: (event: ChatStreamEvent) => void) => Promise<void>
): NextResponse {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ChatStreamEvent) => {
        controller.enqueue(sseEncode(event));
      };
      try {
        await handler(emit);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream failed";
        emit({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
