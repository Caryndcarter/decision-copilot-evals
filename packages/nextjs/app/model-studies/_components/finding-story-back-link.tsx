"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFindingsStudy } from "@/lib/findings-registry";

type BackLink = { href: string; label: string };

const OVERVIEW: BackLink = { href: "/model-studies#findings", label: "← Latest findings" };
const WHY: BackLink = { href: "/model-studies/why#research-to-product", label: "← Why it matters" };

function resultsHref(hash?: string): string {
  return hash ? `/model-studies/results#${hash}` : "/model-studies/results";
}

function caseBack(studyId: string): BackLink | null {
  const study = getFindingsStudy(studyId);
  if (!study) return null;
  return { href: `/model-studies/results/${studyId}`, label: `← ${study.name}` };
}

function backFromPath(pathname: string, hash: string, resultsHash?: string): BackLink | null {
  if (pathname === "/model-studies/results") {
    const id = resultsHash || hash.replace(/^#/, "");
    return { href: resultsHref(id || undefined), label: "← Results" };
  }
  const caseMatch = pathname.match(/^\/model-studies\/results\/([^/]+)$/);
  if (caseMatch) return caseBack(caseMatch[1]);
  if (pathname === "/model-studies" || pathname === "/model-studies/") return OVERVIEW;
  if (pathname === "/model-studies/why" || pathname.startsWith("/model-studies/why")) return WHY;
  return null;
}

function backFromParam(from: string | undefined, resultsHash?: string): BackLink | null {
  if (!from) return null;
  if (from === "results") return { href: resultsHref(resultsHash), label: "← Results" };
  if (from === "overview") return OVERVIEW;
  if (from === "why") return WHY;
  return caseBack(from);
}

function footerLabel(back: BackLink): string {
  if (back.href.includes("#findings")) return "Back to findings";
  if (back.href.startsWith("/model-studies/results/") && !back.href.includes("#")) {
    return `Back to ${back.label.replace(/^← /, "")}`;
  }
  if (back.href.startsWith("/model-studies/results")) return "Back to results";
  if (back.href.startsWith("/model-studies/why")) return "Back to why it matters";
  return back.label.replace(/^← /, "Back to ");
}

export function FindingStoryBackLink({
  fromParam,
  resultsHash,
  placement = "hero",
  className,
}: {
  fromParam?: string;
  /** Major-finding id so Results returns you to the same card. */
  resultsHash?: string;
  placement?: "hero" | "footer";
  className?: string;
}) {
  const [back, setBack] = useState<BackLink>(
    () => backFromParam(fromParam, resultsHash) ?? OVERVIEW
  );

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("from") ?? fromParam;
    const fromParamHit = backFromParam(fromQuery ?? undefined, resultsHash);
    if (fromParamHit) {
      setBack(fromParamHit);
      return;
    }

    try {
      if (!document.referrer) return;
      const referrer = new URL(document.referrer);
      if (referrer.origin !== window.location.origin) return;
      const fromRef = backFromPath(referrer.pathname, referrer.hash, resultsHash);
      if (fromRef) setBack(fromRef);
    } catch {
      /* ignore malformed referrer */
    }
  }, [fromParam, resultsHash]);

  return (
    <Link
      href={back.href}
      className={
        className ??
        "text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      }
    >
      {placement === "footer" ? footerLabel(back) : back.label}
    </Link>
  );
}
