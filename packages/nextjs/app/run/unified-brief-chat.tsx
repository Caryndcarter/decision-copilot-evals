"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DecisionBrief, DecisionRunResult, LLMProviderName } from "@/types/decision";
import { runProviderLabel } from "@/lib/run-display-name";
import { ChatMessageCopyActions } from "@/app/components/chat-copy-button";
import { ResearchMarkdown } from "./research-markdown";
import {
  appendAssistantStreamDelta,
  consumeChatStream,
  ensureAssistantStreamPlaceholder,
} from "@/lib/consume-chat-stream";

export type UnifiedBriefChatMessage = { role: "user" | "assistant"; content: string };

export type UnifiedBriefChatPersistPatch = Pick<
  DecisionRunResult,
  "unified_brief_chat_by_provider" | "unified_brief_chat_messages"
>;

const CHAT_PROVIDERS: LLMProviderName[] = ["anthropic", "openai", "gemini", "xai"];

function messagesForProvider(
  provider: LLMProviderName,
  by: DecisionRunResult["unified_brief_chat_by_provider"] | undefined,
  legacy: DecisionRunResult["unified_brief_chat_messages"] | undefined
): UnifiedBriefChatMessage[] {
  const fromBy = by?.[provider];
  if (fromBy && fromBy.length > 0) return fromBy;
  if (provider === "anthropic" && legacy?.length) return legacy;
  return [];
}

function thinkingLabel(p: LLMProviderName): string {
  if (p === "anthropic") return "Claude is thinking…";
  if (p === "openai") return "ChatGPT is thinking…";
  if (p === "xai") return "Grok is thinking…";
  return "Gemini is thinking…";
}

export interface UnifiedBriefChatProps {
  runId: string;
  unifiedBrief: DecisionBrief | null | undefined;
  unifiedBriefChatByProvider?: DecisionRunResult["unified_brief_chat_by_provider"];
  /** Pre–per-provider threads: treated as the Anthropic thread when `by_provider.anthropic` is absent. */
  unifiedBriefChatMessagesLegacy?: DecisionRunResult["unified_brief_chat_messages"];
  onMessagesUpdated: (patch: UnifiedBriefChatPersistPatch) => void;
  /** When false, omit the indigo title strip (e.g. parent aside supplies a “Discuss” header). Default true. */
  showChromeHeader?: boolean;
  /** Merged onto the root wrapper (e.g. `rounded-none border-0 shadow-none mt-0` in a sidebar card). */
  className?: string;
  /** Message list max height; defaults work for standalone page and wider sidebar. */
  messagesMaxHeightClassName?: string;
}

