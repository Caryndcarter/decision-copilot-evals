import Link from "next/link";
import { LogoLockup } from "@/app/components/logo-icon";
import { SessionNav } from "@/app/components/session-nav";
import { MeridianMoralDashboard } from "./meridian-moral-dashboard";

export default function MeridianIcMoralPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <nav className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoLockup />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/runs?tab=harness" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Harness
            </Link>
            <SessionNav />
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <MeridianMoralDashboard />
      </div>
    </main>
  );
}
