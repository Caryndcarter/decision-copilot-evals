"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionNav } from "@/app/components/session-nav";

const NAV_ITEMS = [
  { href: "/model-studies", label: "Overview" },
  { href: "/model-studies/results", label: "Results" },
  { href: "/model-studies/how-it-works", label: "How it works" },
  { href: "/model-studies/why", label: "Why it matters" },
];

function isActive(pathname: string, href: string) {
  return href === "/model-studies" ? pathname === "/model-studies" : pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <div className="flex items-baseline gap-2">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Decision Copilot
            </Link>
            <span className="text-zinc-700">·</span>
            <Link href="/model-studies" className="text-base font-semibold tracking-tight text-white">
              Model Studies
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(pathname, item.href) ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SessionNav />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="model-studies-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div id="model-studies-mobile-nav" className="sm:hidden border-t border-white/10 px-6 py-3">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                  isActive(pathname, item.href)
                    ? "bg-white/5 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
