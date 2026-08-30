import Link from "next/link";
import { DemoProviderPicker } from "@/app/demo/_components/demo-provider-picker";
import { demoContentClass } from "@/app/demo/_components/demo-shell";
import { getDemoRun } from "@/app/demo/_data/demo-fixtures";
import { runShortChromeLabel } from "@/lib/run-display-name";
import type { LLMProviderName } from "@/types/decision";

type DemoBriefToolbarProps =
  | { view: "single"; provider: LLMProviderName }
  | { view: "unified" };

const viewToggleClass = {
  active:
    "inline-flex items-center rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-sm font-medium text-indigo-800 shadow-sm",
  inactive:
    "inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50",
};

/** Sticky below demo shell nav + “Demo mode” strip (~6.75rem). */
const STICKY_TOOLBAR_CLASS =
  "sticky top-[6.75rem] z-40 border-b border-zinc-200 bg-white shadow-sm";

export function DemoBriefToolbar(props: DemoBriefToolbarProps) {
  const view = props.view;
  const chromeLabel =
    view === "single" ? runShortChromeLabel(getDemoRun(props.provider)) : null;

  return (
    <header className={STICKY_TOOLBAR_CLASS}>
      <div className={`flex flex-wrap items-center justify-between gap-4 py-3 ${demoContentClass}`}>
        <h1 className="text-base font-semibold text-zinc-900">
          {view === "single" ? (
            <>
              Decision Brief{" "}
              <span className="font-normal text-zinc-500">— {chromeLabel}</span>
            </>
          ) : (
            "Unified Brief"
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {view === "single" ? (
            <>
              <Link href="/demo/unified" className={viewToggleClass.inactive}>
                Unified Brief
              </Link>
              <DemoProviderPicker provider={props.provider} />
            </>
          ) : (
            <>
              <Link href="/demo/result?provider=openai" className={viewToggleClass.inactive}>
                Decision Brief
              </Link>
              <span className={viewToggleClass.active} aria-current="page">
                Unified Brief
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
