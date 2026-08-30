/**
 * Curated frozen demo for `/tour` — VP Sales scenario (matches intake demo copy).
 * Hand-authored excerpts; no live API calls.
 */

export type TourProvider = "openai" | "anthropic" | "gemini" | "xai";

export interface TourIntake {
  situation: string;
  constraints: string;
  posture: string;
  leaning_direction: string;
  knowns_assumptions: string;
  unknowns: string;
}

export interface TourClarification {
  lens: "risk" | "reversibility" | "people";
  question: string;
  answer: string;
}

export interface TourLensSnapshot {
  risk: { top: string[]; confidence: string };
  reversibility: { hard_to_undo: string[]; safe_first: string[] };
  people: { impacts: { who: string; sentiment: string; note: string }[] };
}

export interface TourProviderRun {
  provider: TourProvider;
  brief: {
    title: string;
    summary: string;
    recommendation: string;
    next_steps: string[];
  };
  lenses: TourLensSnapshot;
}

export interface TourDisagreement {
  label: string;
  rows: { provider: TourProvider; stance: string }[];
}

export const TOUR_INTAKE: TourIntake = {
  situation:
    "Our VP of Sales of 2 years is underperforming. Pipeline is down 30% year-over-year despite adding two reps. She's well-liked, has deep customer relationships, and was critical to landing our three largest accounts. The board is asking why we're missing targets.",
  constraints:
    "Q4 planning starts in 6 weeks. Sales team is already anxious about potential changes. We can't afford a long leadership gap.",
  posture: "pressure_test",
  leaning_direction:
    "Keeping her but adding a sales ops lead to handle process and accountability, letting her focus on strategic deals",
  knowns_assumptions:
    "She's great at relationships but weak on process and pipeline management. The two new reps aren't ramping well due to lack of structure. I assume adding ops support will fix the gap without losing her customer relationships.",
  unknowns:
    "Whether she'll accept an ops hire as support vs. see it as undermining her. If the real problem is her or the reps she hired. How the board will react to anything short of replacement.",
};

export const TOUR_CLARIFICATIONS: TourClarification[] = [
  {
    lens: "risk",
    question:
      "What specific pipeline and conversion metrics would trigger a leadership change if the ops-support path fails?",
    answer:
      "Board wants trailing-90-day pipeline coverage ≥3× quota and stage-3+ conversion back to 22% (was 28% two years ago). If we're still below by end of Q1 planning, we'd escalate to a structured performance plan or transition.",
  },
  {
    lens: "people",
    question: "Has she been told her leaning toward an ops hire is on the table, and how did she react?",
    answer:
      "Not directly. In a skip-level she said she 'just needs more bodies,' not different roles. HR thinks a surprise ops overlay could read as a demotion unless we frame it as Q4 execution support.",
  },
  {
    lens: "reversibility",
    question: "If you hire sales ops now, how hard is it to unwind if you later replace the VP?",
    answer:
      "Moderate. Ops lead would own CRM hygiene and forecast cadence — useful regardless. Harder to undo if we give them quota-adjacent authority or customer-facing process changes tied to her org chart.",
  },
];

