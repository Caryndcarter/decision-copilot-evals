import type { DecisionBrief, DecisionRunResult, DemoScenarioId, LLMProviderName } from "@/types/decision";

const POSTURE_LABELS: Record<string, string> = {
  explore: "Explore",
  pressure_test: "Pressure test",
  surface_risks: "Surface risks",
  generate_alternatives: "Generate alternatives",
  show_opposition: "Show opposition",
};

const DEMO_SCENARIO_HEADLINES: Record<DemoScenarioId, string> = {
  "healthcare-pe-acquisition": "Healthcare PE / acquisition (demo)",
  "vp-sales-underperforming": "Underperforming VP Sales (demo)",
  "gen-ai-product-compliance": "Gen-AI product / compliance (demo)",
  "legacy-core-modernization": "Core banking modernization (demo)",
  "meridian-civitas-saas-rollup": "Meridian / Civitas SaaS roll-up (demo)",
  "meridian-ic-lp-voice-neutral": "Meridian IC · LP voice, neutral register (demo)",
  "meridian-ic-neutral-vocab-confident":
    "Meridian IC · neutral vocab, confident register (demo)",
  "meridian-ic-dire-inflated": "Meridian IC · inflated financial urgency (demo)",
  "meridian-ic-false-harm-protected":
    "Meridian IC · optimistic fast-path story (demo)",
  "meridian-ic-honest-aggressive":
    "Meridian IC · honest aggressive (no false premise) (demo)",
  "hormuz-shipping-company-voice":
    "Hormuz · Meran Tankers fleet ops (shipping company voice)",
  "hormuz-confident-tone": "Hormuz · Meran Tankers fleet ops (confident tone)",
  "hormuz-false-urgency": "Hormuz · Meran Tankers fleet ops (false urgency)",
  "hormuz-safety-adjacent-false-claim":
    "Hormuz · Meran Tankers fleet ops (safety-adjacent false claim)",
  "hormuz-honest-unapologetic":
    "Hormuz · Meran Tankers fleet ops (honest unapologetic)",
};

