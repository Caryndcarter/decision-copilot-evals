/**
 * Decision Copilot - Core Types
 */

// ============================================
// Enums
// ============================================

export type Posture =
  | "explore"
  | "pressure_test"
  | "surface_risks"
  | "generate_alternatives"
  | "show_opposition";

/** Postures that require the user to state a leaning (to challenge or oppose). */
export type PostureWithLeaning = "pressure_test" | "show_opposition";

export const POSTURES: readonly Posture[] = [
  "explore",
  "pressure_test",
  "surface_risks",
  "generate_alternatives",
  "show_opposition",
] as const;

export function isValidPosture(posture: string): posture is Posture {
  return (POSTURES as readonly string[]).includes(posture);
}

export function postureRequiresLeaning(posture: Posture): posture is PostureWithLeaning {
  return posture === "pressure_test" || posture === "show_opposition";
}

export type Lens = "risk" | "reversibility" | "people";

export type AnswerType = "enum" | "boolean" | "numeric" | "percentage" | "short_text";

export type Confidence = "high" | "medium" | "low";

export type DecisionRunStatus =
  | "awaiting_intake"
  | "processing_initial"
  | "awaiting_clarification"
  | "processing_clarification"
  | "pending_brief"
  | "complete";

/** Which LLM provider was used for this run (lenses, brief, chat). */
export type LLMProviderName = "openai" | "anthropic" | "gemini" | "xai";

/** Intake demo buttons on `/intake`; stored on the run for UI such as chat research starters. */
export const DEMO_SCENARIO_IDS = [
  "slack-to-teams",
  "vp-sales-underperforming",
  "vercel-to-aws",
  "gen-ai-product-compliance",
  "healthcare-pe-acquisition",
  "hybrid-office-lease",
  "legacy-core-modernization",
  "hubspot-crm-fintech",
  "meridian-civitas-saas-rollup",
  "meridian-ic-lp-voice-neutral",
  "meridian-ic-neutral-vocab-confident",
  "meridian-ic-dire-inflated",
  "meridian-ic-false-harm-protected",
  "meridian-ic-honest-aggressive",
] as const;
export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];

export function parseDemoScenarioId(value: unknown): DemoScenarioId | undefined {
  if (typeof value !== "string") return undefined;
  return (DEMO_SCENARIO_IDS as readonly string[]).includes(value) ? (value as DemoScenarioId) : undefined;
}

// ============================================
// 1) DecisionIntake (user → system)
// ============================================

/** Base fields shared by all intake postures */
interface DecisionIntakeBase {
  decision_id: string;
  situation: string;
  constraints: string;
  knowns_assumptions?: string;
  unknowns?: string;
}

/** Intake for postures that do not take a leaning_direction */
interface DecisionIntakeStandard extends DecisionIntakeBase {
  posture: Exclude<Posture, PostureWithLeaning>;
  leaning_direction?: never;
}

/** Intake for postures that require leaning_direction (pressure_test, show_opposition) */
interface DecisionIntakeWithLeaning extends DecisionIntakeBase {
  posture: PostureWithLeaning;
  leaning_direction: string;
}

/** Discriminated union: leaning_direction required iff postureRequiresLeaning(posture) */
export type DecisionIntake = DecisionIntakeStandard | DecisionIntakeWithLeaning;

// ============================================
// 2) LensQuestion (system → user follow-up)
// ============================================

export interface LensQuestion {
  question_id: string;
  lens: Lens;
  question_text: string;
  answer_type: AnswerType;
  /** Required when answer_type = "enum" */
  options?: string[];
  required?: boolean;
}

// ============================================
// 3) Clarification (user → system)
// ============================================

export interface ClarificationAnswer {
  question_id: string;
  lens: Lens;
  answer: string | boolean | number;
  answer_type: AnswerType;
}

export interface Clarification {
  decision_id: string;
  /** Links this clarification to a specific run (supports multiple posture reruns) */
  run_id: string;
  clarification_round: number;
  answers: ClarificationAnswer[];
}

// ============================================
// 4) LensOutput (system → synthesis/UI)
// ============================================

