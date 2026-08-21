import Link from "next/link";
import { LogoLockup } from "@/app/components/logo-icon";
import { SessionNav } from "@/app/components/session-nav";

export function FindingsNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoLockup />
          </Link>
          <span className="hidden sm:inline text-sm text-zinc-500">/</span>
          <Link
            href="/findings"
            className="hidden sm:inline text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Findings
          </Link>
        </div>
        <SessionNav />
      </div>
    </nav>
  );
}
