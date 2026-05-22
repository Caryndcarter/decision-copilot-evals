/**
 * Decision Brief Synthesis
 *
 * Produces a short title, summary, recommendation, and next steps from
 * intake and lens outputs (and optional clarifications). SERVER-ONLY.
 */

import "server-only";
import { getClient } from "@/llm";
import { anthropic } from "@/llm/anthropic";
import type { LLMMessage, LLMProvider } from "@/llm/types";
import type {
  DecisionIntake,
  DecisionBrief,
  DecisionRunResult,
  LensOutput,
  Clarification,
  ResearchCompletion,
  RunVariant,
  ProviderSynthesis,
} from "@/types/decision";
import { BRIEF_PROFILE_IS_DELETE } from "@/lib/brief-profile";
import { runPostureLabel, runProviderLabel } from "@/lib/run-display-name";

const BRIEF_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description:
        "Short topic-style title: what decision is being made (e.g. 'Evaluating a mid-year reorg'). Not a recommendation sentence; match the separate decision-title step if one was provided.",
    },
    summary: {
      type: "string",
      description:
        "2-4 sentence synthesis of the situation and analysis for a busy reader",
    },
    recommendation: {
      type: "string",
      description: "Clear recommendation: what the decision-maker should do next",
    },
    key_considerations: {
      type: "array",
      items: {
        type: "string",
        description:
          "One full phrase or sentence per item — never a lone comma, semicolon, dash, or placeholder punctuation",
      },
      description: "3-7 bullet-worthy considerations to keep in mind",
    },
    next_steps: {
      type: "array",
      items: { type: "string" },
      description:
        "REQUIRED: at least 3 distinct, concrete, actionable next steps (not placeholders). The decision-maker must be able to act on each item this week or month.",
      minItems: 3,
      maxItems: 7,
    },
    custom_sections: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          heading: { type: "string", description: "Section heading" },
          content: {
            type: "string",
            description:
              "Full section body as GitHub-flavored markdown (headings, lists, tables, bold); complete and not truncated",
          },
        },
        required: ["heading", "content"],
        additionalProperties: false,
      },
      description:
        "Extra brief appendices: empty [] unless (a) a format instruction requests one section, or (b) post-clarification pass allows up to 3 optional model-chosen sections per prompt rules",
    },
  },
  required: ["title", "summary", "recommendation", "key_considerations", "next_steps", "custom_sections"],
  additionalProperties: false,
} as const;

const MIN_NEXT_STEPS = 3;

/** Narrow follow-up when the main brief call returns too few next_steps (common with Anthropic tool_use). */
const NEXT_STEPS_REPAIR_SCHEMA = {
  type: "object",
  properties: {
    next_steps: {
      type: "array",
      items: { type: "string" },
      description: "At least 3 concrete, actionable next steps grounded in the decision",
      minItems: MIN_NEXT_STEPS,
      maxItems: 7,
    },
  },
  required: ["next_steps"],
  additionalProperties: false,
} as const;

/** Second pass when the main brief omits or strips custom_sections (common with long structured outputs). */
const CUSTOM_SECTION_REPAIR_SCHEMA = {
  type: "object",
  properties: {
    heading: {
      type: "string",
      description: "Short section title matching the user's format request (e.g. Timeline, Cost breakdown)",
    },
    content: {
      type: "string",
      description:
        "Substantive markdown for this decision only: multiple sentences or bullet lists grounded in the lenses; no placeholders or 'see above'",
    },
  },
  required: ["heading", "content"],
  additionalProperties: false,
} as const;

export interface BriefSynthesisPromptOptions {
  /**
   * Last published brief before this regeneration (reapply clarification, etc.).
   * Only read when `BRIEF_PROFILE_IS_DELETE` — used to let the model drop or rewrite any part.
   */
  priorPublishedBrief?: DecisionBrief;
}

/** Prior full brief JSON for delete-profile revision (bounded). */
function formatPriorBriefJsonForPrompt(b: DecisionBrief, maxText = 4500): string {
  const payload = {
    title: truncateForPrompt(b.title ?? "", 240),
    summary: truncateForPrompt(b.summary ?? "", maxText),
    recommendation: truncateForPrompt(b.recommendation ?? "", 1200),
    key_considerations: b.key_considerations ?? [],
    next_steps: b.next_steps ?? [],
    custom_sections: (b.custom_sections ?? []).map((s) => ({
      heading: s.heading?.trim() ?? "",
      content: truncateForPrompt(s.content ?? "", maxText),
    })),
  };
  return "```json\n" + JSON.stringify(payload, null, 2) + "\n```";
}

