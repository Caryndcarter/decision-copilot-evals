/**
 * Best-effort markdown → plain text for clipboard (chat copy, exports).
 * Preserves readable structure (paragraphs, list lines) without syntax markers.
 */
export function markdownToPlainTextForCopy(source: string): string {
  let s = source.replace(/\r\n/g, "\n");

  s = s.replace(/```[\w-]*\n?([\s\S]*?)```/g, (_, code: string) => `${code.trim()}\n\n`);
  s = s.replace(/`([^`\n]+)`/g, "$1");
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const t = label.trim();
    const u = url.trim();
    if (!u || u.startsWith("#") || t === u) return t;
    return `${t} (${u})`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/\*([^*\n]+)\*/g, "$1");
  s = s.replace(/_([^_\n]+)_/g, "$1");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/^[-*_]{3,}\s*$/gm, "");
  s = s.replace(/^>\s?/gm, "");
  s = s.replace(/^\s*[-*+]\s+/gm, "• ");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}
