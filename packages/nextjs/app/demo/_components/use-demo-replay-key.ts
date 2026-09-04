"use client";

import { useEffect, useRef, useState } from "react";
import {
  type DemoGuideState,
  shouldPlayOnGuideChange,
  shouldPlayOnGuideReady,
} from "@/app/demo/_components/demo-replay";

const IDLE: DemoGuideState = { ready: false, dismissed: false, spot: null, generation: 0 };

/**
 * Bumps a key whenever the canned animation should run:
 * first ready (refresh / return with a dismissed guide, or already on the spot),
 * later when the guide lands on `targetSpot`, and when the guide restarts on that spot.
 */
export function useDemoReplayKey(
  ready: boolean,
  dismissed: boolean,
  spot: string | null,
  generation: number,
  targetSpot: string
): number {
  const [key, setKey] = useState(0);
  const prev = useRef<DemoGuideState>(IDLE);
  const started = useRef(false);

  useEffect(() => {
    const state: DemoGuideState = { ready, dismissed, spot, generation };
    const last = prev.current;
    prev.current = state;
    if (!ready) return;

    if (!started.current) {
      started.current = true;
      if (shouldPlayOnGuideReady(state, targetSpot)) setKey((k) => k + 1);
      return;
    }

    if (shouldPlayOnGuideChange(last, state, targetSpot)) setKey((k) => k + 1);
  }, [ready, dismissed, spot, generation, targetSpot]);

  return key;
}