/** Shared formatting for brief synthesis and decision title generation. */
export function formatLensOutputs(lensOutputs: LensOutput[]): string {
  const parts: string[] = [];
  for (const out of lensOutputs) {
    if (out.lens === "risk") {
      parts.push(`### Risk lens\n- Top risks: ${(out.top_risks ?? []).join("; ")}`);
      if (out.assumptions_detected?.length)
        parts.push(`- Assumptions: ${out.assumptions_detected.join("; ")}`);
      if (out.blind_spots?.length)
        parts.push(
          `- Blind spots: ${out.blind_spots.map((b) => `${b.area}: ${b.description}`).join("; ")}`
        );
      if (out.tradeoffs?.length)
        parts.push(
          `- Tradeoffs: ${out.tradeoffs.map((t) => `${t.option} (↑ ${t.upside}, ↓ ${t.downside})`).join("; ")}`
        );
      if (out.remaining_uncertainty?.length)
        parts.push(`- Remaining uncertainty: ${out.remaining_uncertainty.join("; ")}`);
    } else if (out.lens === "reversibility") {
      parts.push(
        `### Reversibility lens\n- Irreversible steps: ${(out.irreversible_steps ?? []).join("; ")}`
      );
      if (out.safe_to_try_first?.length)
        parts.push(`- Safe to try first: ${out.safe_to_try_first.join("; ")}`);
      if (out.assumptions_detected?.length)
        parts.push(`- Assumptions: ${out.assumptions_detected.join("; ")}`);
      if (out.tradeoffs?.length)
        parts.push(
          `- Tradeoffs: ${out.tradeoffs.map((t) => `${t.option} (↑ ${t.upside}, ↓ ${t.downside})`).join("; ")}`
        );
    } else if (out.lens === "people") {
      parts.push(
        `### People lens\n- Stakeholder impacts: ${(out.stakeholder_impacts ?? []).map((s) => `${s.stakeholder} (${s.sentiment}): ${s.impact}`).join("; ")}`
      );
      if (out.execution_risks?.length)
        parts.push(`- Execution risks: ${out.execution_risks.join("; ")}`);
      if (out.assumptions_detected?.length)
        parts.push(`- Assumptions: ${out.assumptions_detected.join("; ")}`);
      if (out.tradeoffs?.length)
        parts.push(
          `- Tradeoffs: ${out.tradeoffs.map((t) => `${t.option} (↑ ${t.upside}, ↓ ${t.downside})`).join("; ")}`
        );
    }
  }
  return parts.join("\n");
}

export function formatClarifications(clarifications: Clarification[]): string {
  if (!clarifications.length) return "";
  const lines = clarifications.flatMap((c) =>
    c.answers.map((a) => {
      let text: string;
      if (a.answer === "unknown") text = "unknown (user didn't know)";
      else if (a.answer_type === "percentage" && typeof a.answer === "number") text = `${a.answer}%`;
      else text = String(a.answer);
      return `- ${a.question_id} (${a.lens}): ${text}`;
    })
  );
  return `\n\n## Follow-up answers from the user\n${lines.join("\n")}`;
}

export function buildBriefPrompt(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  clarifications: Clarification[] = [],
  formatInstruction?: string,
  promptOpts?: BriefSynthesisPromptOptions
): LLMMessage[] {
  const lensBlock = formatLensOutputs(lensOutputs);
  const clarBlock = formatClarifications(clarifications);
  const fmt = formatInstruction?.trim();
  const proactiveAppendix = clarifications.length > 0 && !fmt;
  const priorPublishedBrief = BRIEF_PROFILE_IS_DELETE ? promptOpts?.priorPublishedBrief : undefined;
  const hasPriorPublished = Boolean(proactiveAppendix && priorPublishedBrief);

  const baseInstructions = `You are a decision coach. Given a decision context and analyses from risk and reversibility lenses, produce a brief decision brief.

Output (all fields required; do not leave any array empty):
- title: A short **topic** title — what decision or exploration this is (e.g. "Database migration timing and vendor choice"). Do **not** phrase as a recommendation ("Recommendation:", "You should…", "Proceed with…"). Not generic like "Decision brief".
- summary: 2-4 sentences that synthesize the situation and the key findings for a busy reader.
- recommendation: One clear sentence on what the decision-maker should do next.
- key_considerations: 3-7 short items to keep in mind. Each array entry must be a **complete thought** (a phrase or sentence). Never output an entry that is only punctuation (e.g. a single comma) or empty-looking separators between other items — use separate strings for each consideration.
- next_steps: **MANDATORY — minimum 3 items, maximum 7.** Each string must be a concrete action (verb-led: e.g. "Schedule…", "Document…", "Validate…"). Never return an empty array, never return fewer than 3 steps, and never use placeholders like "TBD" or "See above". If you are unsure, still propose three reasonable actions implied by the lenses.
- custom_sections: **Until follow-up answers exist for this decision run, this MUST be exactly \`[]\`.** There are no optional appendix rules active on the first pass (no clarification answers yet)—do not invent appendices. When the refined-pass rules below apply (after at least one clarification round in this request), you may add 0–3 sections as described there.`;

  const optionalAppendixRefinedPass = `

**Optional appendix sections (refined pass — user has answered follow-up questions):**
You MAY include **0 to 3** objects in \`custom_sections\` — **never more than 3.** Use **\`[]\`** unless each entry would add **clearly new** structure that does not belong in summary, key_considerations, or next_steps alone (examples: decision criteria matrix, scenario comparison, stakeholder map or RACI, implementation checklist, explicit assumptions log).
Rules for each appendix you add:
- Non-redundant: do **not** paste or lightly rephrase the recommendation; add a distinct lens on the decision.
- Substantive markdown in \`content\`: blank lines between blocks; ## and ### for subheadings; bullets or numbered lists; **bold** where helpful; tables when comparing options.
- Each \`heading\` is a short, specific title (not generic like "Notes" or "Additional information").
If nothing meets that bar, return \`custom_sections: []\`.`;

  const deletePriorFullBriefRules =
    BRIEF_PROFILE_IS_DELETE && hasPriorPublished
      ? `

**Prior brief — full revision (\`delete\` profile only):** The user message includes a **Prior published brief** JSON: that was the last saved brief for this run before this regeneration. After reading the **new** lens analyses and follow-up answers, output a **fresh** brief. You may **remove or replace** any part of the prior version that no longer applies, including:
- **summary**, **recommendation**, **title** (topic-style, not a recommendation sentence): rewrite or shorten when superseded.
- **key_considerations**: you may use **fewer** items or **none** (\`[]\`) if every prior point is obsolete or folded into the new summary (use non-empty when material points remain).
- **next_steps**: drop outdated steps freely, but you MUST still return **at least 3** distinct verb-led steps (required by schema).
- **custom_sections**: return \`[]\` or up to 3 objects; **omit** prior appendices that no longer earn a separate section; revise or add as needed.
Do not copy large unchanged passages from the prior JSON unless they are still accurate.`
      : "";

  const proactiveAppendixBlock = proactiveAppendix
    ? `${optionalAppendixRefinedPass}${deletePriorFullBriefRules}`
    : "";

  const formatInstructionBlock = fmt
    ? `

IMPORTANT - Format customization requested (this is the ONLY type of extra section to add):
${fmt}

Add exactly ONE entry to "custom_sections" that matches the request above. Do NOT add any other sections: no timeline unless a timeline was requested, no cost breakdown unless cost was requested, no risk playbook unless that was requested. Only the section that matches the instruction above.

For custom_sections[0].content you MUST use real GitHub-flavored markdown the UI will render: blank lines between blocks; ## and ### for subheadings; - or * for bullet lists; numbered lists for sequences; **bold** for emphasis; pipe tables (| col |) when comparing options; fenced \`\`\` only if a short code snippet is relevant. Write the full section—do not truncate mid-thought; the content field must be complete and substantive (several paragraphs and/or lists as appropriate). Empty or placeholder content is not acceptable.`
    : "";

  const systemPrompt = `${baseInstructions}${proactiveAppendixBlock}${formatInstructionBlock}

Be specific to this decision. Avoid generic advice. Use the lens analyses and any user follow-up answers.`;

  const userContent = `## Decision context

**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}

**Posture:** ${intake.posture}${intake.leaning_direction ? ` · Leaning toward: ${intake.leaning_direction}` : ""}
${intake.knowns_assumptions ? `\n**Knowns/assumptions:** ${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `\n**Unknowns:** ${intake.unknowns}` : ""}

## Lens analyses

${lensBlock}
${clarBlock}${
    hasPriorPublished && priorPublishedBrief
      ? `\n\n## Prior published brief (delete profile — revise or drop as needed)\n\n${formatPriorBriefJsonForPrompt(priorPublishedBrief)}`
      : ""
  }

Produce the decision brief (title, summary, recommendation, key_considerations, next_steps, custom_sections). The next_steps array MUST contain at least 3 non-empty strings before you finish.${
    fmt
      ? " The custom_sections array MUST contain exactly ONE object with non-empty heading and substantive content (not a placeholder)."
      : proactiveAppendix
        ? hasPriorPublished
          ? " The custom_sections array may be [] or up to 3 objects (each with non-empty heading and substantive markdown). When a prior published brief was provided, you may drop all prior appendices and rewrite core fields as needed; keep next_steps at least 3 items."
          : " The custom_sections array MUST be either [] OR contain 1–3 objects (never more than 3), each with non-empty heading and substantive content; omit filler."
        : " The custom_sections array MUST be exactly [] (empty)."
  }`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

interface RawBriefOutput {
  title?: string;
  summary?: string;
  recommendation?: string;
  key_considerations?: string[] | unknown[];
  next_steps?: string[] | unknown[];
  keyConsiderations?: string[] | unknown[];
  nextSteps?: string[] | unknown[];
  custom_sections?: Array<{ heading?: string; content?: string }> | { heading?: string; content?: string };
}

/** Reject list items that are only commas, bullets, dashes, etc. (seen from some structured outputs). */
function isSubstantiveBriefListItem(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return false;
  if (/^[\s,;.:•\-–—_|/\\'"`()\u2022\u2013\u2014]+$/u.test(t)) return false;
  return true;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .filter(isSubstantiveBriefListItem);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n+/)
      .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
      .filter(Boolean)
      .filter(isSubstantiveBriefListItem);
  }
  return [];
}

