"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseGuideStorage, type DemoGuideState } from "@/app/demo/_components/demo-replay";

export const DEMO_BRIEF_GUIDE_STORAGE_KEY = "dc-demo-brief-guide";
export const DEMO_UNIFIED_GUIDE_STORAGE_KEY = "dc-demo-unified-guide";

export type DemoGuideStep = {
  spot: string;
  extraSpots: readonly string[];
  title: string;
  body: string;
  /** Stay on this step until Next — used for the chat replay. */
  pauseAuto?: boolean;
  /** How to scroll the target into view. Last CTAs use center so the bottom bar is on screen. */
  scroll?: ScrollLogicalPosition;
};

export const DEMO_BRIEF_GUIDE_STEPS: readonly DemoGuideStep[] = [
  {
    spot: "provider-picker",
    extraSpots: [],
    title: "Switch models here",
    body: "This menu is how you compare Decision Briefs. Each model — OpenAI, Anthropic, Gemini, and xAI — wrote its own brief on the same intake. Open it and pick another name.",
  },
  {
    spot: "analysis-sections",
    extraSpots: ["lens-section"],
    title: "Then open the collapsed sections",
    body: "Risk, reversibility, and stakeholders start closed. The decision brief is open so you have something to read. Use the jump links, click a header, or Expand all.",
  },
  {
    spot: "demo-chat",
    extraSpots: [],
    title: "Then ask about the brief",
    body: "This sidebar is chat. Watch how to type in a question and see the model reply.",
    pauseAuto: true,
  },
  {
    spot: "unified-cta",
    extraSpots: [],
    title: "When you have compared multiple outputs",
    body: "Next is the Unified Brief — where the models disagreed and how Decision Copilot combines them.",
    pauseAuto: true,
    scroll: "center",
  },
];

export const DEMO_UNIFIED_GUIDE_STEPS: readonly DemoGuideStep[] = [
  {
    spot: "unified-synthesizer",
    extraSpots: [],
    title: "Choose who writes the Unified Brief",
    body: "Pick the synthesizer and authorship mode. This walkthrough uses ChatGPT under Blind, then generates the brief.",
    pauseAuto: true,
  },
  {
    spot: "unified-attribution",
    extraSpots: [],
    title: "The brief names its author",
    body: "Synthesized by ChatGPT · Blind authorship. A separate judge (Gemini here) fact-checks public claims. That disclosure is how you see who created it.",
  },
  {
    spot: "demo-chat",
    extraSpots: [],
    title: "Then ask about the brief",
    body: "This sidebar is chat. Watch how to type in a question and see the model reply.",
    pauseAuto: true,
  },
  {
    spot: "tour-end",
    extraSpots: [],
    title: "When you are ready to run your own",
    body: "That is the end of the tour. Request access at the bottom — or go back to the Decision Briefs.",
    pauseAuto: true,
    scroll: "center",
  },
];

const AUTO_MS = 7000;

type Box = { top: number; left: number; width: number; height: number };

