/** Query param carrying a verbatim substring to find and flash-highlight after navigation. */
export const SYNTHESIS_HIGHLIGHT_QUERY_KEY = "hlq";

const MARK_CLASS = "dc-synthesis-hl";

function normalizeForMatch(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function clearSynthesisHighlightMarks(): void {
  for (const mark of Array.from(document.querySelectorAll(`mark.${MARK_CLASS}`))) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  }
}

function findTextRange(container: HTMLElement, needle: string): { node: Text; start: number; end: number } | null {
  const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let t: Node | null;
  while ((t = w.nextNode())) {
    if (!(t instanceof Text)) continue;
    const p = t.parentElement;
    if (p?.closest("script,style,noscript")) continue;
    const tc = t.textContent ?? "";
    const idx = tc.indexOf(needle);
    if (idx >= 0) return { node: t, start: idx, end: idx + needle.length };
  }
  return null;
}

/**
 * Wraps the first in-container match of a prefix of `rawQuote` (single text node) in a temporary <mark>.
 * Tries progressively shorter prefixes when the full string does not appear in one text node.
 */
export function tryHighlightQuotedText(container: HTMLElement, rawQuote: string): boolean {
  clearSynthesisHighlightMarks();
  const full = normalizeForMatch(rawQuote);
  if (full.length < 8) return false;

  const maxLen = Math.min(full.length, 220);
  for (let len = maxLen; len >= 12; len--) {
    const needle = full.slice(0, len);
    const hit = findTextRange(container, needle);
    if (!hit) continue;
    const range = document.createRange();
    range.setStart(hit.node, hit.start);
    range.setEnd(hit.node, hit.end);
    const mark = document.createElement("mark");
    mark.className = `${MARK_CLASS} rounded bg-amber-200/95 px-0.5 ring-2 ring-amber-500/80 shadow-sm`;
    try {
      range.surroundContents(mark);
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        const p = mark.parentNode;
        if (!p) return;
        while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
        p.removeChild(mark);
      }, 12000);
      return true;
    } catch {
      // Range splits non-text boundaries — try shorter needle
    }
  }
  return false;
}

/** Remove hlq from the address bar after a successful highlight (keeps hash and other params). */
export function stripHighlightQueryFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has(SYNTHESIS_HIGHLIGHT_QUERY_KEY)) return;
    u.searchParams.delete(SYNTHESIS_HIGHLIGHT_QUERY_KEY);
    const next = `${u.pathname}${u.search}${u.hash}`;
    window.history.replaceState(window.history.state, "", next);
  } catch {
    // ignore
  }
}