function parseBriefOutput(parsed: unknown, generated_at: string): DecisionBrief {
  const raw = (parsed && typeof parsed === "object" ? parsed : {}) as RawBriefOutput;
  const key_considerations = normalizeStringArray(
    raw.key_considerations ?? raw.keyConsiderations
  );
  const next_steps = normalizeStringArray(raw.next_steps ?? raw.nextSteps);

  // Parse custom sections if present (some models return one object instead of an array)
  const rawSections = raw.custom_sections;
  const sectionList: Array<{ heading?: string; content?: string }> = Array.isArray(rawSections)
    ? rawSections
    : rawSections && typeof rawSections === "object"
      ? [rawSections as { heading?: string; content?: string }]
      : [];
  const custom_sections = sectionList
    .filter((s) => s.heading?.trim() && s.content?.trim())
    .map((s) => ({
      heading: s.heading!.trim(),
      content: s.content!.trim(),
    }))
    .slice(0, 3);

  return {
    title: raw.title?.trim() || "Decision brief",
    generated_at,
    summary: raw.summary?.trim() || "",
    recommendation: raw.recommendation?.trim() || "",
    key_considerations,
    next_steps,
    ...(custom_sections?.length ? { custom_sections } : {}),
  };
}

function mergeUniqueStepLists(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...a, ...b]) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.slice(0, 7);
}

/** Last resort if the model still returns too few steps (keeps the UI and contract valid). */
function padNextStepsToMinimum(steps: string[], intake: DecisionIntake): string[] {
  let out = mergeUniqueStepLists(steps, []);
  const snippet =
    intake.situation.split(/[.!?]/)[0]?.trim().slice(0, 100) || "this decision";
  const fillers = [
    `List the top open questions about ${snippet} and assign an owner and date to resolve each.`,
    `Review the main risks from the analysis with stakeholders and agree on one mitigation to try first.`,
    `Set a calendar checkpoint to revisit this recommendation after any planned discovery or pilot work.`,
  ];
  for (const f of fillers) {
    if (out.length >= MIN_NEXT_STEPS) break;
    out = mergeUniqueStepLists(out, [f]);
  }
  return out;
}

