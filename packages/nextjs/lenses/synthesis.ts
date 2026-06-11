/**
 * Cross-Provider Synthesis Lens
 *
 * Compares analyses from multiple LLM providers for the same decision + posture,
 * identifying consensus, majority views, and minority opinions.
 *
 * Works with any combination of complete and pre-clarification (draft) runs.
 * Draft runs use lens_outputs_first_draft; complete runs use final lens_outputs.
 *
 * Synthesizer is always Anthropic (Claude). Compared runs may include any configured
 * provider (OpenAI, Anthropic, Gemini, xAI, etc.); prompts and schema use their ## labels.
 *
 * SERVER-ONLY: Do not import from client/UI code.
 */

import "server-only";
import { anthropic } from "@/llm/anthropic";
import type { LLMMessage } from "@/llm/types";
import type {
  DecisionRunResult,
  LensOutput,
  DecisionBrief,
  ProviderSynthesis,
  SynthesisPoint,
  SynthesisSourceRef,
  LLMProviderName,
} from "@/types/decision";
import { normalizeSynthesisProviderLabel, runProviderLabel } from "@/lib/run-display-name";
import type { SynthesisInputInventory } from "@/lib/synthesis-inputs";
import {
  formatResearchInventoryForBrief,
  formatVariantInventoryForBrief,
  researchCompletionsForLane,
  variantsForLane,
} from "@/lenses/brief";

