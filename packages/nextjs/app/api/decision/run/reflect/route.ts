import { NextRequest, NextResponse } from "next/server";
import { getRun } from "@/lib/db/runs";
import { getClient } from "@/llm";
import { parseReflectionSuggestion } from "@/lib/suggest-format-tag";
import type { DecisionRunResult } from "@/types/decision";
import { postureRequiresLeaning } from "@/types/decision";

/**
 * Build a summary of the run for the LLM to evaluate
 */
function buildReflectionContext(run: DecisionRunResult): string {
  const parts: string[] = [];

  parts.push("## Decision context");
  parts.push(`Situation: ${run.intake.situation}`);
  parts.push(`Constraints: ${run.intake.constraints}`);
  parts.push(`Posture: ${run.intake.posture}`);
  if (postureRequiresLeaning(run.intake.posture) && run.intake.leaning_direction) {
    parts.push(`Leaning toward: ${run.intake.leaning_direction}`);
  }
  if (run.intake.knowns_assumptions) {
    parts.push(`What they know/assume: ${run.intake.knowns_assumptions}`);
  }
  if (run.intake.unknowns) {
    parts.push(`What they don't know: ${run.intake.unknowns}`);
  }

  if (run.lens_outputs?.length) {
    parts.push("\n## Analysis lenses");
    for (const lens of run.lens_outputs) {
      parts.push(`\n### ${lens.lens.charAt(0).toUpperCase() + lens.lens.slice(1)} lens`);
      parts.push(`Confidence: ${lens.confidence}`);

      if (lens.lens === "risk") {
        const r = lens as { top_risks?: string[] };
        if (r.top_risks?.length) parts.push("Top risks: " + r.top_risks.join("; "));
      }
      if (lens.lens === "reversibility") {
        const rev = lens as { irreversible_steps?: string[]; safe_to_try_first?: string[] };
        if (rev.irreversible_steps?.length) parts.push("Irreversible steps: " + rev.irreversible_steps.join("; "));
        if (rev.safe_to_try_first?.length) parts.push("Safe to try first: " + rev.safe_to_try_first.join("; "));
      }
      if (lens.lens === "people") {
        const p = lens as { stakeholder_impacts?: { stakeholder: string; impact: string; sentiment: string }[]; execution_risks?: string[] };
        if (p.stakeholder_impacts?.length) parts.push("Stakeholder impacts: " + p.stakeholder_impacts.map((s) => `${s.stakeholder} (${s.sentiment}): ${s.impact}`).join("; "));
        if (p.execution_risks?.length) parts.push("Execution risks: " + p.execution_risks.join("; "));
      }

      if (lens.assumptions_detected?.length) parts.push("Assumptions: " + lens.assumptions_detected.join("; "));
      if (lens.blind_spots?.length) parts.push("Blind spots: " + lens.blind_spots.map((b) => `${b.area}: ${b.description}`).join("; "));
      if (lens.tradeoffs?.length) parts.push("Tradeoffs: " + lens.tradeoffs.map((t) => `${t.option}`).join("; "));
    }
  }

  if (run.decision_brief) {
    parts.push("\n## Decision brief");
    parts.push(`Title: ${run.decision_brief.title}`);
    parts.push(`Summary: ${run.decision_brief.summary}`);
    parts.push(`Recommendation: ${run.decision_brief.recommendation}`);
    if (run.decision_brief.key_considerations?.length) {
      parts.push("Key considerations: " + run.decision_brief.key_considerations.join("; "));
    }
    if (run.decision_brief.next_steps?.length) {
      parts.push("Next steps: " + run.decision_brief.next_steps.join("; "));
    }
  }

  const variants = run.variants?.filter((v) => v.label?.trim() || v.format_instruction?.trim()) ?? [];
  if (variants.length > 0) {
    parts.push("\n## Analysis variants already created");
    parts.push(
      "The user already has these format variants (do NOT suggest duplicating or trivially rephrasing the same addition):",
    );
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      parts.push(`\n### Variant ${i + 1}: ${v.label.trim() || "Untitled"}`);
      parts.push(`Format request used: ${v.format_instruction.trim()}`);
      const extras = v.decision_brief?.custom_sections?.filter((s) => s.heading?.trim()) ?? [];
      if (extras.length > 0) {
        parts.push(`Extra brief sections present: ${extras.map((s) => s.heading.trim()).join("; ")}`);
      }
    }
  }

  return parts.join("\n");
}

function normalizeAvoidSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.replace(/\s+/g, " ").trim();
    if (t.length < 2) continue;
    out.push(t.slice(0, 500));
    if (out.length >= 15) break;
  }
  return out;
}