async function runNextStepsRepair(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  clarifications: Clarification[],
  current: DecisionBrief,
  provider: LLMProvider
): Promise<string[] | null> {
  const lensBlock = formatLensOutputs(lensOutputs);
  const clarBlock = formatClarifications(clarifications);
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `Your only task is to return next_steps: at least ${MIN_NEXT_STEPS} distinct, concrete, verb-led actions the decision-maker can take soon. Ground them in the situation, lens analyses, and the recommendation. Do not repeat vague advice; each step must be actionable alone.`,
    },
    {
      role: "user",
      content: `## Situation
${intake.situation}

## Constraints
${intake.constraints}

## Posture
${intake.posture}${intake.leaning_direction ? ` · Leaning toward: ${intake.leaning_direction}` : ""}

## Lens analyses
${lensBlock}
${clarBlock}

## Brief already produced
Title: ${current.title}
Summary: ${current.summary}
Recommendation: ${current.recommendation}
Key considerations: ${(current.key_considerations ?? []).join(" | ") || "(none)"}
Existing next_steps (improve or replace if too few or weak): ${JSON.stringify(current.next_steps)}

Return at least ${MIN_NEXT_STEPS} strong next_steps in the structured output.`,
    },
  ];

  const response = await getClient(provider).run(messages, {
    schema: NEXT_STEPS_REPAIR_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.35,
    maxTokens: 600,
  });

  if (!response.parsed || typeof response.parsed !== "object") return null;
  const raw = response.parsed as { next_steps?: unknown };
  const steps = normalizeStringArray(raw.next_steps);
  return steps.length > 0 ? steps : null;
}

async function runCustomSectionRepair(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  clarifications: Clarification[],
  formatInstruction: string,
  provider: LLMProvider
): Promise<{ heading: string; content: string } | null> {
  const lensBlock = formatLensOutputs(lensOutputs);
  const clarBlock = formatClarifications(clarifications);
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You add a single appendix section to a decision brief. The user asked for a specific format (timeline, cost view, comparison table, etc.). Respond with one heading and one content body. Content must cite specifics from the decision and lens analyses—risks, stakeholders, tradeoffs—not generic filler. Write the full section in GitHub-flavored markdown (## subheadings, bullet/numbered lists, **bold**, tables when useful); at least 120 words unless the request is trivial. Do not truncate.`,
    },
    {
      role: "user",
      content: `## What to add
${formatInstruction}

## Situation
${intake.situation}

## Constraints
${intake.constraints}

## Posture
${intake.posture}${intake.leaning_direction ? ` · Leaning toward: ${intake.leaning_direction}` : ""}
${intake.knowns_assumptions ? `\n## Knowns/assumptions\n${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `\n## Unknowns\n${intake.unknowns}` : ""}

## Lens analyses
${lensBlock}
${clarBlock}

Return structured heading and content for this one section only.`,
    },
  ];

  const response = await getClient(provider).run(messages, {
    schema: CUSTOM_SECTION_REPAIR_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.4,
    maxTokens: 8192,
  });

  if (!response.parsed || typeof response.parsed !== "object") return null;
  const raw = response.parsed as { heading?: unknown; content?: unknown };
  const heading = typeof raw.heading === "string" ? raw.heading.trim() : "";
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (!heading || !content) return null;
  return { heading, content };
}

export interface ComprehensiveBriefInputs {
  research_completions: ResearchCompletion[];
  variants: RunVariant[];
  /** Appendices from the standard (post-clarification) brief — integrated brief must account for them */
  base_custom_sections?: { heading: string; content: string }[];
}

function truncateForPrompt(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** Serialize research completions for an integrated brief prompt (full narrative, bounded per item). */
export function formatResearchCompletionsForBrief(
  rcs: ResearchCompletion[],
  maxPerCompletion = 8000
): string {
  if (!rcs.length) return "";
  return rcs
    .map((rc, i) => {
      const head = rc.title?.trim() || rc.label || `Research ${i + 1}`;
      const lines: string[] = [`### ${head}`];
      if (rc.summary) lines.push(`One-line finding: ${rc.summary}`);
      let body = (rc.main_answer ?? "").trim();
      if (!body && rc.sections?.length) {
        body = rc.sections.map((s) => `**${s.heading}**\n${s.body}`).join("\n\n");
      }
      lines.push(truncateForPrompt(body, maxPerCompletion));
      return lines.join("\n\n");
    })
    .join("\n\n---\n\n");
}

/** Summarize each saved variant’s brief for an integrated prompt (not full second lens dump). */
export function formatVariantsForBrief(variants: RunVariant[], maxSectionChars = 3500): string {
  if (!variants.length) return "";
  return variants
    .map((v) => {
      const b = v.decision_brief;
      const parts = [
        `### ${v.label}`,
        `**Format angle:** ${v.format_instruction}`,
        ...(b.summary ? [`**Summary (that version):** ${truncateForPrompt(b.summary, 1200)}`] : []),
        ...(b.recommendation
          ? [`**Recommendation (that version):** ${truncateForPrompt(b.recommendation, 800)}`]
          : []),
      ];
      if (b.custom_sections?.length) {
        for (const s of b.custom_sections) {
          parts.push(`#### ${s.heading}\n${truncateForPrompt(s.content ?? "", maxSectionChars)}`);
        }
      }
      return parts.join("\n\n");
    })
    .join("\n\n---\n\n");
}

/** Standard-brief optional sections for the integrated brief prompt */
export function formatBaseBriefCustomSectionsForComprehensive(
  sections: { heading: string; content: string }[] | undefined,
  maxPerSection = 6000
): string {
  if (!sections?.length) return "";
  return sections
    .map((s, i) => {
      const h = s.heading?.trim() || `Section ${i + 1}`;
      return `### ${h}\n\n${truncateForPrompt(s.content ?? "", maxPerSection)}`;
    })
    .join("\n\n---\n\n");
}