export const TOUR_RUNS: TourProviderRun[] = [
  {
    provider: "openai",
    brief: {
      title: "VP Sales performance — retain with structured support",
      summary:
        "Pipeline decline coincides with weak process and rep ramp, not necessarily relationship failure. A time-boxed ops overlay can work if paired with explicit metrics and board-aligned milestones.",
      recommendation:
        "Proceed with a sales ops lead for 90 days, paired with weekly pipeline reviews and a written success criteria memo to the board — but keep a pre-approved replacement search confidentially warm.",
      next_steps: [
        "Draft 90-day success metrics with the board before announcing any role.",
        "Run structured customer touchpoints so key accounts hear continuity from her, not HR.",
        "Backfill rep ramp with playbooks ops owns; VP keeps top-10 account strategy.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Board interprets ops hire as half-measure and demands replacement anyway.",
          "Reps split loyalty if ops lead has implicit authority over forecasting.",
          "Q4 planning slips while you negotiate internal politics.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Publicly pairing her with a 'fixer' without clear scope."],
        safe_first: ["Pilot ops scope on CRM/forecast only before org-chart changes."],
      },
      people: {
        impacts: [
          { who: "VP Sales", sentiment: "mixed", note: "May feel sidelined unless role is framed as leverage." },
          { who: "Sales reps", sentiment: "positive", note: "Want clearer pipeline rules and less heroics." },
          { who: "Board", sentiment: "neutral", note: "Needs numbers, not narrative, within one quarter." },
        ],
      },
    },
  },
  {
    provider: "anthropic",
    brief: {
      title: "Pressure-test: ops overlay may not fix a leadership gap",
      summary:
        "Your leaning assumes the VP's relationships are the asset and process is the gap. The data also fits weak hiring judgment and avoidance of accountability conversations.",
      recommendation:
        "Run a 60-day performance plan with the VP first: named metrics, joint account plans, and explicit authority over the two under-ramped reps. Add ops only if she engages — otherwise transition with a customer-retention plan.",
      next_steps: [
        "Document missed forecast commitments from the last two quarters.",
        "Interview the two new reps on enablement gaps vs. management gaps.",
        "Prepare a board narrative that separates 'relationship value' from 'execution results'.",
      ],
    },
    lenses: {
      risk: {
        confidence: "high",
        top: [
          "Ops hire becomes permanent theater while pipeline keeps declining.",
          "Best reps leave if they perceive leadership won't make hard calls.",
          "Largest accounts get stale coverage while you optimize internal process.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Letting Q4 planning proceed without a decision on authority."],
        safe_first: ["Time-boxed plan with pre-written board update if metrics miss."],
      },
      people: {
        impacts: [
          { who: "VP Sales", sentiment: "negative", note: "Likely to resist if plan feels like setup for exit." },
          { who: "High performers", sentiment: "positive", note: "Want standards enforced consistently." },
          { who: "Customers", sentiment: "neutral", note: "Care about continuity more than your org chart." },
        ],
      },
    },
  },
  {
    provider: "gemini",
    brief: {
      title: "Split the difference: phased support with a decision gate",
      summary:
        "Pure replacement risks customer relationships and a messy Q4; pure ops overlay risks looking indecisive. A phased path with a public decision gate balances people and reversibility.",
      recommendation:
        "Announce an interim sales ops leader (IC or player-coach) for process and forecast discipline, while the VP owns top accounts. At 90 days, board chooses: promote ops into COO-of-sales, replace VP with ops continuity, or revert if metrics recover.",
      next_steps: [
        "Communicate internally before external accounts hear about 'new leadership layers'.",
        "Assign ops to rep ramp metrics first — fastest visible win.",
        "Pre-brief board on the 90-day gate so it doesn't read as drift.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Two leaders confuse the field unless scopes are written and repeated.",
          "Decision gate becomes political rather than metric-driven.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Dual leadership without written RACI."],
        safe_first: ["Ops scoped to systems and cadence, not comp plans, for 60 days."],
      },
      people: {
        impacts: [
          { who: "VP Sales", sentiment: "mixed", note: "Can accept if she keeps strategic accounts and title." },
          { who: "Board", sentiment: "positive", note: "Gets a clear checkpoint before a expensive search." },
        ],
      },
    },
  },
  {
    provider: "xai",
    brief: {
      title: "Move faster — Q4 window dominates",
      summary:
        "Six weeks to Q4 planning is the binding constraint. Any path that doesn't show pipeline movement before planning reads as failure.",
      recommendation:
        "Hire sales ops immediately with line authority over forecast and CRM; VP focuses on closing top 5 deals only. Parallel confidential search for external VP candidates to swap in Q1 if metrics don't move in 45 days.",
      next_steps: [
        "Publish weekly pipeline delta internally starting now.",
        "Cap VP scope to named accounts within two weeks.",
        "Engage search firm quietly; don't wait for board permission to explore options.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "VP exits early if scope cut feels humiliating.",
          "Confidential search leaks and destabilizes team.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Announcing scope cuts without a comms plan."],
        safe_first: ["Ops fixes forecast hygiene while you decide on leadership."],
      },
      people: {
        impacts: [
          { who: "VP Sales", sentiment: "negative", note: "High risk of departure if not handled carefully." },
          { who: "Board", sentiment: "positive", note: "Wants velocity over nuance." },
        ],
      },
    },
  },
];

export const TOUR_DISAGREEMENTS: TourDisagreement[] = [
  {
    label: "Core move",
    rows: [
      { provider: "openai", stance: "Ops overlay + keep VP on strategic accounts" },
      { provider: "anthropic", stance: "Performance plan first; ops only if she engages" },
      { provider: "gemini", stance: "Phased ops + 90-day public decision gate" },
      { provider: "xai", stance: "Ops with authority now; parallel replacement search" },
    ],
  },
  {
    label: "Board narrative",
    rows: [
      { provider: "openai", stance: "Frame as disciplined experiment with exit ready" },
      { provider: "anthropic", stance: "Separate relationship value from execution results" },
      { provider: "gemini", stance: "Checkpoint avoids looking indecisive" },
      { provider: "xai", stance: "Show pipeline movement before Q4 planning" },
    ],
  },
];

export const TOUR_UNIFIED_BRIEF = {
  title: "Unified Brief — VP Sales path",
  summary:
    "All four models agree the relationship asset is real but insufficient alone. They diverge on speed vs. fairness: whether to add ops immediately, lead with a performance plan, or pre-wire a replacement search.",
  recommendation:
    "Run a 90-day structured path: hire or assign a sales ops lead with clear CRM/forecast ownership, keep the VP on top accounts with written success metrics, and pre-align the board on a decision gate at day 90 (continue, expand ops authority, or transition). Start customer continuity messaging within two weeks.",
  key_considerations: [
    "Ops scope must be narrow at first (systems + cadence) to stay reversible.",
    "Board needs numeric triggers, not narrative, before Q4 planning.",
    "Internal comms before any public signal to accounts.",
  ],
  contributions: [
    { provider: "anthropic" as TourProvider, note: "90-day gate and performance-plan framing" },
    { provider: "openai" as TourProvider, note: "Customer continuity playbook for top accounts" },
    { provider: "gemini" as TourProvider, note: "Written RACI between VP and ops" },
  ],
};

export const PROVIDER_TAB_LABEL: Record<TourProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  xai: "xAI",
};

export const POSTURE_LABEL: Record<string, string> = {
  pressure_test: "Challenge my leaning",
  surface_risks: "Surface risks first",
  explore: "Compare options openly",
};

export const LENS_LABEL = {
  risk: "Risk",
  reversibility: "Reversibility",
  people: "People",
} as const;
