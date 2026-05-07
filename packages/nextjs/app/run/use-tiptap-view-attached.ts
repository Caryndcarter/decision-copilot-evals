"use client";

import type { Editor } from "@tiptap/react";
import { useLayoutEffect, useState } from "react";

/**
 * True once EditorContent has attached the ProseMirror view. Accessing `editor.view` before then
 * throws: "The editor view is not available... The editor may not be mounted yet."
 */
export function useTiptapViewAttached(editor: Editor | null): boolean {
  const [attached, setAttached] = useState(false);

  /** useLayoutEffect so "attached" resets before child useEffects run (avoids stale true after editor swap). */
  useLayoutEffect(() => {
    setAttached(false);
    if (!editor || editor.isDestroyed) return;

    const sync = () => {
      if (editor.isDestroyed) {
        setAttached(false);
        return;
      }
      try {
        const dom = editor.view.dom as HTMLElement;
        setAttached(Boolean(dom?.parentNode));
      } catch {
        setAttached(false);
      }
    };

    const onUnmount = () => setAttached(false);

    editor.on("mount", sync);
    editor.on("unmount", onUnmount);
    sync();
    const raf = requestAnimationFrame(sync);

    return () => {
      cancelAnimationFrame(raf);
      editor.off("mount", sync);
      editor.off("unmount", onUnmount);
    };
  }, [editor]);

  return attached;
}