function buildComprehensiveBriefMessages(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  clarifications: Clarification[],
  inputs: ComprehensiveBriefInputs
): LLMMessage[] {
  const lensBlock = formatLensOutputs(lensOutputs);
  const clarBlock = formatClarifications(clarifications);
  const researchBlock = formatResearchCompletionsForBrief(inputs.research_completions);
  const variantsBlock = formatVariantsForBrief(inputs.variants);
  const baseAppendixBlock = formatBaseBriefCustomSectionsForComprehensive(inputs.base_custom_sections);

  const systemPrompt = `You are a decision coach. Produce one integrated decision brief that combines:
1) The core lens analysis in the user message
2) Any **Research the user ran** — incorporate concrete findings; do not ignore them
3) Any **Alternate analysis versions (saved variants)** — merge distinctive insights without repeating entire documents verbatim
4) Any **Additional sections from the standard brief** (appendices the model added after clarification) — weave their substance into summary, recommendation, key_considerations, and next_steps; do not ignore them

Output (all fields required; arrays must not be empty where noted):
- title: short topic-style title (not a recommendation sentence)
- summary: 2-5 sentences reflecting the full picture when research, variants, or standard appendices add material
- recommendation: clear next move for the decision-maker
- key_considerations: 3-7 items
- next_steps: **at least 3** concrete verb-led actions; ground them in lenses, research, variants, and standard appendices as relevant
- custom_sections: Prefer []. You MAY output **at most 3** appendices only if consolidating cross-sources still helps (e.g. merged criteria table). Never duplicate the standard appendices verbatim without synthesis—integrate and cite ideas in the core fields first. Returning **[]** is correct when all substance from prior appendices has been woven into summary, recommendation, key_considerations, and next_steps—treat that as intentionally **dropping** redundant separate sections.

Be specific to this decision. Avoid generic filler.`;

  const ctx = `## Decision context

**Situation:** ${intake.situation}

**Constraints:** ${intake.constraints}

**Posture:** ${intake.posture}${intake.leaning_direction ? ` · Leaning toward: ${intake.leaning_direction}` : ""}
${intake.knowns_assumptions ? `\n**Knowns/assumptions:** ${intake.knowns_assumptions}` : ""}
${intake.unknowns ? `\n**Unknowns:** ${intake.unknowns}` : ""}

## Lens analyses

${lensBlock}
${clarBlock}`;

  const chunks: string[] = [ctx];
  if (baseAppendixBlock) {
    chunks.push(`## Additional sections from the standard brief (model appendices)\n\n${baseAppendixBlock}`);
  }
  if (researchBlock) chunks.push(`## Research the user ran\n\n${researchBlock}`);
  if (variantsBlock) chunks.push(`## Alternate analysis versions (saved variants)\n\n${variantsBlock}`);

  chunks.push(
    `Produce the integrated brief as structured JSON. next_steps MUST contain at least 3 strings. custom_sections: at most 3 items, usually [].`
  );

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: chunks.join("\n\n---\n\n") },
  ];
}

/**
 * Re-synthesize the brief using base lenses plus all research completions and saved variants.
 * Does not replace the standard brief; caller typically stores this on `decision_brief_comprehensive`.
 */
export async function runComprehensiveBriefSynthesis(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  clarifications: Clarification[] = [],
  inputs: ComprehensiveBriefInputs,
  provider: LLMProvider = "openai",
  stableTitle?: string
): Promise<DecisionBrief> {
  const messages = buildComprehensiveBriefMessages(intake, lensOutputs, clarifications, inputs);

  const response = await getClient(provider).run(messages, {
    schema: BRIEF_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.45,
    maxTokens: 8192,
  });

  if (!response.parsed) {
    throw new Error("Comprehensive brief synthesis did not return valid structured output");
  }

  const generated_at = new Date().toISOString();
  let brief = parseBriefOutput(response.parsed, generated_at);

  const titleStable = stableTitle?.trim();
  if (titleStable) {
    brief = { ...brief, title: titleStable };
  }

  if (brief.next_steps.length < MIN_NEXT_STEPS) {
    const repaired = await runNextStepsRepair(intake, lensOutputs, clarifications, brief, provider);
    if (repaired?.length) {
      brief = {
        ...brief,
        next_steps: mergeUniqueStepLists(brief.next_steps, repaired),
      };
    }
  }

  if (brief.next_steps.length < MIN_NEXT_STEPS) {
    brief = { ...brief, next_steps: padNextStepsToMinimum(brief.next_steps, intake) };
  }

  return brief;
}

