import type { HarnessKind } from "@/types/decision";

export const HARNESS_KIND_LABELS: Record<HarnessKind, string> = {
  "multi-demo-authorship": "Authorship · multi-demo",
  "civitas-replication": "Civitas · replication",
  "meridian-ic-voice": "Meridian IC · voice cases",
};

export const HARNESS_KIND_SHORT: Record<HarnessKind, string> = {
  "multi-demo-authorship": "Authorship",
  "civitas-replication": "Civitas",
  "meridian-ic-voice": "Meridian IC",
};

/** First 8 chars of a batch UUID for badges (keeps lists readable). */
export function shortHarnessBatchId(batchId: string | undefined): string | undefined {
  if (!batchId?.trim()) return undefined;
  return batchId.replace(/-/g, "").slice(0, 8);
}

export function harnessBadgeLabel(opts: {
  kind?: HarnessKind;
  runNumber?: number;
  trial?: number;
  batchId?: string;
}): string {
  const kind = opts.kind ? HARNESS_KIND_SHORT[opts.kind] : "Harness";
  const shortId = shortHarnessBatchId(opts.batchId);
  const parts = [kind];
  if (typeof opts.runNumber === "number") parts.push(`Run ${opts.runNumber}`);
  if (shortId) parts.push(shortId);
  if (typeof opts.trial === "number") parts.push(`Case ${opts.trial}`);
  return parts.join(" · ");
}