const REFLECTION_SYSTEM_PROMPT = `You are reviewing a completed decision analysis. Your task is to suggest ONE additional section or format that would make this analysis more useful for the decision-maker.

Consider adding ONE of these when it fits this specific decision:
- Timeline or milestones (for time-sensitive or phased decisions)
- Cost breakdown or budget impact (when money is a factor)
- Stakeholder communication plan (when many people are affected)
- Risk mitigation playbook (when risks are high)
- Success metrics or KPIs (when outcomes are measurable)
- Contingency plans (when the outcome is uncertain)
- Comparison matrix (when choosing between clear options)

Rules:
1. Suggest exactly ONE addition that would genuinely help THIS decision (not generic filler).
2. Be specific: say what you'd add and in one sentence why it helps (e.g. "Timeline with phases so they can track progress" or "Cost breakdown to compare migration vs. staying").
3. If the context lists "Suggestions the user already passed on", do NOT repeat those ideas or trivially reword them—propose something clearly different in substance or angle.
4. If the context lists "Analysis variants already created", your suggestion MUST be a different kind of addition—not the same as any existing variant (e.g. do not suggest another timeline if a timeline variant already exists). Prefer something new or use [NO_SUGGESTION] if everything useful is already covered.
5. If the analysis is very simple or the decision is low-stakes, you may respond with [NO_SUGGESTION].
6. When in doubt, prefer suggesting—users can ignore it. Only use [NO_SUGGESTION] when the base analysis really is enough.

If you want to suggest an addition, your reply MUST include this tag on its own line (no markdown bold/code around the brackets):
[SUGGEST_FORMAT: <one short phrase or sentence: what you'd add and why>]

If the current format is clearly sufficient, reply MUST include:
[NO_SUGGESTION]

Hard requirements for the [SUGGEST_FORMAT: ...] line:
- Keep the phrase under 25 words. Be concrete and complete — not a fragment that ends in "of", "the", "for", etc.
- The line MUST end with the closing ] right after your phrase. Do not let the response cut off before the ].
- Do NOT wrap the tag in quotes, backticks, bold, or italics.
- Do not put any text after the closing ]. The whole reply should be the tag (optionally preceded by one short prose sentence).`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { run_id, avoid_suggestions } = body as { run_id?: string; avoid_suggestions?: unknown };

    if (!run_id?.trim()) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }

    const run = await getRun(run_id.trim());
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Only reflect when run is finished (complete or pending_brief)
    if (run.status !== "complete" && run.status !== "pending_brief") {
      return NextResponse.json({ suggestion: null, reason: "Run not complete" });
    }

    let context = buildReflectionContext(run);
    const skipped = normalizeAvoidSuggestions(avoid_suggestions);
    if (skipped.length > 0) {
      context += `\n\n## Suggestions the user already passed on\nThe user asked for a different idea and did not want these (do not repeat or lightly rephrase):\n${skipped.map((s) => `- ${s}`).join("\n")}`;
    }

    const messages = [
      { role: "system" as const, content: REFLECTION_SYSTEM_PROMPT },
      { role: "user" as const, content: `Here is the completed analysis:\n\n${context}\n\nShould this analysis have a different format or additional sections?` },
    ];

    const client = getClient(run.llm_provider ?? "openai");
    // 2048 tokens is plenty for one short suggestion line; the larger budget is mainly for
    // Gemini 2.5 Flash where "thinking" tokens are charged against the same maxOutputTokens
    // budget — at 512 the visible output was getting truncated mid-sentence.
    const response = await client.run(messages, { temperature: 0.3, maxTokens: 2048 });

    const content = response.content.trim();
    const finishReason = response.meta?.finishReason ?? "";
    const hitTokenCap = /^(MAX_TOKENS|max_tokens|length)$/i.test(finishReason);
    const hasBalancedTag = /\[SUGGEST_FORMAT:[^\]]*\]/i.test(content);

    // Truly truncated: model ran out of tokens AND never closed the tag. Anything else
    // (natural STOP, or a balanced tag somewhere in the response) is worth showing.
    if (hitTokenCap && !hasBalancedTag) {
      console.warn("Reflect endpoint: suggestion truncated by token limit", {
        finishReason,
        content: content.slice(0, 500),
      });
      return NextResponse.json({ suggestion: null });
    }

    const suggestion = parseReflectionSuggestion(content);

    if (suggestion) {
      // Belt-and-suspenders: parser cleanup should already strip this, but if anything
      // ever leaks the literal tag prefix into the user-facing string, drop it.
      if (/SUGGEST_FORMAT\s*:/i.test(suggestion)) {
        console.warn("Reflect endpoint: parser leaked tag", {
          finishReason,
          suggestion: suggestion.slice(0, 200),
          content: content.slice(0, 500),
        });
        return NextResponse.json({ suggestion: null });
      }
      return NextResponse.json({ suggestion });
    }

    console.warn("Reflect endpoint: could not parse suggestion", {
      finishReason,
      content: content.slice(0, 500),
    });
    return NextResponse.json({ suggestion: null });

  } catch (error) {
    console.error("Reflect endpoint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