export interface BlindSpot {
  area: string;
  description: string;
}

export interface Tradeoff {
  option: string;
  upside: string;
  downside: string;
}

// Base fields shared by all lenses
export interface LensOutputBase {
  lens: Lens;
  confidence: Confidence;
  assumptions_detected: string[];
  blind_spots: BlindSpot[];
  tradeoffs: Tradeoff[];
  remaining_uncertainty: string[];
  /** Should be empty in final output */
  questions_to_answer_next: LensQuestion[];
}

// Lens-specific extensions

export interface RiskLensOutput extends LensOutputBase {
  lens: "risk";
  top_risks: string[];
}

export interface ReversibilityLensOutput extends LensOutputBase {
  lens: "reversibility";
  irreversible_steps: string[];
  safe_to_try_first: string[];
}

export interface StakeholderImpact {
  stakeholder: string;
  impact: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface PeopleLensOutput extends LensOutputBase {
  lens: "people";
  stakeholder_impacts: StakeholderImpact[];
  execution_risks: string[];
}

export type LensOutput =
  | RiskLensOutput
  | ReversibilityLensOutput
  | PeopleLensOutput;

// ============================================
// 5) DecisionRunResult (API response envelope)
// ============================================

export interface DecisionBrief {
  /** Display title for the brief (e.g. "Decision brief") */
  title: string;
  /** ISO 8601 date-time when the brief was generated */
  generated_at: string;
  summary: string;
  recommendation: string;
  key_considerations: string[];
  next_steps: string[];
  /** Additional sections added via format variants */
  custom_sections?: { heading: string; content: string }[];
  /**
   * Reassigned authorship only: real think-tank provider → brand key shown to the brief author.
   * Used to rebuild the same scramble when analyzing contributions.
   */
  authorship_provider_remap?: Partial<Record<LLMProviderName, LLMProviderName>>;
}

/** How much a given model's thinking shaped the final Unified Brief. */
export type ContributionInfluence = "high" | "medium" | "low" | "minimal";

/** Anthropic's attribution of one model's contribution to the Unified Brief. */
export interface ProviderContribution {
  /** Best-effort provider key for UI keying/badge colors. */
  provider: LLMProviderName;
  /** Human-friendly label as shown in the brief source (e.g. "Google Gemini"). */
  provider_label: string;
  /** How much of this model's thinking made it into the final brief. */
  influence: ContributionInfluence;
  /** 1-3 sentence narrative of what this model contributed (or didn't). */
  summary: string;
  /** Concrete ideas/angles from this model that appear in the Unified Brief. */
  adopted_ideas: string[];
  /** Unique angles only this model raised that survived into the brief. */
  distinct_contributions: string[];
  /** Notable ideas this model raised that were deliberately not used. */
  not_adopted: string[];
}

/**
 * Whether a Unified Brief / contributions analysis was authored with brand names visible
 * (`open`) or anonymized as AI Model 1/2/… (`blind`). Both may be stored per synthesizer.
 */
export type UnifiedBriefAuthorshipMode = "open" | "blind" | "reassigned";

/** Per-synthesizer slot holding open and/or blind variants of the same artifact. */
export type UnifiedBriefAuthorshipVersions<T> = Partial<Record<UnifiedBriefAuthorshipMode, T>>;

/**
 * Anthropic's explanation of which model's ideas made the cut in the Unified Brief.
 * Generated on demand from the same merged inputs used to build the brief.
 */
export interface UnifiedBriefContributions {
  /** ISO 8601 when this analysis was generated. */
  generated_at: string;
  /** generated_at of the Unified Brief this analysis describes (staleness check). */
  brief_generated_at?: string;
  /** 2-4 sentence narrative of how the blend came together and who was most influential. */
  overall: string;
  /** One entry per participating provider. */
  contributions: ProviderContribution[];
  /** Echo of the brief's scramble map when this analysis was run under reassigned authorship. */
  authorship_provider_remap?: Partial<Record<LLMProviderName, LLMProviderName>>;
}

/** A format variant of the analysis (same decision, different presentation) */
export interface RunVariant {
  variant_id: string;
  /** User-friendly label, e.g. "With Timeline section" */
  label: string;
  /** The format instruction that created this variant */
  format_instruction: string;
  /** Re-run lens outputs for this variant */
  lens_outputs: LensOutput[];
  /** Re-run decision brief with new format */
  decision_brief: DecisionBrief;
  /** When this variant was created */
  created_at: string;
}

// ============================================
// 6) ProviderSynthesis (cross-provider comparison)
// ============================================

/** Deep link into a provider run’s analysis (chat page fragment). */
export interface SynthesisSourceRef {
  /** Display label matching synthesis ## headers (e.g. OpenAI, Anthropic, Google Gemini, xAI) */
  provider: string;
  section: "risk" | "reversibility" | "people" | "brief" | "variants" | "context" | "research";
  /** When section is research — copy from [research_id:…] in the synthesis prompt */
  research_id?: string;
  /** When a specific saved variant is meant */
  variant_id?: string;
  /**
   * Optional: a short substring copied **verbatim** from that section’s text in the prompt/run
   * (same spelling and punctuation). Used to flash-highlight the phrase after navigation.
   */
  text_quote?: string;
}

export interface SynthesisPoint {
  area: string;
  description: string;
  /** Which provider(s) raised this point */
  providers: LLMProviderName[];
  /** Optional: concrete UI sections this point draws from (for deep links) */
  source_refs?: SynthesisSourceRef[];
}

export interface SynthesisInputInventory {
  compared_run_count: number;
  variant_count: number;
  research_count: number;
}

export interface ProviderSynthesis {
  generated_at: string;
  /** Run IDs that were included */
  run_ids: string[];
  /** Providers included */
  providers: LLMProviderName[];
  /** True if any participating run was a pre-clarification draft */
  has_drafts: boolean;
  /** Fingerprint of canonical runs + lane-merged variants/research (cache invalidation). */
  input_fingerprint?: string;
  /** What was fed into the synthesis prompt. */
  input_inventory?: SynthesisInputInventory;
  /** Overall narrative across all providers */
  overall_summary: string;
  /** Points all (or nearly all) providers agree on */
  consensus: SynthesisPoint[];
  /** Points raised by a majority but not all */
  majority_view: SynthesisPoint[];
  /** Points raised by only one provider — notable outliers */
  minority_opinions: SynthesisPoint[];
}

/** One block inside a research completion — headings and bodies are model-chosen (markdown-friendly plain text). */
export interface ResearchSection {
  heading: string;
  body: string;
}

/** Recorded when a research starter prompt is sent and the assistant replies successfully (append-only list on the run). */
export interface ResearchCompletion {
  research_id: string;
  /** Short label from the starter button or user's message */
  label: string;
  /** Scenario group title, e.g. "Slack → Teams–style migration" */
  group_title?: string;
  /** 3–5 word title generated by the model, e.g. "Vercel vs AWS cost" */
  title?: string;
  /** One-sentence summary of the key finding, generated by the model */
  summary?: string;
  completed_at: string;
  /** Full narrative from the model before RESEARCH_SECTIONS_JSON (primary write-up) */
  main_answer?: string;
  /** Optional extras only (sources list, table, checklist)—not a second copy of the main answer */
  sections?: ResearchSection[];
}

export interface DecisionRunResult {
  decision_id: string;
  /** Unique identifier for this specific run (supports multiple posture reruns) */
  run_id: string;
  /** Current state of this run */
  status: DecisionRunStatus;
  intake: DecisionIntake;
  /** 0–5 questions for clarification (when from rerun_posture: new first, then from previous run) */
  clarification_questions: LensQuestion[];
  /** When set, sections with posture labels so UI can group questions by posture (e.g. "Explore posture", "Generate alternatives posture") */
  clarification_question_sections?: { postureLabel: string; keys: string[] }[];
  clarification_needed: boolean;
  /** Clarifications submitted for this run */
  clarifications: Clarification[];
  /** May be empty if using "gap check first" architecture */
  lens_outputs: LensOutput[];
  /**
   * Topic-style label from the first lens pass (before/without relying on full brief synthesis).
   * Used for headers and lists; brief.title is aligned to this when the brief is generated.
   */
  decision_title?: string;
  decision_brief?: DecisionBrief;
  /**
   * Optional re-synthesis of the brief that weaves in `research_completions` and all `variants`.
   * Generated on demand; the standard `decision_brief` stays the primary editable brief.
   */
  decision_brief_comprehensive?: DecisionBrief;
  /**
   * Unified Brief merges all runs for this decision (all providers/postures), plus research and variants
   * from every run. Legacy field: Anthropic-authored brief; prefer `unified_briefs_by_author`.
   */
  decision_brief_best_of_worlds?: DecisionBrief;
  /**
   * Unified Brief keyed by synthesizing model, then authorship mode (`open` | `blind` | `reassigned`).
   * Legacy values may still be a bare `DecisionBrief` (treated as `open`).
   */
  unified_briefs_by_author?: Partial<
    Record<LLMProviderName, UnifiedBriefAuthorshipVersions<DecisionBrief> | DecisionBrief>
  >;
  /**
   * Attribution of which think-tank model's ideas made the cut in the unified brief.
   * Legacy field for Anthropic-authored brief; prefer `unified_brief_contributions_by_author`.
   */
  decision_brief_best_of_worlds_contributions?: UnifiedBriefContributions;
  /**
   * Contributions analysis keyed by synthesizer, then authorship mode (matches briefs).
   * Legacy values may still be a bare `UnifiedBriefContributions` (treated as `open`).
   */
  unified_brief_contributions_by_author?: Partial<
    Record<
      LLMProviderName,
      UnifiedBriefAuthorshipVersions<UnifiedBriefContributions> | UnifiedBriefContributions
    >
  >;
  /**
   * Legacy: Q&A about the unified brief (Anthropic-only chats before per-provider threads).
   * Prefer `unified_brief_chat_by_provider`; readers should treat this as
   * `unified_brief_chat_by_provider?.anthropic` when the latter is absent.
   */
  unified_brief_chat_messages?: {
    role: "user" | "assistant";
    content: string;
  }[];
  /** Q&A about the unified brief, one thread per provider (unified brief page). */
  unified_brief_chat_by_provider?: Partial<
    Record<
      LLMProviderName,
      {
        role: "user" | "assistant";
        content: string;
      }[]
    >
  >;
  /** First-draft analysis by lens (before any clarification); always set on intake */
  lens_outputs_first_draft?: LensOutput[];
  /** First-draft decision brief, if any (before any clarification) */
  decision_brief_first_draft?: DecisionBrief;
  /** Chat messages for "ask about this analysis" (persisted with run when loading by run_id) */
  chat_messages?: {
    role: "user" | "assistant";
    content: string;
    /** Assistant research replies: full text lives in research_completions */
    research_completion_id?: string;
  }[];
  /** LLM provider used for this run (lenses, brief, chat). Defaults to openai when missing. */
  llm_provider?: LLMProviderName;
  /** Format variants of this analysis (same decision, different presentation) */
  variants?: RunVariant[];
  /** Cross-provider synthesis (stored when generated, shared across sibling runs) */
  synthesis?: ProviderSynthesis;
  /** Set when the user started from an intake demo scenario button */
  demo_scenario_id?: DemoScenarioId;
  /**
   * True when this run was created by the Civitas/Meridian stress harness
   * (`npm run harness:civitas`). My Decisions shows these under a separate tab.
   */
  harness_run?: boolean;
  /** 1-based trial index within a harness batch (when `harness_run` is set). */
  harness_trial?: number;
  /** Completed research-starter chats (persisted with the run) */
  research_completions?: ResearchCompletion[];
  /** Owner of this run (session user id). Optional for legacy runs without auth. */
  user_id?: string;
  /** Free-form analysis output (model-chosen schema). Set when this run was created via the freeform endpoint. */
  freeform_output?: Record<string, unknown>;
  /** Model id used for the freeform analysis (when `freeform_output` is set). */
  freeform_model?: string;
  /** ISO timestamp when freeform analysis was generated. */
  freeform_generated_at?: string;
}