export async function runBriefSynthesis(
  intake: DecisionIntake,
  lensOutputs: LensOutput[],
  clarifications: Clarification[] = [],
  provider: LLMProvider = "openai",
  formatInstruction?: string,
  promptOpts?: BriefSynthesisPromptOptions
): Promise<DecisionBrief> {
  const messages = buildBriefPrompt(intake, lensOutputs, clarifications, formatInstruction, promptOpts);

  const largeBriefPayload =
    Boolean(formatInstruction?.trim()) ||
    (clarifications.length > 0 && !formatInstruction?.trim()) ||
    Boolean(promptOpts?.priorPublishedBrief);

  const requestOpts = {
    schema: BRIEF_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.5,
    // Variant briefs and post-clarification briefs (optional appendices) need room for structured JSON.
    maxTokens: largeBriefPayload ? 8192 : 1024,
  };

  const client = getClient(provider);
  let response = await client.run(messages, requestOpts);

  // Providers occasionally return text that isn't valid JSON or that gets truncated mid-object,
  // even with a responseSchema set (Gemini in particular). One retry with an explicit JSON-only
  // reminder, lower temperature, and even more headroom catches the vast majority of these.
  if (!response.parsed) {
    console.warn("[Brief] First attempt did not return parseable JSON; retrying once.", {
      provider,
      finishReason: response.meta?.finishReason,
      contentLen: response.content.length,
      contentPreview: response.content.slice(0, 300),
    });
    const retryMessages: LLMMessage[] = [
      ...messages,
      {
        role: "user",
        content:
          "Your previous reply was not valid JSON for the required schema. " +
          "Reply NOW with one JSON object that matches the schema exactly. " +
          "No prose, no markdown, no code fences — only the JSON object. " +
          "Make sure every required property is present and the object is fully closed.",
      },
    ];
    response = await client.run(retryMessages, {
      ...requestOpts,
      temperature: 0.2,
      maxTokens: Math.max(requestOpts.maxTokens, 8192),
    });
  }

  if (!response.parsed) {
    console.error("[Brief] Brief synthesis failed to produce parseable JSON after retry.", {
      provider,
      finishReason: response.meta?.finishReason,
      contentLen: response.content.length,
      contentPreview: response.content.slice(0, 500),
    });
    throw new Error(
      `Brief synthesis did not return valid structured output (provider: ${provider}, finishReason: ${response.meta?.finishReason ?? "unknown"})`
    );
  }

  const generated_at = new Date().toISOString();
  let brief = parseBriefOutput(response.parsed, generated_at);

  if (brief.next_steps.length < MIN_NEXT_STEPS) {
    const repaired = await runNextStepsRepair(intake, lensOutputs, clarifications, brief, provider);
    if (repaired?.length) {
      brief = {
        ...brief,
        next_steps: mergeUniqueStepLists(brief.next_steps, repaired),
      };
    }
  }

  if (brief.next_steps.length < MIN_NEXT_STEPS) {
    brief = { ...brief, next_steps: padNextStepsToMinimum(brief.next_steps, intake) };
  }

  const fmt = formatInstruction?.trim();
  if (fmt && !brief.custom_sections?.length) {
    const section = await runCustomSectionRepair(intake, lensOutputs, clarifications, fmt, provider);
    if (section) {
      brief = { ...brief, custom_sections: [section] };
    }
  }

  return brief;
}

// --- Best of all worlds (Anthropic, all runs for decision + merged research & variants) ---

function pickLensOutputsForConsolidatedRun(run: DecisionRunResult): LensOutput[] {
  const settled = run.status === "complete" || run.status === "pending_brief";
  return settled
    ? (run.lens_outputs ?? [])
    : (run.lens_outputs_first_draft?.length ? run.lens_outputs_first_draft : run.lens_outputs) ?? [];
}

function pickBriefForConsolidatedRun(run: DecisionRunResult): DecisionBrief | undefined {
  const settled = run.status === "complete" || run.status === "pending_brief";
  return settled ? run.decision_brief : (run.decision_brief_first_draft ?? run.decision_brief);
}

/** Merge research completions from every run; dedupe by `research_id`. */
export function mergeResearchFromAllRuns(runs: DecisionRunResult[]): ResearchCompletion[] {
  const seen = new Set<string>();
  const out: ResearchCompletion[] = [];
  for (const run of runs) {
    const tag = `${runProviderLabel(run.llm_provider)} · ${runPostureLabel(run.intake.posture)}`;
    for (const rc of run.research_completions ?? []) {
      if (!rc.research_id?.trim()) continue;
      if (seen.has(rc.research_id)) continue;
      seen.add(rc.research_id);
      out.push({
        ...rc,
        label: rc.label?.trim() ? `${rc.label.trim()} (${tag})` : tag,
      });
    }
  }
  return out;
}

function flattenVariantsFromAllRuns(runs: DecisionRunResult[]): RunVariant[] {
  const out: RunVariant[] = [];
  for (const run of runs) {
    const tag = `${runProviderLabel(run.llm_provider)} · ${runPostureLabel(run.intake.posture)}`;
    for (const v of run.variants ?? []) {
      out.push({ ...v, label: `${v.label} — ${tag}` });
    }
  }
  return out;
}

/** Distinct cross-provider syntheses stored on runs (one per compared run-id set). */
function collectCrossProviderSyntheses(runs: DecisionRunResult[]): ProviderSynthesis[] {
  const seen = new Set<string>();
  const out: ProviderSynthesis[] = [];
  for (const run of runs) {
    const syn = run.synthesis;
    if (!syn?.run_ids?.length || !syn.overall_summary?.trim()) continue;
    const key = [...syn.run_ids].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(syn);
  }
  return out.sort((a, b) => (a.generated_at < b.generated_at ? -1 : 1));
}

/** Same shape as cross-provider comparison / run chat context. */
export function formatProviderSynthesisForBrief(synthesis: ProviderSynthesis): string {
  const labels = synthesis.providers.map((p) => runProviderLabel(p)).join(", ");
  const lines: string[] = [
    `### Cross-provider comparison (${labels})`,
    `Compared run_ids: ${synthesis.run_ids.join(", ")}`,
    `Generated: ${synthesis.generated_at}`,
    synthesis.has_drafts ? "*(includes pre-clarification drafts)*" : "",
    "",
    synthesis.overall_summary,
  ].filter(Boolean);
  if (synthesis.consensus.length) {
    lines.push("", "**Consensus (all providers agree):**");
    for (const p of synthesis.consensus) {
      lines.push(`- **${p.area}:** ${truncateForPrompt(p.description, 1200)}`);
    }
  }
  if (synthesis.majority_view.length) {
    lines.push("", "**Majority view:**");
    for (const p of synthesis.majority_view) {
      lines.push(
        `- **${p.area}** [${p.providers.map((x) => runProviderLabel(x)).join(", ")}]: ${truncateForPrompt(p.description, 1200)}`
      );
    }
  }
  if (synthesis.minority_opinions.length) {
    lines.push("", "**Minority opinions (one provider only):**");
    for (const p of synthesis.minority_opinions) {
      lines.push(
        `- **${p.area}** [${p.providers.map((x) => runProviderLabel(x)).join(", ")}]: ${truncateForPrompt(p.description, 1200)}`
      );
    }
  }
  return lines.join("\n");
}

