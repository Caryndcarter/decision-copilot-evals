/** Coerce dashboard `latestAt` (Date or ISO string after cache/RSC serialization). */
export function latestAtMs(value: Date | string | undefined | null): number {
  if (value == null) return 0;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function coerceLatestAt(value: Date | string | undefined | null): Date {
  const ms = latestAtMs(value);
  return ms > 0 ? new Date(ms) : new Date(0);
}

export function compareLatestAtDesc(
  a: { latestAt: Date | string },
  b: { latestAt: Date | string }
): number {
  return latestAtMs(b.latestAt) - latestAtMs(a.latestAt);
}
