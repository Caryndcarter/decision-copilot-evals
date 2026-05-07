"use client";

import { useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { isMeaningfulResearchText, researchCompletionNavLines } from "@/lib/research-structured-response";
import type { ResearchCompletion } from "@/types/decision";
import { CollapsibleBlock } from "./collapsible-block";
import { ResearchMarkdown, ResearchMarkdownInline } from "./research-markdown";

export interface ResearchOutputPanelHandle {
  expandAll(): void;
  collapseAll(): void;
}

export interface ResearchOutputPanelProps {
  completions: ResearchCompletion[];
  /** When the header "Research" menu selects a completion, scroll it into view */
  focusNavId?: string | null;
  onFocusNavHandled?: () => void;
  className?: string;
}

export const ResearchOutputPanel = forwardRef<ResearchOutputPanelHandle, ResearchOutputPanelProps>(
  function ResearchOutputPanel(
    { completions, focusNavId, onFocusNavHandled, className = "" }: ResearchOutputPanelProps,
    ref
  ) {
    const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
      Object.fromEntries(completions.map((c, i) => [c.research_id, i === completions.length - 1]))
    );

    useEffect(() => {
      setOpenMap((prev) => {
        const next = { ...prev };
        completions.forEach((c, i) => {
          if (!(c.research_id in next)) {
            next[c.research_id] = i === completions.length - 1;
          }
        });
        return next;
      });
    }, [completions]);

    useEffect(() => {
      if (!focusNavId) return;
      const el = document.getElementById(`research-completion-${focusNavId}`);
      if (el) {
        setOpenMap((prev) => ({ ...prev, [focusNavId]: true }));
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        onFocusNavHandled?.();
      }
    }, [focusNavId, onFocusNavHandled]);

    const expandAll = () =>
      setOpenMap(Object.fromEntries(completions.map((c) => [c.research_id, true])));
    const collapseAll = () =>
      setOpenMap(Object.fromEntries(completions.map((c) => [c.research_id, false])));

    useImperativeHandle(ref, () => ({ expandAll, collapseAll }), [completions]);

    return (
      <div className={`space-y-3 ${className}`}>
        {completions.length === 0 ? (
          <p className="rounded-md border border-violet-200/80 bg-white/80 px-3 py-4 text-sm text-slate-600">
            No research tasks yet. Use a research starter in the chat on the right (or your own prompt with the same
            flow). The full write-up for each task appears here; chat shows only a short summary with a link.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button type="button" onClick={expandAll} className="text-slate-500 hover:text-indigo-600">
                Expand all
              </button>
              <span className="text-slate-300">·</span>
              <button type="button" onClick={collapseAll} className="text-slate-500 hover:text-indigo-600">
                Collapse all
              </button>
            </div>
            {completions.map((c) => {
              const { primary, secondary } = researchCompletionNavLines(c);
              const dateStr = new Date(c.completed_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              });
              const subtitle = secondary ? (
                <>
                  <span className="mr-1 text-slate-500">{secondary}</span>· {dateStr}
                </>
              ) : (
                dateStr
              );
              const sectionsWithBody = (c.sections ?? []).filter((s) => isMeaningfulResearchText(s.body));
              const hasMain = Boolean(c.main_answer && isMeaningfulResearchText(c.main_answer));
              const hasExtras = sectionsWithBody.length > 0;

              return (
                <CollapsibleBlock
                  key={c.research_id}
                  id={`research-completion-${c.research_id}`}
                  title={primary}
                  titleClassName="text-sm font-semibold normal-case tracking-tight text-slate-800"
                  subtitle={subtitle}
                  open={openMap[c.research_id] ?? false}
                  onOpenChange={(v) => setOpenMap((prev) => ({ ...prev, [c.research_id]: v }))}
                  className="border-violet-200 bg-white shadow-sm"
                  bodyClassName="space-y-5 px-3 pb-4 pt-2"
                >
                  {hasMain ? (
                    <div className={hasExtras ? "pb-4" : undefined}>
                      <ResearchMarkdown source={c.main_answer!} />
                    </div>
                  ) : null}
                  {!hasMain && !hasExtras ? (
                    <p className="text-sm text-slate-600">
                      Nothing was stored for this task. Check the chat summary for that send, or try the request again.
                    </p>
                  ) : null}
                  {hasExtras ? (
                    hasMain ? (
                      <div className="space-y-5 border-t border-slate-100 pt-4">
                        {sectionsWithBody.map((s, j) => (
                          <section key={`${c.research_id}-${j}`}>
                            <h4 className="text-sm font-semibold text-slate-900">
                              <ResearchMarkdownInline source={s.heading} />
                            </h4>
                            <div className="mt-1.5">
                              <ResearchMarkdown source={s.body} />
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      sectionsWithBody.map((s, j) => (
                        <section key={`${c.research_id}-${j}`}>
                          <h4 className="text-sm font-semibold text-slate-900">
                            <ResearchMarkdownInline source={s.heading} />
                          </h4>
                          <div className="mt-1.5">
                            <ResearchMarkdown source={s.body} />
                          </div>
                        </section>
                      ))
                    )
                  ) : null}
                </CollapsibleBlock>
              );
            })}
          </>
        )}
      </div>
    );
  }
);

ResearchOutputPanel.displayName = "ResearchOutputPanel";