function formatOneRunForBestOfWorlds(run: DecisionRunResult, maxChars: number): string {
  const lenses = pickLensOutputsForConsolidatedRun(run);
  const brief = pickBriefForConsolidatedRun(run);
  const lines: string[] = [];
  const draftHint =
    run.status !== "complete" && run.status !== "pending_brief"
      ? " (not final — analysis may change after clarification)"
      : "";
  lines.push(
    `## Run: ${runProviderLabel(run.llm_provider)} · ${runPostureLabel(run.intake.posture)}\n**run_id:** ${run.run_id}\n**status:** ${run.status}${draftHint}`
  );
  lines.push("\n### Lens analysis\n" + (lenses.length ? formatLensOutputs(lenses) : "(none)"));
  if (run.freeform_output && typeof run.freeform_output === "object" && !Array.isArray(run.freeform_output)) {
    let raw = JSON.stringify(run.freeform_output);
    const ffBudget = Math.min(14000, Math.max(2000, Math.floor(maxChars * 0.75)));
    if (raw.length > ffBudget) {
      raw = raw.slice(0, ffBudget - 1).replace(/\s+\S*$/, "") + "…";
    }
    lines.push("\n### Free-form analysis (model-chosen JSON)\n" + raw);
  }
  if (brief) {
    lines.push("\n### Decision brief (this run)");
    if (brief.summary) lines.push("Summary: " + truncateForPrompt(brief.summary, 900));
    if (brief.recommendation) lines.push("Recommendation: " + truncateForPrompt(brief.recommendation, 400));
    if (brief.key_considerations?.length) {
      lines.push("Key considerations: " + truncateForPrompt(brief.key_considerations.join("; "), 500));
    }
    if (brief.next_steps?.length) {
      lines.push("Next steps: " + truncateForPrompt(brief.next_steps.join("; "), 500));
    }
    const extras = brief.custom_sections?.filter((s) => s.heading?.trim() && s.content?.trim());
    if (extras?.length) {
      lines.push("\n### Extra brief sections");
      for (const s of extras) {
        lines.push(`#### ${s.heading}\n${truncateForPrompt(s.content, 2000)}`);
      }
    }
  }

  const comprehensive = run.decision_brief_comprehensive;
  if (comprehensive) {
    lines.push("\n### Integrated brief on this run (research + variants woven in)");
    if (comprehensive.summary?.trim()) {
      lines.push("Summary: " + truncateForPrompt(comprehensive.summary, 900));
    }
    if (comprehensive.recommendation?.trim()) {
      lines.push("Recommendation: " + truncateForPrompt(comprehensive.recommendation, 400));
    }
    const compExtras = comprehensive.custom_sections?.filter(
      (s) => s.heading?.trim() && s.content?.trim()
    );
    for (const s of compExtras ?? []) {
      lines.push(`#### ${s.heading.trim()}\n${truncateForPrompt(s.content, 1800)}`);
    }
  }

  const rcs = run.research_completions ?? [];
  if (rcs.length > 0) {
    lines.push("\n### Research on this run");
    for (const rc of rcs.slice(0, 8)) {
      const head = rc.title?.trim() || rc.label || "Research";
      const chunk: string[] = [`#### ${head}`, `[research_id:${rc.research_id}]`];
      if (rc.summary) chunk.push(`Finding: ${truncateForPrompt(rc.summary, 200)}`);
      if (rc.main_answer) {
        chunk.push(truncateForPrompt(rc.main_answer, 450));
      } else if (rc.sections?.length) {
        for (const s of rc.sections.slice(0, 2)) {
          chunk.push(`**${s.heading}:** ${truncateForPrompt(s.body, 280)}`);
        }
      }
      lines.push(chunk.join("\n"));
    }
  }

  let body = lines.join("\n");
  if (body.length > maxChars) {
    body = body.slice(0, maxChars - 1).replace(/\s+\S*$/, "") + "…";
  }
  return body;
}

/**
 * Same textual merge payload passed into unified-brief synthesis (primary intake + clarifications + every eligible run’s
 * lenses and per-run brief + merged research + merged variants). Excludes the “return JSON brief” instruction.
 * Used by unified-brief chat so Claude can attribute provider-specific detail beyond the final brief alone.
 */
