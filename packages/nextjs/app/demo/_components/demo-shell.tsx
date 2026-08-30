import Link from "next/link";
import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";

export function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <SessionNav />
        </div>
      </nav>
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center text-sm text-amber-950">
        <span className="font-semibold">Demo mode.</span> Frozen sample run — no data is saved or sent to models.{" "}
        <Link href="/request-access" className="font-medium text-amber-900 underline hover:text-amber-800">
          Request access
        </Link>{" "}
        to run your own decisions.
      </div>
      {children}
    </div>
  );
}
