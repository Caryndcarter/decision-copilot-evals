"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useCallback, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { useTiptapViewAttached } from "./use-tiptap-view-attached";

function textToContent(text: string) {
  return {
    type: "doc" as const,
    content: [
      {
        type: "paragraph" as const,
        content: text.trim() ? [{ type: "text" as const, text }] : [],
      },
    ],
  };
}

export function contentToText(json: { content?: Array<Record<string, unknown>> }): string {
  const p = json.content?.find((n) => n.type === "paragraph");
  const pContent = p?.content as Array<{ text?: string }> | undefined;
  if (!pContent) return "";
  return pContent.map((n) => n.text ?? "").join("");
}

export interface ClarificationAnswerEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Unique key so editor is recreated when switching question */
  editorKey: string;
  /** Optional: lighter inline styling (e.g. for brief summary/recommendation) */
  variant?: "default" | "inline";
}

export interface ClarificationAnswerEditorHandle {
  getValue(): string;
}

export const ClarificationAnswerEditor = forwardRef<
  ClarificationAnswerEditorHandle,
  ClarificationAnswerEditorProps
>(function ClarificationAnswerEditor(
  { value, onChange, className = "", editorKey, variant = "default" },
  ref
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const extensions = useMemo(
    () => [StarterKit.configure({ bulletList: false, orderedList: false, listItem: false })],
    [],
  );
  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          variant === "inline"
            ? "min-h-[1.5rem] w-full rounded border-0 bg-transparent px-0 py-1 text-slate-800 focus:outline-none focus:ring-0"
            : "min-h-[2.5rem] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
        tabindex: "0",
      },
    }),
    [variant],
  );
  const initialContent = useMemo(() => textToContent(value), [value]);

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      editable: true,
      immediatelyRender: false,
      editorProps,
    },
    [editorKey, value],
  );

  const viewAttached = useTiptapViewAttached(editor);

  const getValue = useCallback(() => (editor ? contentToText(editor.getJSON()) : ""), [editor]);
  useImperativeHandle(ref, () => ({ getValue }), [getValue]);

  useEffect(() => {
    if (!editor) return;
    const syncContent = () => onChange(contentToText(editor.getJSON()));
    const onBlur = syncContent;
    editor.on("blur", onBlur);
    // Also sync on content change so parent (and chat context) has latest without requiring blur
    let updateTimeout: ReturnType<typeof setTimeout> | null = null;
    const onUpdate = () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(syncContent, 200);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("blur", onBlur);
      editor.off("update", onUpdate);
      if (updateTimeout) clearTimeout(updateTimeout);
    };
  }, [editor, onChange]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted || !editor || editor.isDestroyed || !viewAttached) return;
    let editorDom: HTMLElement;
    try {
      editorDom = editor.view.dom as HTMLElement;
    } catch {
      return;
    }
    if (!editorDom) return;
    const focus = (e: MouseEvent) => {
      if (!editorDom.contains(e.target as Node)) return;
      if (!editor.isDestroyed) {
        editor.commands.focus();
        editorDom.focus({ preventScroll: true });
      }
    };
    document.addEventListener("mousedown", focus, true);
    return () => document.removeEventListener("mousedown", focus, true);
  }, [mounted, editor, viewAttached]);

  useEffect(() => {
    if (!mounted || !editor) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const stop = (e: KeyboardEvent) => e.stopPropagation();
    wrapper.addEventListener("keydown", stop, true);
    return () => wrapper.removeEventListener("keydown", stop, true);
  }, [mounted, editor]);

  if (!mounted || !editor) {
    return (
      <div className={`animate-pulse rounded border border-slate-200 bg-slate-50 px-3 py-2 ${className}`}>
        <p className="text-sm text-slate-500">Loading editor…</p>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={className}
    >
      <EditorContent editor={editor} />
    </div>
  );
});
