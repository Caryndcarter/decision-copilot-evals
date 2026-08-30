import type { ReactNode } from "react";

/** Title strip spacing — matches demo Decision Brief and Unified Brief pages. */
export const demoBriefTitleBannerClass = "mb-4 border-b border-zinc-200/90 py-2.5";

export const demoBriefTitleClass = "text-lg font-semibold leading-snug text-zinc-900 sm:text-xl";

export function DemoBriefTitleBanner({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={demoBriefTitleBannerClass}>
      <h2 className={demoBriefTitleClass}>{title}</h2>
      {children}
    </div>
  );
}

/** Outer content wrapper below the white toolbar (both demo brief pages). */
export const demoBriefBodyClass = "py-6";
