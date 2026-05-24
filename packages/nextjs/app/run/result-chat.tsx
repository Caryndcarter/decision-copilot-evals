"use client";

import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { LensQuestion, DecisionBrief, ProviderSynthesis, ResearchCompletion } from "@/types/decision";
import type { ClarificationAnswersMap } from "./clarification-form";
import { ChatMessageCopyActions } from "@/app/components/chat-copy-button";
import { ResearchMarkdown } from "./research-markdown";
import {
  appendAssistantStreamDelta,
  consumeChatStream,
  ensureAssistantStreamPlaceholder,
} from "@/lib/consume-chat-stream";
import { parseFormatSuggestion, variantSuggestionChipLine } from "@/lib/suggest-format-tag";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Set for research-starter turns; full text is in Research output on the left */
  research_completion_id?: string;
}

/** Cap for "Create variant from this suggestion" using the whole assistant message (not the tagged phrase). */
const MAX_FORMAT_INSTRUCTION_LENGTH = 8000;

function asFormatInstruction(content: string): string {
  const t = content.trim();
  if (t.length <= MAX_FORMAT_INSTRUCTION_LENGTH) return t;
  return t.slice(0, MAX_FORMAT_INSTRUCTION_LENGTH).trim();
}

const CHAT_STORAGE_PREFIX = "decisionRunChat_";