export function UnifiedBriefChat({
  runId,
  unifiedBrief,
  unifiedBriefChatByProvider,
  unifiedBriefChatMessagesLegacy,
  onMessagesUpdated,
  showChromeHeader = true,
  className = "",
  messagesMaxHeightClassName = "max-h-[min(420px,50vh)] lg:max-h-[min(480px,calc(100vh-16rem))]",
}: UnifiedBriefChatProps) {
  const [chatProvider, setChatProvider] = useState<LLMProviderName>("anthropic");
  const [messages, setMessages] = useState<UnifiedBriefChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const threadsFingerprint = JSON.stringify({
    runId,
    by: unifiedBriefChatByProvider,
    leg: unifiedBriefChatMessagesLegacy,
    p: chatProvider,
  });

  useEffect(() => {
    setMessages(messagesForProvider(chatProvider, unifiedBriefChatByProvider, unifiedBriefChatMessagesLegacy));
    // threadsFingerprint captures runId, provider, and thread payloads from the parent run.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally single serialized gate
  }, [threadsFingerprint]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !unifiedBrief) return;
    const prior = messagesRef.current;
    setInput("");
    setError(null);
    const userMessage: UnifiedBriefChatMessage = { role: "user", content: text };
    const withUser = [...prior, userMessage];
    setMessages(ensureAssistantStreamPlaceholder(withUser));
    setLoading(true);
    try {
      const res = await fetch("/api/decision/run/unified-brief-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          run_id: runId,
          llm_provider: chatProvider,
          messages: prior,
          newMessage: text,
        }),
      });

      let streamFailed = false;
      await consumeChatStream(res, {
        onDelta: (delta) => {
          setMessages((prev) => appendAssistantStreamDelta(prev, delta));
        },
        onDone: (data) => {
          const by = data.unified_brief_chat_by_provider as
            | DecisionRunResult["unified_brief_chat_by_provider"]
            | undefined;
          const legacy = data.unified_brief_chat_messages as
            | DecisionRunResult["unified_brief_chat_messages"]
            | undefined;
          if (by && typeof by === "object") {
            const thread = messagesForProvider(chatProvider, by, legacy);
            setMessages(thread);
            onMessagesUpdated({
              unified_brief_chat_by_provider: by,
              ...(typeof legacy !== "undefined" ? { unified_brief_chat_messages: legacy } : {}),
            });
          } else {
            const content = typeof data.content === "string" ? data.content : "";
            const assistant: UnifiedBriefChatMessage = { role: "assistant", content };
            const merged = [...withUser, assistant];
            setMessages(merged);
            onMessagesUpdated({
              unified_brief_chat_by_provider: {
                ...(unifiedBriefChatByProvider ?? {}),
                [chatProvider]: merged,
              },
              ...(chatProvider === "anthropic" ? { unified_brief_chat_messages: merged } : {}),
            });
          }
        },
        onError: (message) => {
          streamFailed = true;
          setError(message);
          setMessages(prior);
        },
      });
      if (streamFailed) return;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages(prior);
    } finally {
      setLoading(false);
    }
  }, [chatProvider, input, loading, onMessagesUpdated, runId, unifiedBrief, unifiedBriefChatByProvider]);

  const disabled = !unifiedBrief;

  return (
    <div
      className={`rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden ${showChromeHeader ? "mt-10" : "mt-0"} ${className}`.trim()}
    >
      {showChromeHeader ? (
        <div className="border-b border-indigo-100 bg-indigo-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-indigo-950">Chat about this brief</h2>
          <p className="mt-1 text-xs leading-snug text-indigo-950/85">
            Pick a model below. Each one sees your Unified Brief and the same merged inputs. The Unified Brief itself is
            always written by Anthropic; other models discuss that artifact.{" "}
            {disabled ? "Generate the Unified Brief on this page first to enable chat." : "History is saved per model."}
          </p>
        </div>
      ) : null}

      <div className="border-b border-indigo-100/80 bg-indigo-50/50 px-4 py-2.5 print:hidden">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-indigo-900/60">Discuss with</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chat model provider">
          {CHAT_PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled || loading}
              onClick={() => setChatProvider(p)}
              aria-pressed={chatProvider === p}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                chatProvider === p
                  ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-indigo-200 hover:bg-indigo-50/80"
              } disabled:opacity-50`}
            >
              {runProviderLabel(p)}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        className={`${messagesMaxHeightClassName} min-h-[180px] overflow-y-auto p-4 space-y-4`}
        aria-label="Unified Brief chat messages"
      >
        {messages.length === 0 && !loading && !disabled && (
          <p className="text-sm text-zinc-500">
            Ask for a shorter summary, challenge an assumption, or explore tradeoffs and next steps—with{" "}
            {runProviderLabel(chatProvider)}.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-800"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="min-w-0">
                  <ChatMessageCopyActions text={m.content} className="mb-1" />
                  <ResearchMarkdown source={m.content} />
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role !== "assistant" ||
            !messages[messages.length - 1]?.content) && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent align-middle"
                aria-hidden
              />
              <span className="ml-2 align-middle">{thinkingLabel(chatProvider)}</span>
            </div>
          </div>
        )}
      </div>

      <form
        className="border-t border-zinc-200 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? "Generate a Unified Brief first…" : `Ask ${runProviderLabel(chatProvider)} about this Unified Brief…`}
          disabled={loading || disabled}
          rows={3}
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          aria-label="Message for Unified Brief chat"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={loading || disabled || !input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
