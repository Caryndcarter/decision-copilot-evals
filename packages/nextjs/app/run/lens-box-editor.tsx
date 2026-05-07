"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { useTiptapViewAttached } from "./use-tiptap-view-attached";

/** Convert string[] to Tiptap doc with bullet list */
function itemsToContent(items: string[]) {
  const listItems = (items.length ? items : [""]).map((item) => {
    const text = typeof item === "string" ? item : JSON.stringify(item);
    return {
      type: "listItem" as const,
      content: [
        {
          type: "paragraph" as const,
          content: text.trim() ? [{ type: "text" as const, text }] : [],
        },
      ],
    };
  });
  return {
    type: "doc" as const,
    content: [
      {
        type: "bulletList" as const,
        content: listItems,
      },
    ],
  };
}

/** Minimal ProseMirror JSON shape for walking list nodes */
type PmJsonNode = { type?: string; content?: PmJsonNode[]; text?: string };

/** Extract string[] from Tiptap JSON (bulletList -> listItem -> paragraph -> text) */
function contentToItems(json: { content?: PmJsonNode[] }): string[] {
  const items: string[] = [];
  const bulletList = json.content?.find((n) => n.type === "bulletList");
  const listContent = bulletList?.content;
  if (!listContent) return items;
  for (const node of listContent) {
    if (node.type !== "listItem") continue;
    const paragraph = node.content?.find((n) => n.type === "paragraph");
    const pContent = paragraph?.content;
    const text = pContent?.map((n) => n.text ?? "").join("") ?? "";
    items.push(text);
  }
  return items.filter((t) => t.trim().length > 0);
}

export interface LensBoxEditorProps {
  items: string[];
  onSave: (items: string[]) => void;
  editable: boolean;
  placeholder?: string;
  className?: string;
  /** Unique key so editor is recreated when switching section (e.g. "risk.top_risks") */
  editorKey: string;
  /** When true, hide the "save when you click away" hint and Save button (e.g. inside brief) */
  hideSaveHint?: boolean;
}

export interface LensBoxEditorHandle {
  getItems(): string[];
}

export const LensBoxEditor = forwardRef<LensBoxEditorHandle, LensBoxEditorProps>(function LensBoxEditor(
  {
    items,
    onSave,
    editable,
    placeholder = "Add items…",
    className = "",
    editorKey,
    hideSaveHint = false,
  },
  ref
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const extensions = useMemo(() => [StarterKit], []);
  const editorProps = useMemo(
    () => ({
      attributes: {
        class: "prose prose-sm max-w-none min-h-[80px] outline-none focus:outline-none",
        tabindex: "0",
      },
    }),
    [],
  );
  const itemsSignature = items.join("\u0000");
  const initialContent = useMemo(() => itemsToContent(items), [itemsSignature]);

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      editable,
      immediatelyRender: false,
      editorProps,
    },
    [editorKey, itemsSignature],
  );

  const viewAttached = useTiptapViewAttached(editor);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || !editable) return;
    const onBlur = () => {
      const next = contentToItems(editor.getJSON());
      onSaveRef.current(next);
    };
    editor.on("blur", onBlur);
    return () => {
      editor.off("blur", onBlur);
    };
  }, [editor, editable]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const next = contentToItems(editor.getJSON());
    onSaveRef.current(next);
  }, [editor]);

  const getItems = useCallback(() => (editor ? contentToItems(editor.getJSON()) : []), [editor]);

  useImperativeHandle(ref, () => ({ getItems }), [getItems]);

  // Document-level capture listener: fires before any other handler, so ProseMirror
  // can never preventDefault() our focus call away. Only acts when the click target
  // is inside this editor's DOM node.
  const wrapperRef = useRef<HTMLDivElement>(null);

  // EditorContent mounts the ProseMirror view after `editor` exists; `editor.view` throws until then.
  useEffect(() => {
    if (!mounted || !editor || !editable || !viewAttached) return;
    const editorDom = editor.view.dom as HTMLElement;
    const focus = (e: MouseEvent) => {
      if (!editorDom.contains(e.target as Node)) return;
      if (!editor.isDestroyed) {
        editor.commands.focus();
        editorDom.focus({ preventScroll: true });
      }
    };
    document.addEventListener("mousedown", focus, true);
    return () => document.removeEventListener("mousedown", focus, true);
  }, [mounted, editor, editable, viewAttached]);

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
      <div className={`animate-pulse rounded border border-slate-200 bg-slate-50 p-3 ${className}`}>
        <p className="text-sm text-slate-500">Loading editor…</p>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`lens-box-editor relative z-[1] ${className}`}
    >
      <EditorContent editor={editor} />
      {editable && !hideSaveHint && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Edit inline; changes save when you click away or press Save.</p>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
});