function getStoredChat(runId: string): ChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_PREFIX + runId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setStoredChat(runId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CHAT_STORAGE_PREFIX + runId, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

/** Tag for the next send when user picked a research starter (controlled by parent). */
export interface ResearchStarterTag {
  label: string;
  groupTitle: string;
}

export interface ResultChatHandle {
  prefillInput: (text: string) => void;
}

export interface ResultChatProps {
  runId: string;
  className?: string;
  /** Initial messages when run was loaded by run_id (from API); sessionStorage overrides when present */
  initialMessages?: ChatMessage[];
  /** Current clarification Q&A so the AI can answer about the questions and the user's (possibly edited) answers */
  clarificationContext?: { questions: LensQuestion[]; answers: ClarificationAnswersMap };
  /** Cross-provider synthesis to include in chat context */
  synthesis?: ProviderSynthesis | null;
  /** When user picked a demo starter; cleared after successful send or by parent */
  researchStarterTag?: ResearchStarterTag | null;
  onClearResearchStarterTag?: () => void;
  /** When user picked a variant starter (UI tag only; send is normal chat, not research) */
  variantStarterTag?: ResearchStarterTag | null;
  onClearVariantStarterTag?: () => void;
  /** For disabling research starter buttons while a message is in flight */
  onLoadingChange?: (loading: boolean) => void;
  /** Called after a research starter exchange is saved on the run */
  onResearchCompletionsUpdated?: (completions: ResearchCompletion[]) => void;
  /** Scroll to Research output and focus the completion (research-starter chat replies) */
  onNavigateToResearch?: (researchCompletionId: string) => void;
  onAcceptFormatSuggestion?: (formatInstruction: string) => void;
  creatingVariant?: boolean;
  variantId?: string;
  decisionBrief?: DecisionBrief;
  getBriefForChat?: () => DecisionBrief | null | undefined;
  /** Omit the inner "Chat" title strip (parent already provides section chrome). */
  hideHeader?: boolean;
}

export const ResultChat = forwardRef<ResultChatHandle, ResultChatProps>(function ResultChat(
  {
    runId,
    className = "",
    initialMessages,
    clarificationContext,
    synthesis,
    researchStarterTag = null,
    onClearResearchStarterTag,
    variantStarterTag = null,
    onClearVariantStarterTag,
    onLoadingChange,
    onResearchCompletionsUpdated,
    onNavigateToResearch,
    onAcceptFormatSuggestion,
    creatingVariant = false,
    variantId,
    decisionBrief,
    getBriefForChat,
    hideHeader = false,
  },
  ref
) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = getStoredChat(runId);
    if (stored?.length) return stored;
    if (initialMessages?.length) return initialMessages;
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(() => new Set());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    prefillInput: (text: string) => {
      setInput(text);
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    setAcceptedSuggestions(new Set());
    const stored = getStoredChat(runId);
    if (stored?.length) {
      setMessages(stored);
      return;
    }
    if (initialMessages?.length) setMessages(initialMessages);
    else setMessages([]);
  }, [runId, initialMessages]);

  useEffect(() => {
    setStoredChat(runId, messages);
  }, [runId, messages]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function researchLabelFromInput(text: string): string {
    const line = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? text;
    const t = line.trim();
    return t.length <= 100 ? t : `${t.slice(0, 97)}…`;
  }

  async function handleSend(explicitResearch: boolean) {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const tag = researchStarterTag;
    /** Demo starter always wins. Otherwise explicit Research button forces the research pipeline. */
    const researchStarter = tag
      ? { label: tag.label, group_title: tag.groupTitle }
      : explicitResearch
        ? { label: researchLabelFromInput(text), group_title: "Chat — research" }
        : undefined;

    try {
      const body: {
        run_id: string;
        messages: ChatMessage[];
        newMessage: string;
        clarification_questions?: LensQuestion[];
        clarification_answers?: ClarificationAnswersMap;
        variant_id?: string;
        decision_brief_override?: DecisionBrief;
        synthesis?: ProviderSynthesis;
        research_starter?: { label: string; group_title?: string };
      } = {
        run_id: runId,
        messages: messages,
        newMessage: text,
      };
      if (clarificationContext?.questions?.length && clarificationContext.answers && Object.keys(clarificationContext.answers).length > 0) {
        body.clarification_questions = clarificationContext.questions;
        body.clarification_answers = clarificationContext.answers;
      }
      if (variantId) body.variant_id = variantId;
      const briefToSend = getBriefForChat?.() ?? decisionBrief;
      if (briefToSend) body.decision_brief_override = briefToSend;
      if (synthesis) body.synthesis = synthesis;
      if (researchStarter) body.research_starter = researchStarter;
      setMessages((prev) => ensureAssistantStreamPlaceholder([...prev]));

      const res = await fetch("/api/decision/run/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
      });

      let streamFailed = false;
      await consumeChatStream(res, {
        onDelta: (text) => {
          setMessages((prev) => appendAssistantStreamDelta(prev, text));
        },
        onDone: (data) => {
          if (tag) {
            onClearResearchStarterTag?.();
          }
          if (variantStarterTag) {
            onClearVariantStarterTag?.();
          }
          if (Array.isArray(data.research_completions)) {
            onResearchCompletionsUpdated?.(data.research_completions as ResearchCompletion[]);
          }
          const content = typeof data.content === "string" ? data.content : "";
          const assistantMsg: ChatMessage = { role: "assistant", content };
          if (typeof data.research_completion_id === "string" && data.research_completion_id.trim()) {
            assistantMsg.research_completion_id = data.research_completion_id.trim();
          }
          setMessages((prev) => {
            const withoutTail = prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev;
            return [...withoutTail, assistantMsg];
          });
        },
        onError: (message) => {
          streamFailed = true;
          setError(message);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.content.trim()) {
              return prev.slice(0, -2);
            }
            return prev.slice(0, -1);
          });
        },
      });
      if (streamFailed) return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void handleSend(false);
  }

  return (
    <div className={`rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {!hideHeader ? (
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-zinc-800">Chat</h2>
          <p className="mt-1 text-xs leading-snug text-zinc-500">
            <span className="font-medium text-zinc-700">Send</span> — Q&amp;A on this run.{" "}
            <span className="font-medium text-zinc-700">Research</span> — longer investigative reply (suggested
            lookups, structured sections); full text is saved under Research output. Research turns may use your
            provider&apos;s live web search when available.
          </p>
        </div>
      ) : null}

      <div
        id="run-chat-messages"
        ref={messagesContainerRef}
        className="max-h-[420px] min-h-[200px] overflow-y-auto p-4"
      >
        {messages.length === 0 && !loading && (
          <p className="text-sm text-zinc-400">No messages yet.</p>
        )}
        <div className="space-y-4">
          {messages.map((m, i) => {
            const parsed =
              m.role === "assistant"
                ? parseFormatSuggestion(m.content)
                : { suggestion: null as string | null, textContent: m.content };
            const { suggestion, textContent: parsedBody } = parsed;
            const textContent =
              m.role === "assistant" && suggestion && !parsedBody.trim()
                ? `Here’s the suggested addition for your brief (no separate summary was included before the format tag):\n\n${suggestion}`
                : parsedBody;
            const variantChipLine =
              m.role === "assistant" && suggestion
                ? variantSuggestionChipLine(textContent, suggestion)
                : "";
            return (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[85%] space-y-2">
                  {textContent ? (
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        m.role === "user" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="min-w-0">
                          <ChatMessageCopyActions text={textContent} className="mb-1" />
                          <div className="text-zinc-800">
                            <ResearchMarkdown source={textContent} />
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{textContent}</p>
                      )}
                    </div>
                  ) : null}
                  {m.role === "assistant" && suggestion && onAcceptFormatSuggestion ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-600" aria-hidden>
                          💡
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-amber-800">Suggested format change</p>
                          <p
                            className="mt-1 text-sm leading-relaxed text-amber-900"
                            title={suggestion}
                          >
                            {variantChipLine}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {!acceptedSuggestions.has(suggestion) ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAcceptedSuggestions((prev) => new Set(prev).add(suggestion));
                                    onAcceptFormatSuggestion(suggestion);
                                  }}
                                  disabled={creatingVariant}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                                >
                                  {creatingVariant ? "Creating…" : "Create this version"}
                                </button>
                                <button
                                  type="button"
                                  disabled={creatingVariant}
                                  onClick={() => setAcceptedSuggestions((prev) => new Set(prev).add(suggestion))}
                                  className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                                >
                                  No thanks
                                </button>
                              </>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-900">
                                {creatingVariant
                                  ? "Creating variant… (can take up to a minute)"
                                  : "Version created — use the switcher above to view it"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {m.role === "assistant" &&
                  !suggestion &&
                  onAcceptFormatSuggestion &&
                  textContent.trim().length >= 20
                    ? (() => {
                        const instructionKey = asFormatInstruction(m.content);
                        const accepted = acceptedSuggestions.has(instructionKey);
                        return (
                          <div className="mt-1.5 flex items-center gap-2">
                            {!accepted ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setAcceptedSuggestions((prev) => new Set(prev).add(instructionKey));
                                  onAcceptFormatSuggestion(instructionKey);
                                }}
                                disabled={creatingVariant}
                                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                              >
                                {creatingVariant ? "Creating…" : "Create variant from this suggestion"}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                                {creatingVariant
                                  ? "Creating… (can take up to a minute)"
                                  : "Version created — use the switcher above to view it"}
                              </span>
                            )}
                          </div>
                        );
                      })()
                    : null}
                  {m.role === "assistant" && m.research_completion_id ? (
                    <p className="text-xs leading-snug text-zinc-500">
                      {onNavigateToResearch ? (
                        <button
                          type="button"
                          className="font-medium text-violet-800 underline decoration-violet-300 underline-offset-2 hover:text-violet-950"
                          onClick={() => onNavigateToResearch(m.research_completion_id!)}
                        >
                          Open full answer in Research output
                        </button>
                      ) : (
                        <a
                          href="#research-output-panel"
                          className="font-medium text-violet-800 underline decoration-violet-300 underline-offset-2 hover:text-violet-950"
                        >
                          Open Research output
                        </a>
                      )}
                      <span className="text-zinc-500"> — full answer in Research output.</span>
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {loading &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role !== "assistant" ||
            !messages[messages.length - 1]?.content) && (
          <div className="mt-4 flex justify-start">
            <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"
                aria-hidden
              />
              <span className="ml-2">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-zinc-200 p-4">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex flex-col gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            disabled={loading}
            rows={4}
            className="min-h-[6.5rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            aria-label="Message for chat"
          />
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="min-w-[5.5rem] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              Send
            </button>
            <button
              type="button"
              disabled={loading || !input.trim()}
              title="Deeper answer, saved to Research output (no live web)"
              onClick={() => void handleSend(true)}
              className="min-w-[5.5rem] rounded-lg border-2 border-indigo-400 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 shadow-sm hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              Research
            </button>
          </div>
        </div>
      </form>
    </div>
  );
});

ResultChat.displayName = "ResultChat";
