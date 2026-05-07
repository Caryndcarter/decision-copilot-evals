"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { remarkLinkifyBareUrls } from "./remark-linkify-bare-urls";

const mdHeadingClass =
  "mb-2 mt-4 text-sm font-semibold text-slate-900 first:mt-0 [&+ul]:mt-1 [&+ol]:mt-1";

/** Models often emit markdown links without a scheme; browsers treat those as site-relative paths. */
function ensureClickableHref(href: string | undefined): string | undefined {
  if (href == null) return undefined;
  const h = href.trim();
  if (!h) return undefined;
  if (/^(javascript|data|vbscript):/i.test(h)) return undefined;
  if (/^(https?|mailto|tel):/i.test(h)) return h;
  if (h.startsWith("//")) return `https:${h}`;
  if (h.startsWith("#") || h.startsWith("/")) return h;
  if (/^www\./i.test(h)) return `https://${h}`;
  // host.tld/... without scheme (common in LLM markdown)
  if (/^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}([/?#]|$)/i.test(h)) {
    return `https://${h}`;
  }
  return h;
}

const shared: Partial<Components> = {
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-800">{children}</em>,
  a: ({ href, children }) => {
    const resolved = ensureClickableHref(typeof href === "string" ? href : undefined);
    if (!resolved) {
      return <span className="break-words text-slate-800">{children}</span>;
    }
    return (
      <a
        href={resolved}
        className="break-words font-medium text-violet-700 underline decoration-violet-200 underline-offset-2 hover:text-violet-900"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
  code: ({ className, children }) => {
    const block = Boolean(className?.startsWith("language-"));
    if (block) {
      return <code className={`${className ?? ""} font-mono text-[0.8125rem]`}>{children}</code>;
    }
    return (
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.8125rem] text-slate-800">
        {children}
      </code>
    );
  },
};

const blockComponents: Components = {
  ...shared,
  p: ({ children }) => <p className="mb-3 last:mb-0 text-sm leading-relaxed text-slate-700">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-slate-700 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-700 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-200" />,
  h1: ({ children }) => <h5 className={mdHeadingClass}>{children}</h5>,
  h2: ({ children }) => <h5 className={mdHeadingClass}>{children}</h5>,
  h3: ({ children }) => <h5 className={mdHeadingClass}>{children}</h5>,
  h4: ({ children }) => <h5 className={mdHeadingClass}>{children}</h5>,
  h5: ({ children }) => <h5 className={mdHeadingClass}>{children}</h5>,
  h6: ({ children }) => <h5 className={mdHeadingClass}>{children}</h5>,
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-3 max-w-full overflow-x-auto last:mb-0">
      <table className="min-w-full border-collapse border border-slate-200 text-left text-sm text-slate-700">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-slate-200">{children}</tr>,
  th: ({ children }) => <th className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-900">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 px-2 py-1.5 align-top">{children}</td>,
};

const inlineComponents: Components = {
  ...shared,
  p: ({ children }) => <span>{children}</span>,
};

export function ResearchMarkdown({ source }: { source: string }) {
  const trimmed = source.trim();
  if (!trimmed) return null;
  return (
    <div className="min-w-0 text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkLinkifyBareUrls]} components={blockComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}

/** For short titles that may include **bold** etc. (no block elements expected). */
export function ResearchMarkdownInline({ source }: { source: string }) {
  const trimmed = source.trim();
  if (!trimmed) return null;
  return (
    <span className="inline min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkLinkifyBareUrls]} components={inlineComponents}>
        {trimmed}
      </ReactMarkdown>
    </span>
  );
}
