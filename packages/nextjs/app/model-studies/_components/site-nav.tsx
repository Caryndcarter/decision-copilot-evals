"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionNav } from "@/app/components/session-nav";

const NAV_ITEMS = [
  { href: "/model-studies", label: "Overview" },
  { href: "/model-studies/results", label: "Results" },
  { href: "/model-studies/how-it-works", label: "How it works" },
  { href: "/model-studies/why", label: "Why it matters" },
];

export function SiteNav() {
  const pathname = usePathname();

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
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/model-studies"
                  ? pathname === "/model-studies"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <SessionNav />
      </div>
    </nav>
  );
}