export function buildBestOfWorldsSourceUserContent(anchorRun: DecisionRunResult, allRuns: DecisionRunResult[]): string {
  const intake = anchorRun.intake;
  const clar = anchorRun.clarifications ?? [];
  const researchMerged = mergeResearchFromAllRuns(allRuns);
  const variantsMerged = flattenVariantsFromAllRuns(allRuns);
  const runsSorted = [...allRuns].sort((a, b) => {
    const pa = runProviderLabel(a.llm_provider);
    const pb = runProviderLabel(b.llm_provider);
    if (pa !== pb) return pa.localeCompare(pb);
    return runPostureLabel(a.intake.posture).localeCompare(runPostureLabel(b.intake.posture));
  });
  const perBudget = Math.max(3500, Math.floor(52000 / Math.max(1, runsSorted.length)));
  const runBlocks = runsSorted.map((r) => formatOneRunForBestOfWorlds(r, perBudget)).join("\n\n---\n\n");
  const researchBlock = formatResearchCompletionsForBrief(researchMerged, 6000);
  const variantsBlock = formatVariantsForBrief(variantsMerged, 3000);
  const clarBlock = formatClarifications(clar);

  const userParts: string[] = [
    `## Decision context (intake snapshot)\n**Situation:** ${intake.situation}\n**Constraints:** ${intake.constraints}\n**Posture:** ${intake.posture}${intake.leaning_direction ? ` · Leaning toward: ${intake.leaning_direction}` : ""}`,
  ];
  if (intake.knowns_assumptions?.trim()) userParts.push(`**Knowns/assumptions:** ${intake.knowns_assumptions}`);
  if (intake.unknowns?.trim()) userParts.push(`**Unknowns:** ${intake.unknowns}`);
  if (clarBlock) userParts.push(clarBlock);
  userParts.push(`## All provider / posture runs (mine for best ideas)\n\n${runBlocks}`);
  if (researchBlock) userParts.push(`## All research (merged across runs)\n\n${researchBlock}`);
  if (variantsBlock) userParts.push(`## All saved variants (merged across runs)\n\n${variantsBlock}`);

  const syntheses = collectCrossProviderSyntheses(allRuns);
  if (syntheses.length > 0) {
    const synBlocks = syntheses.map(formatProviderSynthesisForBrief).join("\n\n---\n\n");
    userParts.push(
      `## Cross-provider comparisons (same inputs as the result-page comparison feature)\n\n` +
        "Use these meta-analyses when merging the Unified Brief—they summarize agreement, majority views, and provider-only angles per posture.\n\n" +
        synBlocks
    );
  }

  return userParts.join("\n\n---\n\n");
}

function buildBestOfWorldsBriefMessages(anchorRun: DecisionRunResult, allRuns: DecisionRunResult[]): LLMMessage[] {
  const systemPrompt = `You are an expert decision coach (Anthropic Claude). Produce ONE structured decision brief that captures the **best ideas across all inputs** below.

**What you receive**
1) Shared **decision context** (intake + clarifications from the storage run for this decision’s unified brief).
2) **Every AI run** on this decision (any configured provider—OpenAI, Anthropic, Google Gemini, xAI, etc.—and/or postures). Each block has **three-lens analysis**, **standard brief** (including optional appendices), **integrated brief** when present, **per-run research**, and/or **free-form JSON**. Some runs may still be **in-flight or awaiting clarification**—treat their text as provisional when status says so.
3) **All research** and **all saved variants** (also merged globally below the per-run blocks).
4) When present, **cross-provider comparison** sections (consensus / majority / minority per posture)—the same meta-analysis shown on individual run pages.

**What you must do**
- **Synthesize**: merge consensus, surface the strongest unique angles from any model, and fold in research, variant, and cross-provider comparison insights. Do not paste full runs verbatim.
- When a **cross-provider comparison** notes provider-only minority or majority themes, reflect them in the Unified Brief (summary, key_considerations, or a custom_section)—do not drop them because lens summaries look similar.
- When models **disagree**, name the tension and suggest how to decide or de-risk.
- **title**: short topic style (not a recommendation sentence).
- **custom_sections**: prefer [] unless 1–3 appendices add clear new structure (e.g. cross-model comparison table).
- **next_steps**: at least 3 concrete verb-led actions grounded in the merged material.

Return only structured JSON matching the schema (title, summary, recommendation, key_considerations, next_steps, custom_sections).`;

  const source = buildBestOfWorldsSourceUserContent(anchorRun, allRuns);
  const userContent =
    source +
    "\n\n---\n\n" +
    `Produce the merged "best of all worlds" brief as structured JSON. next_steps MUST contain at least 3 strings. If some runs were drafts, you may note residual uncertainty briefly in summary or key_considerations.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

/**
 * One Anthropic-generated brief merging all runs (all providers/postures), all research, and all variants.
 * Caller stores on `decision_brief_best_of_worlds` on the chosen storage run for the decision.
 */
export async function runBestOfWorldsBriefSynthesis(
  anchorRun: DecisionRunResult,
  allRuns: DecisionRunResult[]
): Promise<DecisionBrief> {
  const messages = buildBestOfWorldsBriefMessages(anchorRun, allRuns);
  const response = await anthropic.run(messages, {
    schema: BRIEF_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0.45,
    maxTokens: 8192,
  });
  if (!response.parsed) {
    throw new Error("Best-of-worlds brief synthesis did not return valid structured output");
  }
  const generated_at = new Date().toISOString();
  let brief = parseBriefOutput(response.parsed, generated_at);
  const intake = anchorRun.intake;
  const lensOutputs = pickLensOutputsForConsolidatedRun(anchorRun);
  const clarifications = anchorRun.clarifications ?? [];
  const stableTitle =
    anchorRun.decision_title?.trim() || anchorRun.decision_brief?.title?.trim() || undefined;
  if (stableTitle) {
    brief = { ...brief, title: stableTitle };
  }
  const provider: LLMProvider = "anthropic";
  if (brief.next_steps.length < MIN_NEXT_STEPS) {
    const repaired = await runNextStepsRepair(intake, lensOutputs, clarifications, brief, provider);
    if (repaired?.length) {
      brief = {
        ...brief,
        next_steps: mergeUniqueStepLists(brief.next_steps, repaired),
      };
    }
  }
  if (brief.next_steps.length < MIN_NEXT_STEPS) {
    brief = { ...brief, next_steps: padNextStepsToMinimum(brief.next_steps, intake) };
  }
  return brief;
}