function measure(spot: string): Box | null {
  const el = document.querySelector<HTMLElement>(`[data-demo-spot="${spot}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function applyHighlight(spots: readonly string[], on: boolean) {
  for (const spot of spots) {
    document.querySelectorAll<HTMLElement>(`[data-demo-spot="${spot}"]`).forEach((el) => {
      el.classList.toggle("demo-spot-active", on);
    });
  }
}

export function placeGuideCard(
  box: Box,
  viewport: { width: number; height: number },
  card: { width: number; height: number }
): { top: number; left: number; arrow: "up" | "down" | "right" } {
  const gap = 16;
  const margin = 16;
  const maxTop = Math.max(margin, viewport.height - card.height - margin);
  const clampTop = (top: number) => Math.min(Math.max(margin, top), maxTop);
  const clampLeft = (left: number) =>
    Math.min(Math.max(margin, left), Math.max(margin, viewport.width - card.width - margin));

  const roomLeft = box.left > card.width + 40;
  const rightHalf = box.left + box.width / 2 > viewport.width * 0.52;
  if (roomLeft && (rightHalf || box.height > 280)) {
    return {
      top: clampTop(box.top + 8),
      left: clampLeft(box.left - card.width - gap),
      arrow: "right",
    };
  }

  const left = clampLeft(box.left + box.width / 2 - card.width / 2);
  const below = box.top + box.height + gap;
  if (below + card.height <= viewport.height - margin) {
    return { top: clampTop(below), left, arrow: "up" };
  }
  return { top: clampTop(box.top - gap - card.height), left, arrow: "down" };
}

function cardStyle(box: Box, cardHeight: number): { top: number; left: number; arrow: "up" | "down" | "right" } {
  return placeGuideCard(
    box,
    { width: window.innerWidth, height: window.innerHeight },
    { width: 320, height: cardHeight }
  );
}

export function DemoBriefGuide({
  steps = DEMO_BRIEF_GUIDE_STEPS,
  storageKey = DEMO_BRIEF_GUIDE_STORAGE_KEY,
  restartLabel = "Show how to compare models",
  onSpotChange,
  onGuideState,
}: {
  steps?: readonly DemoGuideStep[];
  storageKey?: string;
  restartLabel?: string;
  onSpotChange?: (spot: string | null) => void;
  onGuideState?: (state: DemoGuideState) => void;
}) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [cardHeight, setCardHeight] = useState(240);
  const [paused, setPaused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const persistDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey, "dismissed");
    } catch {
      /* ignore */
    }
    setDismissed(true);
    onSpotChange?.(null);
  }, [onSpotChange, storageKey]);

  const restart = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setStep(0);
    setDismissed(false);
    setGeneration((g) => g + 1);
  }, [storageKey]);

  useEffect(() => {
    try {
      const parsed = parseGuideStorage(sessionStorage.getItem(storageKey), steps.length);
      setDismissed(parsed.dismissed);
      setStep(parsed.step);
    } catch {
      setDismissed(false);
      setStep(0);
    }
    setReady(true);
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (!ready || dismissed) return;
    try {
      sessionStorage.setItem(storageKey, String(step));
    } catch {
      /* ignore */
    }
  }, [ready, dismissed, step, storageKey]);

  const current = steps[step];

  useEffect(() => {
    const spot = dismissed || !current ? null : current.spot;
    onSpotChange?.(spot);
    onGuideState?.({ ready, dismissed, spot, generation });
  }, [current, dismissed, generation, onGuideState, onSpotChange, ready]);

  useEffect(() => {
    if (!ready || dismissed || !current) return;
    const spots = [current.spot, ...current.extraSpots];

    const update = () => setBox(measure(current.spot));
    update();
    const retry = window.setInterval(update, 200);
    const target = document.querySelector<HTMLElement>(`[data-demo-spot="${current.spot}"]`);
    const block = current.scroll ?? "nearest";
    target?.scrollIntoView({ block, behavior: "smooth" });
    const retryScroll = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-demo-spot="${current.spot}"]`)
        ?.scrollIntoView({ block, behavior: "smooth" });
    }, 280);

    applyHighlight(spots, true);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(retryScroll);
      applyHighlight(spots, false);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [ready, dismissed, step, current]);

  useEffect(() => {
    if (!ready || dismissed || paused || current?.pauseAuto) return;
    const id = window.setTimeout(() => {
      if (step >= steps.length - 1) persistDismiss();
      else setStep((s) => s + 1);
    }, AUTO_MS);
    return () => window.clearTimeout(id);
  }, [ready, dismissed, paused, step, persistDismiss, current, steps.length]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const height = Math.ceil(el.getBoundingClientRect().height);
    if (height > 8 && height !== cardHeight) setCardHeight(height);
  }, [current, box, cardHeight]);

  if (!ready) return null;

  if (dismissed) {
    return (
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60]">
        <button
          type="button"
          onClick={restart}
          className="pointer-events-auto rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-md hover:bg-indigo-50"
        >
          {restartLabel}
        </button>
      </div>
    );
  }

  if (!current || !box) return null;
  const pos = cardStyle(box, cardHeight);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        .demo-spot-active {
          outline: 2px solid rgb(79 70 229);
          outline-offset: 3px;
          animation: demo-spot-pulse 1.5s ease-in-out infinite;
        }
        @keyframes demo-spot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.35); }
          50% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
        }
      `}</style>
      <div
        ref={cardRef}
        role="dialog"
        aria-label={current.title}
        className="pointer-events-auto absolute w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-indigo-200 bg-white p-4 shadow-xl"
        style={{ top: pos.top, left: pos.left }}
      >
        {pos.arrow === "up" ? (
          <span
            aria-hidden
            className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-indigo-200 bg-white"
          />
        ) : pos.arrow === "down" ? (
          <span
            aria-hidden
            className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-indigo-200 bg-white"
          />
        ) : (
          <span
            aria-hidden
            className="absolute top-6 -right-2 h-4 w-4 rotate-45 border-r border-t border-indigo-200 bg-white"
          />
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
          Step {step + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-900">{current.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{current.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={persistDismiss}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (step >= steps.length - 1) persistDismiss();
                else setStep((s) => s + 1);
              }}
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              {step >= steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
