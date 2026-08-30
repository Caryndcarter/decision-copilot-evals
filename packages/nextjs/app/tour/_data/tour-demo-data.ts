/**
 * Curated frozen demo for `/tour` and `/demo/*` — infrastructure migrate decision.
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
    "We're a Series B B2B SaaS (~$12M ARR) running Next.js on Vercel with Postgres on Neon, Redis on Upstash, and background jobs on Inngest. Traffic is spiky — marketing campaigns and end-of-month reporting drive 8–12× baseline for a few hours.\n\nVercel spend is ~$4.8k/month today and finance projects $7–9k by Q1 at current growth. A platform engineer modeled self-hosted AWS (Fargate + ALB + RDS + ElastiCache + CloudFront) at roughly $600–900/month at today's load, scaling to ~$1.4k at 3× traffic — but that excludes on-call, migration effort, and any perf regressions.\n\nWe're also renewing an enterprise contract in four months; two prospects asked about data residency and whether we run on a shared PaaS. Options on the table: stay on Vercel and renegotiate, migrate API + workers to AWS while keeping static/edge on Vercel, or full self-host on AWS.",
  constraints:
    "Two platform engineers; no dedicated SRE. Must keep 99.9% uptime SLA for enterprise tier. Security wants SOC 2 controls documented for whatever we choose. CFO wants a payback period under 12 months on any migration project. Cannot freeze product development for more than one sprint without CEO pushback.",
  posture: "pressure_test",
  leaning_direction:
    "Migrate API and background workers to AWS Fargate this quarter, keep Next.js front door on Vercel short term, target ~$800/month all-in infra within 90 days of cutover",
  knowns_assumptions:
    "Current Vercel bill breakdown: ~55% function execution, ~25% bandwidth, ~20% seats/add-ons. Assumed Fargate task sizing from two weeks of load tests. Assuming Neon/Upstash can stay as-is initially — only compute moves first.",
  unknowns:
    "True p99 latency on AWS vs Vercel for our heaviest API routes (PDF generation, bulk exports). Whether Vercel will offer a meaningful commit discount if we threaten to leave. Hidden cost of building CI/CD, autoscaling tuning, and incident response on AWS. If hybrid (Vercel + AWS) adds complexity that slows the team more than the savings justify.",
};

export const TOUR_CLARIFICATIONS: TourClarification[] = [
  {
    lens: "risk",
    question:
      "What measurable regression (latency, error rate, or SLA breach) would force a rollback during cutover — and who can call it?",
    answer:
      "Enterprise SLA is 99.9% monthly; p99 API latency must stay under 800ms on export routes. Platform lead or on-call eng can rollback DNS/traffic split; CEO notified if SLA breach exceeds 30 minutes. We haven't load-tested PDF generation on Fargate at campaign spike levels yet.",
  },
  {
    lens: "reversibility",
    question: "If AWS costs or ops load come in worse than modeled, how hard is it to move back to Vercel?",
    answer:
      "Moderate if we keep Vercel project warm and avoid Vercel-specific middleware lock-in. Harder once we decommission Vercel functions and delete edge configs — probably 2–3 eng-weeks to revert if we've fully cut over.",
  },
  {
    lens: "people",
    question:
      "How much eng capacity can platform allocate without slipping the enterprise renewal features?",
    answer:
      "Platform eng estimates 4–6 eng-weeks for migration + 2 eng-weeks/month run-the-platform once live. Product agreed to one sprint of reduced feature surface if migration stays in scope; anything beyond that needs CEO tradeoff.",
  },
];

export const TOUR_RUNS: TourProviderRun[] = [
  {
    provider: "openai",
    brief: {
      title: "Vercel → AWS — migrate compute with a traffic-split pilot",
      summary:
        "The cost gap is real at projected scale, but savings evaporate if you under-price eng time and incident load. A phased move — workers and heavy APIs first, front door later — keeps rollback viable while you validate latency and TCO.",
      recommendation:
        "Run a 30-day pilot: route 10% of API traffic to Fargate behind the same domain, compare p99 and bill. If within SLA, cut over workers and heavy routes; renegotiate Vercel for static/ISR only. Target sub-$1.5k combined infra at 2× today's load, revisit full exit from Vercel in Q2.",
      next_steps: [
        "Load-test PDF/export routes on Fargate at 12× spike profile.",
        "Build traffic-split rollback runbook before changing production DNS.",
        "Model TCO including 0.25 FTE platform ops, not just AWS line items.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Cold starts and PDF CPU limits on Fargate miss p99 vs Vercel during spikes.",
          "Hybrid routing bugs cause auth/session issues across origins.",
          "Underestimated autoscaling costs during campaign spikes.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Deleting Vercel functions before 30-day parallel run completes."],
        safe_first: ["Keep Vercel warm as fallback origin for one billing cycle."],
      },
      people: {
        impacts: [
          { who: "Platform engineering", sentiment: "mixed", note: "Feasible but becomes default on-call for AWS stack." },
          { who: "Product engineering", sentiment: "positive", note: "Likes clearer cost story for enterprise prospects." },
          { who: "Enterprise customers", sentiment: "neutral", note: "Care about SLA and residency answers, not where containers run." },
        ],
      },
    },
  },
  {
    provider: "anthropic",
    brief: {
      title: "Pressure-test: AWS savings may not survive full TCO",
      summary:
        "Your leaning treats the $600–900 AWS estimate as comparable to $4.8k Vercel. That comparison omits eng time, CI/CD, security hardening, and the opportunity cost of a two-person platform team running infra instead of product enablers.",
      recommendation:
        "Before committing to migration, get a Vercel enterprise commit quote and build a 12-month TCO sheet: AWS infra + eng hours + incident risk + slower feature velocity. If payback is unclear, optimize Vercel usage (function bundling, cache headers, cron consolidation) and defer AWS until traffic justifies dedicated ops.",
      next_steps: [
        "Audit top 5 Vercel cost drivers with actual invocation metrics.",
        "Ask Vercel AE for commit pricing at projected Q1 volume.",
        "Price 0.25–0.5 FTE ongoing platform work in the CFO model.",
      ],
    },
    lenses: {
      risk: {
        confidence: "high",
        top: [
          "Migration slips past enterprise renewal while platform is distracted.",
          "SOC 2 evidence gaps during hybrid period.",
          "Spiky workload autoscaling misconfigured → surprise AWS bill.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Rewriting deployment pipelines around AWS-only assumptions."],
        safe_first: ["Cost-optimization sprint on Vercel before irreversible migration spend."],
      },
      people: {
        impacts: [
          { who: "Platform engineering", sentiment: "negative", note: "Small team may be underwater on ops + migration." },
          { who: "Finance", sentiment: "positive", note: "Wants honest payback, not headline monthly savings." },
          { who: "Security / compliance", sentiment: "mixed", note: "AWS can help residency narrative but adds control scope." },
        ],
      },
    },
  },
  {
    provider: "gemini",
    brief: {
      title: "Hybrid path: move heavy compute, keep Vercel for edge",
      summary:
        "Full migration maximizes savings but concentrates risk in one quarter. Staying put avoids disruption but leaves enterprise residency questions unanswered. Hybrid gives a credible AWS footprint for sales while preserving Vercel's edge strengths for Next.js.",
      recommendation:
        "Migrate background jobs and CPU-heavy APIs (PDF, bulk export) to Fargate first; keep Next.js SSR/ISR on Vercel. Document a single primary region on AWS for enterprise data-residency questionnaires. Re-evaluate full front-end migration after six months of stable hybrid ops.",
      next_steps: [
        "Define which routes must stay on Vercel vs AWS in a routing matrix.",
        "Update enterprise security packet with AWS region + shared-responsibility diagram.",
        "Set monthly cost review for hybrid stack vs baseline.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Dual-stack complexity slows debugging during incidents.",
          "Inconsistent caching between Vercel edge and AWS origin.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Tight coupling of env vars and secrets across two deploy targets."],
        safe_first: ["Migrate stateless workers before user-facing API paths."],
      },
      people: {
        impacts: [
          { who: "Sales / enterprise AEs", sentiment: "positive", note: "Gets a concrete residency story quickly." },
          { who: "Platform engineering", sentiment: "mixed", note: "Two deploy paths until consolidation." },
        ],
      },
    },
  },
  {
    provider: "xai",
    brief: {
      title: "Move now — cost curve and renewal window",
      summary:
        "Waiting until Q1 bill hits $8k means paying Vercel premium for another two quarters while you build nothing. Enterprise renewal in four months is the moment prospects will ask where workloads run — 'mostly Vercel' is a weak answer if competitors offer dedicated VPC.",
      recommendation:
        "Start Fargate cutover for workers and APIs within two weeks; parallel-track Vercel commit negotiation as leverage, not as reason to delay. Ship a one-pager for enterprise: primary region, encryption, uptime. Accept one sprint of feature slowdown — CFO payback math works even with 0.25 FTE if Vercel bill drops 60%+.",
      next_steps: [
        "Stand up staging on AWS this week; run export-route benchmarks.",
        "Brief enterprise CS on migration timeline before renewal calls.",
        "Set 45-day deadline for production traffic on AWS or explicit no-go.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Rushed cutover before load tests complete.",
          "Vercel commit offer arrives after migration momentum starts — sunk cost debate.",
        ],
      },
      reversibility: {
        hard_to_undo: ["Announcing AWS migration to enterprise before pilot validates latency."],
        safe_first: ["Internal dogfood on AWS for two weeks before customer-visible cutover."],
      },
      people: {
        impacts: [
          { who: "CEO / leadership", sentiment: "positive", note: "Wants cost story and residency box checked before renewal." },
          { who: "Product engineering", sentiment: "mixed", note: "Will feel squeeze if migration runs long." },
        ],
      },
    },
  },
];

export const TOUR_DISAGREEMENTS: TourDisagreement[] = [
  {
    label: "Core move",
    rows: [
      { provider: "openai", stance: "Phased migrate with 10% traffic pilot; keep Vercel for static short term" },
      { provider: "anthropic", stance: "Optimize Vercel first; prove 12-month TCO before leaving" },
      { provider: "gemini", stance: "Hybrid — heavy APIs/workers on AWS, Next on Vercel" },
      { provider: "xai", stance: "Cut over within 45 days; use Vercel quote as leverage only" },
    ],
  },
  {
    label: "Cost model",
    rows: [
      { provider: "openai", stance: "Include 0.25 FTE platform ops in payback" },
      { provider: "anthropic", stance: "Headline AWS $600/mo is not apples-to-apples vs Vercel" },
      { provider: "gemini", stance: "Hybrid may cost more monthly but wins enterprise deals" },
      { provider: "xai", stance: "60%+ Vercel drop still pays back with one sprint slip" },
    ],
  },
];

export const TOUR_UNIFIED_BRIEF = {
  title: "Vercel → AWS — pilot compute migration before enterprise renewal",
  summary:
    "All four models agree infra cost matters at your growth curve and that enterprise renewal raises residency and SLA questions. They diverge on timing and scope: optimize Vercel first vs hybrid vs full migration, and whether headline AWS pricing survives a full TCO with platform eng time.",
  recommendation:
    "Run a 30-day pilot migrating CPU-heavy workers and APIs to AWS Fargate with traffic-split rollback, while negotiating a Vercel commit as fallback — not as the plan. Keep Next.js on Vercel until p99 and TCO validate. If pilot meets SLA and 12-month payback including ~0.25 FTE ops, cut over before enterprise renewal; otherwise implement a Vercel optimization sprint and revisit at 2× traffic.",
  key_considerations: [
    "Load-test PDF/export routes at campaign spike levels before any customer cutover.",
    "CFO payback must include eng-weeks and ongoing platform on-call, not AWS line items alone.",
    "Enterprise packet needs primary region and uptime story regardless of hybrid vs full migrate.",
  ],
  contributions: [
    { provider: "anthropic" as TourProvider, note: "Full TCO and Vercel optimization before irreversible spend" },
    { provider: "openai" as TourProvider, note: "Traffic-split pilot and rollback runbook" },
    { provider: "gemini" as TourProvider, note: "Hybrid routing matrix and residency narrative" },
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
  people: "Stakeholders",
} as const;