function truncateSynthesis(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** Internal representation of a run prepared for synthesis */
interface RunEntry {
  run: DecisionRunResult;
  isDraft: boolean;
  lensOutputs: LensOutput[];
  brief: DecisionBrief | undefined;
}

function providerLabelExamples(labels: string[]): string {
  return labels.length > 0 ? labels.join(", ") : "OpenAI, Anthropic, Google Gemini, xAI";
}

function buildSourceRefsItemSchema(labelExamples: string) {
  return {
  type: "object",
  properties: {
    provider: {
      type: "string",
      description: `Exact provider label from ## headers (${labelExamples})`,
    },
    section: {
      type: "string",
      enum: ["risk", "reversibility", "people", "brief", "variants", "context", "research"],
      description:
        "Which subsection of that provider's run supports this point: lens names, brief, variants block, intake context, or research task",
    },
    research_id: {
      type: "string",
      description: "When section is research, UUID from [research_id:uuid] in that provider's block; omit if unknown",
    },
    variant_id: {
      type: "string",
      description: "When citing a specific variant, UUID from [variant_id:uuid] in that provider's block",
    },
    text_quote: {
      type: "string",
      description:
        "Optional: 20–120 chars copied verbatim from that provider's text in the cited section (same punctuation/spacing). Enables in-page highlight after the link opens. Omit if you cannot copy an exact substring.",
    },
  },
  required: ["provider", "section"],
  additionalProperties: false,
  };
}

function buildSynthesisSchema(providerLabels: string[]): Record<string, unknown> {
  const labelExamples = providerLabelExamples(providerLabels);
  const sourceRefsItemSchema = buildSourceRefsItemSchema(labelExamples);
  const sourceRefsArraySchema = {
    type: "array",
    maxItems: 8,
    items: sourceRefsItemSchema,
    description:
      "Optional: concrete page sections this point draws from (for deep links). Omit or [] if unsure.",
  };

  return {
    type: "object",
    properties: {
      overall_summary: {
        type: "string",
        description:
          "2–4 sentence narrative summarising what the AI models collectively found, noting the general level of agreement. If some analyses are pre-clarification drafts, mention that where relevant.",
      },
      consensus: {
        type: "array",
        description:
          "Points that ALL providers agree on (providers list must include every provider in this comparison). Include 2–6 items.",
        items: {
          type: "object",
          properties: {
            area: { type: "string", description: "Short label for this consensus point (e.g. 'Timeline risk')" },
            description: { type: "string", description: "What the models agree on and why it matters" },
            providers: {
              type: "array",
              items: { type: "string" },
              description: `Provider display names — use EXACTLY the ## header labels (${labelExamples}). For minority_opinions use exactly one provider per item.`,
            },
            source_refs: sourceRefsArraySchema,
          },
          required: ["area", "description", "providers"],
          additionalProperties: false,
        },
      },
      majority_view: {
        type: "array",
        description:
          "Points raised by more than half but NOT all providers — do not include here if all providers agree (use consensus instead). Include 0–4 items.",
        items: {
          type: "object",
          properties: {
            area: { type: "string" },
            description: { type: "string" },
            providers: {
              type: "array",
              items: { type: "string" },
              description: `Exact provider labels as in section headers (${labelExamples}).`,
            },
            source_refs: sourceRefsArraySchema,
          },
          required: ["area", "description", "providers"],
          additionalProperties: false,
        },
      },
      minority_opinions: {
        type: "array",
        description:
          "Points raised by only one provider that the others missed or downplayed. These are often the most valuable. Include 0–4 items.",
        items: {
          type: "object",
          properties: {
            area: { type: "string" },
            description: { type: "string" },
            providers: {
              type: "array",
              items: { type: "string" },
              description: `Exactly one string: which single model raised this minority view — same label as its ## header (${labelExamples}).`,
            },
            source_refs: sourceRefsArraySchema,
          },
          required: ["area", "description", "providers"],
          additionalProperties: false,
        },
      },
    },
    required: ["overall_summary", "consensus", "majority_view", "minority_opinions"],
    additionalProperties: false,
  };
}

function formatRunForPrompt(entry: RunEntry, allRuns: DecisionRunResult[]): string {
  const label = runProviderLabel(entry.run.llm_provider);
  const draftNote = entry.isDraft ? " *(pre-clarification draft — clarification questions not yet answered)*" : "";
  const lines: string[] = [
    `## ${label}${draftNote}`,
    "_Cite **source_refs** using section ∈ {risk, reversibility, people, brief, variants, context, research}. Match [research_id:…] and [variant_id:…] tags. When possible add **text_quote**: an exact contiguous copy from this block for that cite._",
  ];

  if (entry.brief) {
    if (entry.brief.summary?.trim()) {
      lines.push(`**Brief summary:** ${truncateSynthesis(entry.brief.summary, 400)}`);
    }
    lines.push(`**Recommendation:** ${entry.brief.recommendation}`);
    if (entry.brief.key_considerations?.length) {
      lines.push(`**Key considerations:**\n${entry.brief.key_considerations.map((c) => `- ${c}`).join("\n")}`);
    }
    if (entry.brief.next_steps?.length) {
      lines.push(`**Next steps:**\n${entry.brief.next_steps.map((s) => `- ${s}`).join("\n")}`);
    }
    const briefExtras = entry.brief.custom_sections?.filter(
      (s) => s.heading?.trim() && s.content?.trim()
    );
    if (briefExtras?.length) {
      lines.push(
        "**Additional brief sections (model-chosen appendices on this run):**\n" +
          briefExtras
            .map(
              (s) =>
                `- **${truncateSynthesis(s.heading.trim(), 80)}**: ${truncateSynthesis(s.content, 500)}`
            )
            .join("\n")
      );
    }
  }

  const comprehensive = entry.run.decision_brief_comprehensive;
  if (comprehensive) {
    lines.push("**Integrated brief (research + variants woven in):**");
    if (comprehensive.summary?.trim()) {
      lines.push(`Summary: ${truncateSynthesis(comprehensive.summary, 350)}`);
    }
    if (comprehensive.recommendation?.trim()) {
      lines.push(`Recommendation: ${truncateSynthesis(comprehensive.recommendation, 280)}`);
    }
    const compExtras = comprehensive.custom_sections?.filter(
      (s) => s.heading?.trim() && s.content?.trim()
    );
    if (compExtras?.length) {
      for (const s of compExtras) {
        lines.push(
          `- **${truncateSynthesis(s.heading.trim(), 80)}**: ${truncateSynthesis(s.content, 400)}`
        );
      }
    }
  }

  for (const out of entry.lensOutputs) {
    if (out.lens === "risk") {
      if (out.top_risks?.length)
        lines.push(`**Top risks:**\n${out.top_risks.map((r) => `- ${r}`).join("\n")}`);
      if (out.blind_spots?.length)
        lines.push(`**Blind spots:**\n${out.blind_spots.map((b) => `- ${b.area}: ${b.description}`).join("\n")}`);
    } else if (out.lens === "reversibility") {
      if (out.irreversible_steps?.length)
        lines.push(`**Irreversible steps:**\n${out.irreversible_steps.map((s) => `- ${s}`).join("\n")}`);
      if (out.safe_to_try_first?.length)
        lines.push(`**Safe to try first:**\n${out.safe_to_try_first.map((s) => `- ${s}`).join("\n")}`);
    } else if (out.lens === "people") {
      if (out.stakeholder_impacts?.length)
        lines.push(`**Stakeholder impacts:**\n${out.stakeholder_impacts.map((s) => `- ${s.stakeholder} (${s.sentiment}): ${s.impact}`).join("\n")}`);
      if (out.execution_risks?.length)
        lines.push(`**Execution risks:**\n${out.execution_risks.map((r) => `- ${r}`).join("\n")}`);
    }
    if (out.tradeoffs?.length)
      lines.push(`**Tradeoffs:**\n${out.tradeoffs.map((t) => `- ${t.option}: ↑ ${t.upside} / ↓ ${t.downside}`).join("\n")}`);
    if (out.remaining_uncertainty?.length)
      lines.push(`**Remaining uncertainty:**\n${out.remaining_uncertainty.map((u) => `- ${u}`).join("\n")}`);
  }

  const variants = variantsForLane(entry.run, allRuns);
  if (variants.length > 0) {
    lines.push(
      "**Saved format variants (alternate briefs on this run):**\n" +
        variants
          .map((v) => {
            const bits = [`- [variant_id:${v.variant_id}] **${v.label}** — ${truncateSynthesis(v.format_instruction, 140)}`];
            if (v.decision_brief?.summary) bits.push(`  Brief summary: ${truncateSynthesis(v.decision_brief.summary, 220)}`);
            const vSections = v.decision_brief?.custom_sections?.filter(
              (s) => s.heading?.trim() && s.content?.trim()
            );
            for (const cs of vSections ?? []) {
              bits.push(
                `  Custom section “${truncateSynthesis(cs.heading.trim(), 60)}”: ${truncateSynthesis(cs.content, 320)}`
              );
            }
            return bits.join("\n");
          })
          .join("\n")
    );
  }

  const rcs = researchCompletionsForLane(entry.run, allRuns);
  if (rcs.length > 0) {
    const researchLines: string[] = ["**Research completed on this provider's run:**"];
    for (const rc of rcs.slice(0, 5)) {
      const head = rc.title?.trim() || rc.label || "Research";
      const chunk: string[] = [`### ${head}`, `[research_id:${rc.research_id}]`];
      if (rc.summary) chunk.push(`Key finding: ${truncateSynthesis(rc.summary, 200)}`);
      if (rc.main_answer) {
        chunk.push(
          rc.main_answer.length > 450
            ? truncateSynthesis(rc.main_answer, 450)
            : rc.main_answer.trim()
        );
      } else if (rc.sections?.length) {
        for (const s of rc.sections.slice(0, 2)) {
          chunk.push(
            `**${s.heading}:** ${s.body.length > 280 ? truncateSynthesis(s.body, 280) : s.body.trim()}`
          );
        }
      }
      researchLines.push(chunk.join("\n"));
    }
    lines.push(researchLines.join("\n\n"));
  }

  return lines.join("\n\n");
}

function buildSynthesisPrompt(
  entries: RunEntry[],
  allRuns: DecisionRunResult[],
  inventory: SynthesisInputInventory
): LLMMessage[] {
  const first = entries[0].run;
  const providerNames = entries.map((e) => runProviderLabel(e.run.llm_provider)).join(", ");
  const hasDrafts = entries.some((e) => e.isDraft);
  const canonicalRuns = entries.map((e) => e.run);
  const researchInventory = formatResearchInventoryForBrief(canonicalRuns, allRuns);
  const variantInventory = formatVariantInventoryForBrief(canonicalRuns, allRuns);

  const draftWarning = hasDrafts
    ? `\nNote: some analyses below are pre-clarification drafts (marked). They represent the model's first-pass analysis before follow-up questions were answered. Weight final analyses more heavily, but drafts still carry useful signal — especially for consensus points that appear in both draft and final form.\n`
    : "";

  const variantRequirement =
    inventory.variant_count > 0
      ? `\n\n**Required when variants exist (${inventory.variant_count} in inventory):** Include at least one **minority_opinion** or **majority_view** item that explicitly names a saved format variant (use its label from the inventory or provider block) and add \`source_refs\` with \`section\`: \`"variants"\` and the matching \`variant_id\`. Do not skip all variant material because lens summaries look similar.`
      : "";

  const systemPrompt = `You are a meta-analyst comparing decision analyses produced by different AI models (${providerNames}).
${draftWarning}
Your job is to identify:
- **Consensus**: what all (or nearly all) models agree on — high-confidence signals
- **Majority view**: what most but not all models say — worth noting
- **Minority opinions**: what only one model raised — potentially the most valuable, as it may catch something the others missed

If research findings, saved format variants, or **additional brief sections** appear under only one provider's block, treat those as first-class evidence: they often belong in **minority_opinions** (if unique to that model) or **majority_view** (if most but not all), not only in broad **consensus**. Do not ignore provider-only appendices or research because the three lenses look similar.

If research findings or saved format variants are provided under a provider, incorporate them into your synthesis — reference them when they support, challenge, or add nuance to the lens/brief comparison. Attribute observations to the correct provider section.

When you can tie a consensus, majority, or minority point to a **specific subsection** (a lens, the brief, a research task, a variant, or intake context), populate **source_refs** on that JSON item so the product can show deep links into each provider's run.

When you add a source_ref, also set **text_quote** whenever you can: copy a **short exact substring** (roughly 25–100 characters) from that provider's passage in this prompt for that section — same characters as in the source, not a paraphrase. That substring is used to scroll the reader to the relevant sentence in the UI. If you cannot match verbatim text, omit **text_quote**.

Be specific. Reference the actual content of each analysis. Do not pad with generalities.${variantRequirement}`;

  const inventoryBlocks = [researchInventory, variantInventory].filter(Boolean).join("\n\n");

  const userContent = `## Decision being analysed

**Situation:** ${first.intake.situation}
**Constraints:** ${first.intake.constraints}
**Posture:** ${first.intake.posture}${first.intake.posture === "pressure_test" && "leaning_direction" in first.intake ? ` · Leaning toward: ${(first.intake as { leaning_direction: string }).leaning_direction}` : ""}

---

${inventoryBlocks ? `${inventoryBlocks}\n\n---\n\n` : ""}${entries.map((e) => formatRunForPrompt(e, allRuns)).join("\n\n---\n\n")}

---

## JSON output rules for provider attribution
In **every** consensus, majority_view, and minority_opinions item, the \`providers\` array must contain **only** these exact strings (verbatim spelling and capitalization), matching the ## headers above:
${entries.map((e) => `- ${runProviderLabel(e.run.llm_provider)}`).join("\n")}
- For **minority_opinions**, each item must include **exactly one** string: the model that alone raised that point. Do not omit \`providers\` or use aliases like "Google", "Claude", "GPT", or "Grok" — use the labels listed above.

### Optional \`source_refs\` (deep links for the UI)
When you can identify **where** the evidence lives, add \`source_refs\`: an array of up to 8 objects \`{ "provider": "<same label as ## header>", "section": "<one of the enum>", "research_id"?: "<uuid>", "variant_id"?: "<uuid>", "text_quote"?: "<verbatim substring from that section>" }\`.
- **section** must be one of: \`risk\`, \`reversibility\`, \`people\`, \`brief\`, \`variants\`, \`context\`, \`research\`.
- For **research**, include \`research_id\` copied from the \`[research_id:…]\` line under that research heading for that provider.
- For a **specific variant**, use \`section\`: \`variants\` and \`variant_id\` from \`[variant_id:…]\` in that provider's block or the Variant inventory.
- **context** = intake / situation block (\`#rc-context\`). **risk** / **reversibility** / **people** = those lens panels; **brief** = decision brief; **variants** = extra variant sections on that run.
- **text_quote**: optional; must be an **exact** contiguous span from that provider's quoted material in this prompt for the cited section (helps the UI highlight the right sentence).
- Omit \`source_refs\` or use \`[]\` if you are unsure.

---

Compare these ${entries.length} canonical provider analyses (${inventory.compared_run_count} runs; ${inventory.variant_count} saved variant${inventory.variant_count === 1 ? "" : "s"}; ${inventory.research_count} research task${inventory.research_count === 1 ? "" : "s"} in inventory). Identify consensus, majority views, and minority opinions across the models.${
    inventory.research_count > 0 || inventory.variant_count > 0
      ? " Use the Research and Variant inventory rows plus per-provider sections—they may surface angles not visible in the base lens summaries alone."
      : ""
  }${
    entries.some(
      (e) =>
        (e.brief?.custom_sections?.length ?? 0) > 0 ||
        (e.run.decision_brief_comprehensive?.custom_sections?.length ?? 0) > 0
    )
      ? " When only one provider has additional brief sections, research, or variants on a theme, call that out explicitly (usually minority_opinions or majority_view)."
      : ""
  }${inventory.variant_count > 0 ? " You MUST cite at least one saved format variant as described in the system instructions." : ""}`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

interface RawSynthesisPoint {
  area?: string;
  description?: string;
  providers?: string[];
  source_refs?: unknown;
}

interface RawSynthesisOutput {
  overall_summary?: string;
  consensus?: RawSynthesisPoint[];
  majority_view?: RawSynthesisPoint[];
  minority_opinions?: RawSynthesisPoint[];
}

function normalizeSourceRefSection(raw: string): SynthesisSourceRef["section"] | null {
  const t = raw.toLowerCase().trim().replace(/\s+/g, "_");
  const aliases: Record<string, SynthesisSourceRef["section"]> = {
    risk: "risk",
    risk_lens: "risk",
    reversibility: "reversibility",
    reversibility_lens: "reversibility",
    people: "people",
    people_lens: "people",
    brief: "brief",
    decision_brief: "brief",
    variants: "variants",
    variant: "variants",
    context: "context",
    intake: "context",
    research: "research",
    research_output: "research",
  };
  return aliases[t] ?? null;
}

function sanitizeTextQuote(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 8) return undefined;
  return t.slice(0, 220);
}

function normalizeSourceRefs(
  raw: unknown,
  allowedProviderLabels: Set<string>,
  entries: RunEntry[]
): SynthesisSourceRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const researchIdsByProvider = new Map<string, Set<string>>();
  const variantIdsByProvider = new Map<string, Set<string>>();
  for (const e of entries) {
    const lab = runProviderLabel(e.run.llm_provider);
    researchIdsByProvider.set(
      lab,
      new Set((e.run.research_completions ?? []).map((r) => r.research_id).filter(Boolean))
    );
    variantIdsByProvider.set(
      lab,
      new Set((e.run.variants ?? []).map((v) => v.variant_id).filter(Boolean))
    );
  }

  const out: SynthesisSourceRef[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const provider = String(r.provider ?? "").trim();
    if (!allowedProviderLabels.has(provider)) continue;
    const section = normalizeSourceRefSection(String(r.section ?? ""));
    if (!section) continue;
    let research_id = typeof r.research_id === "string" ? r.research_id.trim() : undefined;
    if (section === "research" && research_id) {
      const allowed = researchIdsByProvider.get(provider);
      if (!allowed?.has(research_id)) research_id = undefined;
    } else {
      research_id = undefined;
    }
    let variant_id = typeof r.variant_id === "string" ? r.variant_id.trim() : undefined;
    if (section === "variants" && variant_id) {
      const allowed = variantIdsByProvider.get(provider);
      if (!allowed?.has(variant_id)) variant_id = undefined;
    } else {
      variant_id = undefined;
    }
    const text_quote = sanitizeTextQuote(r.text_quote);
    const ref: SynthesisSourceRef = { provider, section, research_id, variant_id };
    if (text_quote) ref.text_quote = text_quote;
    out.push(ref);
  }
  return out.length > 0 ? out : undefined;
}

