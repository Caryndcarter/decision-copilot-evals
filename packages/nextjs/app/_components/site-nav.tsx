"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/app/components/logo-icon";
import { SessionNav } from "@/app/components/session-nav";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/results", label: "Results" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/why", label: "Why it matters" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <LogoLockup />
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
