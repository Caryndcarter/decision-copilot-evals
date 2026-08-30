import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import { DemoModeStrip } from "@/app/demo/_components/demo-mode-strip";

/** Match sticky nav width so page chrome does not sit in a narrower column. */
export const demoContentClass = "mx-auto max-w-6xl px-6";

export function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className={`flex items-center justify-between py-4 ${demoContentClass}`}>
          <AppNavBrand />
          <SessionNav />
        </div>
        <DemoModeStrip />
      </nav>
      {children}
    </div>
  );
}