function parseSynthesisOutput(
  parsed: unknown,
  entries: RunEntry[],
  meta: { input_fingerprint: string; input_inventory: SynthesisInputInventory }
): ProviderSynthesis {
  const raw = (parsed && typeof parsed === "object" ? parsed : {}) as RawSynthesisOutput;
  const totalProviders = new Set(
    entries.map((e) => runProviderLabel(e.run.llm_provider))
  ).size;

  const allowedLabels = new Set(entries.map((e) => runProviderLabel(e.run.llm_provider)));

  function canonicalProviderLabels(rawProviders: string[] | undefined): LLMProviderName[] {
    const out: string[] = [];
    for (const p of rawProviders ?? []) {
      const trimmed = String(p).trim();
      let label = normalizeSynthesisProviderLabel(trimmed);
      if (!label && allowedLabels.has(trimmed)) label = trimmed;
      if (!label) {
        for (const allowed of allowedLabels) {
          if (allowed.toLowerCase() === trimmed.toLowerCase()) {
            label = allowed;
            break;
          }
        }
      }
      if (!label) {
        const sl = trimmed.toLowerCase();
        const slugs: LLMProviderName[] = ["openai", "anthropic", "gemini", "xai"];
        for (const slug of slugs) {
          const L = runProviderLabel(slug);
          if (allowedLabels.has(L) && sl === trimmed.toLowerCase()) {
            label = L;
            break;
          }
        }
      }
      if (label && allowedLabels.has(label) && !out.includes(label)) out.push(label);
    }
    return out as LLMProviderName[];
  }

  function toPoints(items: RawSynthesisPoint[] | undefined): SynthesisPoint[] {
    return (items ?? []).map((item) => {
      const pt: SynthesisPoint = {
        area: item.area?.trim() ?? "",
        description: item.description?.trim() ?? "",
        providers: canonicalProviderLabels(item.providers),
      };
      const refs = normalizeSourceRefs(item.source_refs, allowedLabels, entries);
      if (refs) pt.source_refs = refs;
      return pt;
    });
  }

  const rawConsensus = toPoints(raw.consensus);
  const rawMajority = toPoints(raw.majority_view);

  // Move any majority_view items where all providers are cited into consensus
  const promotedToConsensus: SynthesisPoint[] = [];
  const trueMajority: SynthesisPoint[] = [];
  for (const point of rawMajority) {
    if (point.providers.length >= totalProviders) {
      promotedToConsensus.push(point);
    } else {
      trueMajority.push(point);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    run_ids: entries.map((e) => e.run.run_id),
    providers: entries.map((e) => e.run.llm_provider ?? "openai"),
    has_drafts: entries.some((e) => e.isDraft),
    input_fingerprint: meta.input_fingerprint,
    input_inventory: meta.input_inventory,
    overall_summary: raw.overall_summary?.trim() ?? "",
    consensus: [...rawConsensus, ...promotedToConsensus],
    majority_view: trueMajority,
    minority_opinions: toPoints(raw.minority_opinions),
  };
}

function synthesisCitesVariants(synthesis: ProviderSynthesis): boolean {
  const points = [
    ...synthesis.consensus,
    ...synthesis.majority_view,
    ...synthesis.minority_opinions,
  ];
  if (
    points.some((p) =>
      p.source_refs?.some((r) => r.section === "variants" && r.variant_id?.trim())
    )
  ) {
    return true;
  }
  const text = [
    synthesis.overall_summary,
    ...points.map((p) => `${p.area} ${p.description}`),
  ]
    .join(" ")
    .toLowerCase();
  return /\bvariant\b/.test(text) || /\bformat variant\b/.test(text);
}

/**
 * Prepare runs for synthesis: pick the best available lens outputs per run.
 * Complete runs use final lens_outputs; others use lens_outputs_first_draft.
 */
export function prepareRunEntries(runs: DecisionRunResult[]): RunEntry[] {
  return runs.map((run) => {
    const isDraft = run.status !== "complete";
    const lensOutputs = isDraft
      ? (run.lens_outputs_first_draft ?? run.lens_outputs ?? [])
      : (run.lens_outputs ?? []);
    const brief = isDraft ? run.decision_brief_first_draft : run.decision_brief;
    return { run, isDraft, lensOutputs, brief };
  });
}

export async function runProviderSynthesis(
  canonicalRuns: DecisionRunResult[],
  allRuns: DecisionRunResult[],
  meta: { input_fingerprint: string; input_inventory: SynthesisInputInventory }
): Promise<ProviderSynthesis> {
  if (canonicalRuns.length < 2) {
    throw new Error("At least 2 runs are required for synthesis");
  }

  const entries = prepareRunEntries(canonicalRuns);
  const messages = buildSynthesisPrompt(entries, allRuns, meta.input_inventory);
  const providerLabels = entries.map((e) => runProviderLabel(e.run.llm_provider));
  const schema = buildSynthesisSchema(providerLabels);

  const response = await anthropic.run(messages, {
    schema,
    temperature: 0.4,
    maxTokens: 3072,
  });

  if (!response.parsed) {
    throw new Error("Synthesis did not return valid structured output");
  }

  let synthesis = parseSynthesisOutput(response.parsed, entries, meta);

  if (meta.input_inventory.variant_count > 0 && !synthesisCitesVariants(synthesis)) {
    const repair = await anthropic.run(
      [
        ...messages,
        {
          role: "user",
          content:
            `Your previous JSON omitted saved format variants entirely. The Variant inventory lists ${meta.input_inventory.variant_count} variant(s). Regenerate the FULL JSON. You MUST add at least one minority_opinion or majority_view item that names a variant by label, summarizes its distinctive angle, and includes source_refs with section "variants" and the correct variant_id from [variant_id:…] tags.`,
        },
      ],
      { schema, temperature: 0.3, maxTokens: 3072 }
    );
    if (repair.parsed) {
      synthesis = parseSynthesisOutput(repair.parsed, entries, meta);
    }
  }

  return synthesis;
}
