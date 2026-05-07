"use client";

/**
 * SSR is handled inside each editor component via a `mounted` guard (useState + useEffect).
 * This file re-exports them directly — no next/dynamic wrapper needed.
 */
export { LensBoxEditor } from "./lens-box-editor";
export type { LensBoxEditorHandle } from "./lens-box-editor";
export { ClarificationAnswerEditor } from "./clarification-answer-editor";
export type { ClarificationAnswerEditorHandle } from "./clarification-answer-editor";
