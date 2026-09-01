"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFindingsStudy } from "@/lib/findings-registry";

type BackLink = { href: string; label: string };

const OVERVIEW: BackLink = { href: "/model-studies#findings", label: "← Latest findings" };

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
  return null;
}

function backFromParam(from: string | undefined, resultsHash?: string): BackLink | null {
  if (!from) return null;
  if (from === "results") return { href: resultsHref(resultsHash), label: "← Results" };
  if (from === "overview") return OVERVIEW;
  return caseBack(from);
}

export function FindingStoryBackLink({
  fromParam,
  resultsHash,
}: {
  fromParam?: string;
  /** Major-finding id so Results returns you to the same card. */
  resultsHash?: string;
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
      className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
    >
      {back.label}
    </Link>
  );
}
