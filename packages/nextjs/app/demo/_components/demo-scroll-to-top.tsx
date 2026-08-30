"use client";

import { useLayoutEffect } from "react";

/** Keep demo brief pages anchored at the top (toolbar visible), not at the brief title block. */
export function DemoScrollToTop({ resetKey }: { resetKey: string }) {
  useLayoutEffect(() => {
    const url = window.location.pathname + window.location.search;
    if (window.location.hash) {
      window.history.replaceState(null, "", url);
    }
    window.scrollTo(0, 0);
  }, [resetKey]);

  return null;
}
