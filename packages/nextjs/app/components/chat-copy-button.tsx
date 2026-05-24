"use client";

import { useCallback, useState } from "react";
import { markdownToPlainTextForCopy } from "@/lib/markdown-plain-text";

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export function ChatCopyButton({
  text,
  className = "",
  asMarkdown = false,
  label,
}: {
  text: string;
  className?: string;
  asMarkdown?: boolean;
  /** Button label (default: Copy or Markdown). */
  label?: string;
}) {
  const defaultLabel = asMarkdown ? "Markdown" : "Copy";
  const displayLabel = label ?? defaultLabel;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const onCopy = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const toCopy = asMarkdown ? trimmed : markdownToPlainTextForCopy(trimmed);
    const ok = await copyTextToClipboard(toCopy);
    setState(ok ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 2000);
  }, [text, asMarkdown]);

  if (!text.trim()) return null;

  const feedback = state === "copied" ? "Copied" : state === "failed" ? "Failed" : displayLabel;

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${className} ${
        state === "copied"
          ? "text-green-700"
          : state === "failed"
            ? "text-red-600"
            : "text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-700"
      }`}
      aria-label={
        state === "copied"
          ? `Copied ${asMarkdown ? "markdown" : "plain text"} to clipboard`
          : state === "failed"
            ? "Copy failed"
            : asMarkdown
              ? "Copy message as markdown"
              : "Copy message as plain text"
      }
    >
      {feedback}
    </button>
  );
}

/** Plain-text and markdown copy actions for assistant chat bubbles. */
export function ChatMessageCopyActions({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  if (!text.trim()) return null;

  return (
    <div className={`flex flex-wrap items-center justify-end gap-0.5 ${className}`.trim()}>
      <ChatCopyButton text={text} asMarkdown={false} />
      <ChatCopyButton text={text} asMarkdown />
    </div>
  );
}
