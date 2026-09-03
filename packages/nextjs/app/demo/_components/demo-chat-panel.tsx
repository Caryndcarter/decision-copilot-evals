"use client";

import { useEffect, useRef, useState } from "react";
import { runProviderLabel } from "@/lib/run-display-name";
import { ResearchMarkdown } from "@/app/run/research-markdown";
import type { DemoChatScript, DemoChatTurn } from "@/app/demo/_data/demo-chat-script";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function DemoChatBubbles({
  messages,
  thinkingLabel,
  thinking,
}: {
  messages: DemoChatTurn[];
  thinkingLabel: string;
  thinking: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  return (
    <div
      ref={listRef}
      className="max-h-[min(360px,46vh)] min-h-[200px] space-y-4 overflow-y-auto p-4"
      aria-label="Demo chat messages"
    >
      {messages.length === 0 && !thinking ? (
        <p className="text-sm text-zinc-400">No messages yet.</p>
      ) : null}
      {messages.map((m, i) => (
        <div key={`${m.role}-${i}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            {m.role === "assistant" ? (
              <ResearchMarkdown source={m.content || " "} />
            ) : (
              <p className="whitespace-pre-wrap">{m.content}</p>
            )}
          </div>
        </div>
      ))}
      {thinking ? (
        <div className="flex justify-start">
          <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent align-middle"
              aria-hidden
            />
            <span className="ml-2 align-middle">{thinkingLabel}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DemoChatPanel({
  script,
  play,
  variant,
}: {
  script: DemoChatScript;
  /** When true, replay the canned exchange. */
  play: boolean;
  variant: "decision" | "unified";
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DemoChatTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [sendingGlow, setSendingGlow] = useState(false);
  const [complete, setComplete] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);

  useEffect(() => {
    if (!play && replayNonce === 0) return;
    let cancelled = false;

    const run = async () => {
      setComplete(false);
      setMessages([]);
      setInput("");
      setThinking(false);
      setSendingGlow(false);

      for (const turn of script.turns) {
        if (cancelled) return;
        if (turn.role === "user") {
          for (let i = 0; i <= turn.content.length; i += 2) {
            if (cancelled) return;
            setInput(turn.content.slice(0, i));
            await sleep(16);
          }
          if (cancelled) return;
          setInput(turn.content);
          setSendingGlow(true);
          await sleep(380);
          if (cancelled) return;
          setSendingGlow(false);
          setInput("");
          setMessages((prev) => [...prev, turn]);
        } else {
          setThinking(true);
          await sleep(750);
          if (cancelled) return;
          setThinking(false);
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
          for (let i = 0; i <= turn.content.length; i += 3) {
            if (cancelled) return;
            const slice = turn.content.slice(0, i);
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: "assistant", content: slice };
              return next;
            });
            await sleep(14);
          }
          if (cancelled) return;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = turn;
            return next;
          });
        }
      }
      if (!cancelled) setComplete(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [play, replayNonce, script]);

  useEffect(() => {
    if (play) return;
    const user = script.turns.find((t) => t.role === "user");
    const assistant = script.turns.find((t) => t.role === "assistant");
    if (complete || (user && assistant && messages.length > 0)) {
      setInput("");
      setThinking(false);
      setSendingGlow(false);
      setMessages(script.turns);
      setComplete(true);
    }
  }, [play, complete, messages.length, script]);

  return (
    <aside
      data-demo-spot="demo-chat"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:sticky lg:top-28"
    >
      {variant === "decision" ? (
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Discuss &amp; clarify</h2>
          <p className="mt-1 text-xs leading-snug text-zinc-500">
            <span className="font-medium text-zinc-700">Send</span> — Q&amp;A on this run.{" "}
            <span className="font-medium text-zinc-700">Research</span> — longer investigative reply.
          </p>
        </div>
      ) : (
        <div className="border-b border-indigo-100 bg-indigo-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-indigo-950">Chat about this brief</h2>
          <p className="mt-1 text-xs leading-snug text-indigo-950/85">
            Pick a model below. On a live run each one discusses the Unified Brief. This tour replays a
            canned exchange — nothing is sent to a model.
          </p>
        </div>
      )}

      {variant === "unified" && script.discussWith ? (
        <div className="border-b border-indigo-100/80 bg-indigo-50/50 px-4 py-2.5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-indigo-900/60">
            Discuss with
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chat model provider (demo)">
            {script.discussWith.map((p) => {
              const selected = p === script.discussWithSelected;
              return (
                <span
                  key={p}
                  aria-pressed={selected}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    selected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-zinc-200 bg-white text-zinc-400"
                  }`}
                >
                  {runProviderLabel(p)}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <DemoChatBubbles messages={messages} thinking={thinking} thinkingLabel={script.thinkingLabel} />

      <div className="border-t border-zinc-200 p-4">
        <textarea
          value={input}
          readOnly
          placeholder={script.composerPlaceholder}
          rows={variant === "decision" ? 4 : 3}
          className="min-h-[5.5rem] w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 disabled:opacity-60"
          aria-label="Demo chat composer (not live)"
        />
        <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-snug text-zinc-400">Demo replay — not a live chat.</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {complete || messages.length === 0 ? (
              <button
                type="button"
                onClick={() => setReplayNonce((n) => n + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {complete ? "Play again" : "Play demo chat"}
              </button>
            ) : null}
            <button
              type="button"
              disabled
              className={`min-w-[5.5rem] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 ${
                sendingGlow ? "ring-2 ring-indigo-300" : ""
              }`}
            >
              Send
            </button>
            {script.showResearch ? (
              <button
                type="button"
                disabled
                className="min-w-[5.5rem] rounded-lg border-2 border-indigo-400 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 opacity-50"
              >
                Research
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
