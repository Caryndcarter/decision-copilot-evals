"use client";

import { useCallback, useEffect, useState } from "react";
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
    body: "On a live run this sidebar is chat. Watch a canned question type in and the model reply — nothing is sent to an API.",
    pauseAuto: true,
  },
  {
    spot: "unified-cta",
    extraSpots: [],
    title: "When you have compared multiple outputs",
    body: "Continue to the Unified Brief to see where the models disagreed and how Decision Copilot combines them.",
  },
];

export const DEMO_UNIFIED_GUIDE_STEPS: readonly DemoGuideStep[] = [
  {
    spot: "unified-synthesizer",
    extraSpots: [],
    title: "Choose who writes the Unified Brief",
    body: "On a live run you pick the synthesizer and authorship mode. This tour selects ChatGPT under Blind — the product default — then generates the brief. You cannot change the pick here.",
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
    body: "The discuss rail works here too. This replay asks why not lock the twelve-month NOC — again, no live model call.",
    pauseAuto: true,
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

function cardStyle(box: Box): { top: number; left: number; arrow: "up" | "down" | "right" } {
  const cardW = 320;
  const gap = 16;
  const roomLeft = box.left > cardW + 40;
  const rightHalf = box.left + box.width / 2 > window.innerWidth * 0.52;
  // Tall right-rail spots (the discuss panel) should sit beside the card, not under it.
  if (roomLeft && (rightHalf || box.height > 280)) {
    return {
      top: Math.min(Math.max(16, box.top + 8), window.innerHeight - 200),
      left: box.left - cardW - gap,
      arrow: "right",
    };
  }
  const left = Math.min(Math.max(16, box.left + box.width / 2 - cardW / 2), window.innerWidth - cardW - 16);
  const below = box.top + box.height + gap;
  if (below + 200 < window.innerHeight || box.top < 180) {
    return { top: below, left, arrow: "up" };
  }
  return { top: Math.max(16, box.top - gap - 168), left, arrow: "down" };
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
  const [paused, setPaused] = useState(false);

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
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    applyHighlight(spots, true);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearInterval(retry);
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
  const pos = cardStyle(box);

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