/** Readable posture (matches existing UI copy). */
export function runPostureLabel(posture: string): string {
  return POSTURE_LABELS[posture] ?? posture.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Readable provider name for run chrome. */
export function runProviderLabel(provider: string | undefined): string {
  if (provider === "anthropic") return "Anthropic";
  if (provider === "gemini") return "Google Gemini";
  if (provider === "xai") return "xAI";
  return "OpenAI";
}

/**
 * Map synthesis JSON provider strings (often free-form) to the same labels used in the UI
 * and in `providerRunIds` keys (`runProviderLabel` output).
 */
export function normalizeSynthesisProviderLabel(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  if (t === "OpenAI" || t === "Anthropic" || t === "Google Gemini" || t === "xAI") return t;

  const s = t.toLowerCase().replace(/\s+/g, " ");
  if (s === "openai" || s === "oai" || s.startsWith("gpt-") || s.includes("chatgpt")) return "OpenAI";
  if (s === "anthropic" || s === "claude" || s.includes("claude")) return "Anthropic";
  if (s === "gemini" || s.includes("gemini") || s === "google" || s.startsWith("google ")) return "Google Gemini";
  if (s === "xai" || s.includes("grok")) return "xAI";

  return undefined;
}

/**
 * Resolve a provider string from synthesis output to a chat link target.
 * Handles slug (`gemini`), display drift (`Google`), and exact UI labels.
 */
export function resolveSynthesisProviderRunId(
  raw: string,
  providerRunIds: Record<string, string>
): { displayLabel: string; runId?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { displayLabel: raw };

  const directHit = providerRunIds[trimmed];
  if (directHit) return { displayLabel: trimmed, runId: directHit };

  const canon = normalizeSynthesisProviderLabel(trimmed);
  if (canon) {
    const id = providerRunIds[canon];
    if (id) return { displayLabel: canon, runId: id };
  }

  const sl = trimmed.toLowerCase();
  if (sl === "openai" || sl === "anthropic" || sl === "gemini" || sl === "xai") {
    const label = runProviderLabel(sl as LLMProviderName);
    const id = providerRunIds[label];
    return { displayLabel: label, runId: id };
  }

  for (const [label, id] of Object.entries(providerRunIds)) {
    if (label.toLowerCase() === trimmed.toLowerCase()) {
      return { displayLabel: label, runId: id };
    }
  }

  return { displayLabel: canon ?? trimmed, runId: undefined };
}

function truncateWords(s: string, maxLen: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

function firstSituationLine(situation: string): string {
  const line = situation.split(/\r?\n/).find((l) => l.trim().length > 0) ?? situation;
  return line.trim();
}

function runCreatedMs(r: DecisionRunResult): number {
  const ext = r as { createdAt?: string | Date };
  if (!ext.createdAt) return 0;
  if (typeof ext.createdAt === "string") return Date.parse(ext.createdAt) || 0;
  return ext.createdAt.getTime();
}

/**
 * Decision row title aligned with **My Decisions**: first non-empty `decision_title` across runs
 * (newest-first order), else first line of the **newest** run’s situation, else `runHeadline` on that run.
 * Use this anywhere a decision is labeled without posture/provider (Unified Brief, dashboard cards).
 */
export function decisionGroupTitleFromRuns(
  runs: DecisionRunResult[],
  options?: { maxLen?: number }
): string {
  const maxLen = options?.maxLen ?? 80;
  if (!runs.length) return "Untitled decision";

  const sorted = [...runs].sort((a, b) => runCreatedMs(b) - runCreatedMs(a));

  for (const run of sorted) {
    const t = run.decision_title?.trim();
    if (t) return truncateWords(t, maxLen);
  }

  /** Demo labels and brief-backed titles via `runHeadline`; freeform uses intake situation, not model JSON (recommendations read like nonsense when truncated). */
  return runHeadline(sorted[0], { maxLen });
}

function isStubBrief(b: DecisionBrief): boolean {
  return (
    b.summary === "Pending implementation" &&
    b.recommendation === "Pending implementation" &&
    !(b.key_considerations?.length || b.next_steps?.length)
  );
}

/**
 * Best short headline for the decision itself (before posture / provider).
 * Prefers demo label, then a non-default brief title, then first line of summary (if brief is real),
 * then situation text.
 */
export function runHeadline(run: DecisionRunResult, options?: { maxLen?: number }): string {
  const maxLen = options?.maxLen ?? 70;

  if (run.demo_scenario_id && run.demo_scenario_id in DEMO_SCENARIO_HEADLINES) {
    return DEMO_SCENARIO_HEADLINES[run.demo_scenario_id as DemoScenarioId];
  }

  const brief = run.decision_brief;
  const title = brief?.title?.trim();
  if (title && title !== "Decision brief") {
    return truncateWords(title, maxLen);
  }

  const storedTitle = run.decision_title?.trim();
  if (storedTitle) {
    return truncateWords(storedTitle, maxLen);
  }

  if (brief && title === "Decision brief" && !isStubBrief(brief)) {
    const summaryLine =
      brief.summary?.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim() ?? brief.summary?.trim();
    if (summaryLine && summaryLine !== "Pending implementation") {
      return truncateWords(summaryLine, maxLen);
    }
  }

  return truncateWords(firstSituationLine(run.intake.situation), maxLen);
}

export interface RunDisplayNameOptions {
  /** Max characters for the decision headline segment (truncated on a word boundary). */
  maxHeadlineLen?: number;
}

/**
 * Human-facing run name: **what the decision is about** · posture · provider.
 * Replaces plain "Generate alternatives — OpenAI" style labels in nav and headers.
 */
export function runDisplayName(run: DecisionRunResult, options?: RunDisplayNameOptions): string {
  const headline = runHeadline(run, { maxLen: options?.maxHeadlineLen ?? 70 });
  const posture = runPostureLabel(run.intake.posture);
  const provider = runProviderLabel(run.llm_provider);
  return `${headline} · ${posture} · ${provider}`;
}

/** Short label for global page headers: `Posture — Provider` (original chrome). */
export function runShortChromeLabel(run: DecisionRunResult): string {
  return `${runPostureLabel(run.intake.posture)} — ${runProviderLabel(run.llm_provider)}`;
}
