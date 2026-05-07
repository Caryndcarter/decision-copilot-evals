"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

/**
 * Disclosure without <details>/<summary>: native summary treats Space/Enter as
 * “toggle open”, which steals keys and breaks TipTap; it also confuses focus.
 * A regular button for the header avoids that; the panel body stays in the DOM
 * and uses `hidden` when collapsed so TipTap instances are not destroyed.
 */
export function CollapsibleBlock({
  id,
  title,
  /** Override default uppercase section-title style (e.g. research task topic titles). */
  titleClassName,
  subtitle,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  badge,
  headerEnd,
  className = "",
  bodyClassName = "",
  collapsible = true,
  children,
}: {
  id?: string;
  title: string;
  titleClassName?: string;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state; when set, `defaultOpen` is only used for the initial unmount path */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  badge?: ReactNode;
  /** e.g. Regenerate — not nested inside the toggle button */
  headerEnd?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When false, header is static and body is always visible (no toggle). */
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = collapsible ? (controlled ? openProp : uncontrolledOpen) : true;
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    if (!controlled) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };

  useLayoutEffect(() => {
    if (!collapsible || !open) return;
    const raf = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => cancelAnimationFrame(raf);
  }, [collapsible, open]);

  const headerInner = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            titleClassName ?? "text-sm font-semibold text-zinc-800"
          }
        >
          {title}
        </span>
        {badge}
      </div>
      {subtitle ? <div className="mt-0.5 text-xs font-normal normal-case text-zinc-400">{subtitle}</div> : null}
    </div>
  );

  return (
    <div id={id} className={`rounded-lg border border-zinc-200 shadow-sm ${className}`}>
      <div className="flex w-full items-stretch border-b border-zinc-200 bg-zinc-50">
        {collapsible ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 px-4 py-3 text-left hover:bg-zinc-100/60"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setOpen((o) => !o);
              }
            }}
          >
            <span className="mt-0.5 shrink-0 font-mono text-xs text-indigo-400 select-none" aria-hidden>
              {open ? "▾" : "▸"}
            </span>
            {headerInner}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-start gap-2 px-4 py-3 text-left">{headerInner}</div>
        )}
        {headerEnd ? (
          <div className="flex shrink-0 items-start border-l border-zinc-200/60 px-3 py-3">{headerEnd}</div>
        ) : null}
      </div>
      <div
        className={`min-w-0 ${bodyClassName || "px-4 py-4"}`}
        style={collapsible && !open ? { visibility: "hidden", height: 0, overflow: "hidden", padding: 0 } : undefined}
        {...(collapsible && !open ? { "aria-hidden": true as const, "data-collapsed": "" } : {})}
      >
        {children}
      </div>
    </div>
  );
}
