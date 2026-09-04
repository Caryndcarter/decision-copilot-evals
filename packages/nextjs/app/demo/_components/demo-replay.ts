/** Keys the on-page Decision / Unified guides persist into sessionStorage. */
export const DEMO_GUIDE_STORAGE_KEYS = [
  "dc-demo-brief-guide",
  "dc-demo-unified-guide",
] as const;

/** Clear guide dismissals so a new pass through /tour or /demo/intake replays. */
export function resetDemoTourGuides() {
  if (typeof window === "undefined") return;
  try {
    for (const key of DEMO_GUIDE_STORAGE_KEYS) {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export type DemoGuideState = {
  ready: boolean;
  dismissed: boolean;
  spot: string | null;
  generation: number;
};

/** First paint after the guide reads sessionStorage. */
export function shouldPlayOnGuideReady(state: DemoGuideState, targetSpot: string): boolean {
  if (!state.ready) return false;
  return state.dismissed || state.spot === targetSpot;
}

/** Later transitions: landing on the target spot, or restarting while already there. */
export function parseGuideStorage(
  raw: string | null,
  stepCount: number
): { dismissed: boolean; step: number } {
  if (raw === "dismissed") return { dismissed: true, step: 0 };
  if (raw == null || raw === "") return { dismissed: false, step: 0 };
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0 && n < stepCount) return { dismissed: false, step: n };
  return { dismissed: false, step: 0 };
}

export function shouldPlayOnGuideChange(
  prev: DemoGuideState,
  next: DemoGuideState,
  targetSpot: string
): boolean {
  if (!next.ready) return false;
  if (next.generation !== prev.generation && next.spot === targetSpot) return true;
  return next.spot === targetSpot && prev.spot !== targetSpot;
}
