import { AppNavBrand } from "@/app/components/app-nav-brand";
import { SessionNav } from "@/app/components/session-nav";
import { DemoModeStrip } from "@/app/demo/_components/demo-mode-strip";

export function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <AppNavBrand />
          <SessionNav />
        </div>
        <DemoModeStrip />
      </nav>
      {children}
    </div>
  );
}
