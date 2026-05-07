import { NextRequest, NextResponse } from "next/server";
import { getRun, replaceRun } from "@/lib/db/runs";
import { runRiskLens, runReversibilityLens, runPeopleLens } from "@/lenses";
import { runBriefSynthesis } from "@/lenses/brief";
import type { DecisionRunResult, RunVariant, LensOutput, LLMProviderName } from "@/types/decision";
import { resolveVariantFormatInstruction, sanitizeFormatSuggestionForDisplay } from "@/lib/suggest-format-tag";
import { v4 as uuid } from "uuid";

/**
 * Run all lenses in parallel for variant creation
 */
async function runLensesForVariant(
  run: DecisionRunResult,
  provider: LLMProviderName
): Promise<LensOutput[]> {
  const [risk, reversibility, people] = await Promise.all([
    runRiskLens(run.intake, run.clarifications, provider),
    runReversibilityLens(run.intake, run.clarifications, provider),
    runPeopleLens(run.intake, run.clarifications, provider),
  ]);
  return [risk, reversibility, people];
}

const VARIANT_TAB_LABEL_MAX = 56;

function truncateTabLabel(s: string, maxLen: number): string {
  const t = s.trim().replace(/^#+\s*/, "").trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLen * 0.45 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

function formatSuggestsWorksheetOrClassification(s: string): boolean {
  const x = s.toLowerCase();
  return (
    /\bworksheet\b/.test(x) ||
    /\bclassification\b/.test(x) ||
    /\bchecklist\b/.test(x) ||
    /\bself[- ]?assessment\b/.test(x) ||
    /\bscoring\s+sheet\b/.test(x) ||
    /\brubric\b/.test(x) ||
    /\btier\b.*\brisk\b|\brisk\b.*\btier\b/.test(x)
  );
}

function headingSoundsLikeTimeline(h: string): boolean {
  return /\b(timeline|milestones?|phased?\s+(roadmap|rollout)|gantt|quarterly\s+roadmap)\b/i.test(h);
}

function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/** Model-written section titles that read like chat (“I’ll create…”) are poor tab labels — use the format phrase. */
function headingLooksConversational(h: string): boolean {
  const plain = stripInlineMarkdown(h.replace(/^#+\s*/, "").trim());
  if (plain.length < 10) return false;
  return (
    /^(i['']?ll|i will|let me|here['']s|here is|this will|i can|i could|we(['']ll| will))\b/i.test(plain) ||
    /^(i['']?ll|i will)\s+create\b/i.test(plain) ||
    /^creating\s+(a|an|the)\b/i.test(plain) ||
    /^i['']?d\s+like\s+to\b/i.test(plain) ||
    /^sure[,!]?\s/i.test(plain)
  );
}

/**
 * Heuristic tab label from the user's format instruction (fallback only).
 * Uses word boundaries so substrings like "cost" inside unrelated words don't win,
 * and "timeline" doesn't steal labels when the request is really a worksheet/matrix.
 */
function labelFromFormatInstruction(formatInstruction: string): string {
  const cleaned = sanitizeFormatSuggestionForDisplay(formatInstruction);
  const instruction = cleaned.toLowerCase();

  if (formatSuggestsWorksheetOrClassification(cleaned)) {
    return truncateTabLabel(cleaned, VARIANT_TAB_LABEL_MAX);
  }
  if (/\bcommunication\b/.test(instruction) && /\bplan\b/.test(instruction)) return "With Communication Plan";
  if (/\bstakeholder\b/.test(instruction) && /\bcommunication\b/.test(instruction)) return "With Communication Plan";
  if (/\bcomparison\b/.test(instruction) || /\bmatrix\b/.test(instruction)) return "With Comparison Matrix";
  if (/\bcost\b/.test(instruction) && /\b(breakdown|model|estimate)\b/.test(instruction)) return "With Cost Breakdown";
  if (/\bcontingenc/.test(instruction)) return "With Contingency Plans";
  if (/\brisk\b/.test(instruction) && /\bmitigation\b/.test(instruction)) return "With Risk Playbook";
  if (/\bmetric\b/.test(instruction) || /\bsuccess\b.*\bmetric\b|\bmetric\b.*\bsuccess\b/.test(instruction)) {
    return "With Success Metrics";
  }
  if (/\btimeline\b/.test(instruction) || /\bmilestone\b/.test(instruction)) return "With Timeline";

  return truncateTabLabel(cleaned, VARIANT_TAB_LABEL_MAX);
}

/**
 * Tab label: prefer the brief's actual section heading (matches what the user sees inside the variant).
 * If the model titles the section like a timeline but the user asked for a worksheet/classification,
 * use the format instruction so the chip matches intent (common with EU AI Act / tiering asks).
 */
function generateVariantLabel(formatInstruction: string, customSectionHeading?: string): string {
  const hRaw = customSectionHeading?.trim().replace(/^#+\s*/, "").trim();
  if (hRaw && hRaw.length > 0 && !/^decision brief$/i.test(hRaw) && !/^additional section$/i.test(hRaw)) {
    if (headingLooksConversational(hRaw)) {
      return labelFromFormatInstruction(formatInstruction);
    }
    if (headingSoundsLikeTimeline(hRaw) && formatSuggestsWorksheetOrClassification(formatInstruction)) {
      return labelFromFormatInstruction(formatInstruction);
    }
    const hDisplay = stripInlineMarkdown(hRaw);
    return truncateTabLabel(hDisplay, VARIANT_TAB_LABEL_MAX);
  }
  return labelFromFormatInstruction(formatInstruction);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { run_id, format_instruction } = body as {
      run_id?: string;
      format_instruction?: string;
    };

    if (!run_id?.trim()) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }
    const formatInstructionResolved = resolveVariantFormatInstruction(format_instruction ?? "");
    if (!formatInstructionResolved) {
      return NextResponse.json({ error: "format_instruction is required" }, { status: 400 });
    }

    const run = await getRun(run_id.trim());
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status !== "complete" && run.status !== "pending_brief") {
      const clarification =
        run.status === "awaiting_clarification" || run.status === "processing_clarification";
      return NextResponse.json(
        {
          error: clarification
            ? "Finish clarification first; brief variants are available once this run is complete or the brief is ready."
            : "Can only create variants when the run is complete or the brief is pending (not during earlier steps).",
        },
        { status: 400 }
      );
    }

    const provider = run.llm_provider ?? "openai";

    // Re-run lenses (they may produce slightly different output, which is fine)
    const lensOutputs = await runLensesForVariant(run, provider);

    // Run brief synthesis with format instruction
    console.log("[Variant] Creating variant with format instruction:", formatInstructionResolved);
    let brief = await runBriefSynthesis(
      run.intake,
      lensOutputs,
      run.clarifications,
      provider,
      formatInstructionResolved
    );
    console.log("[Variant] Brief custom_sections:", brief.custom_sections);

    // User asked for one thing—keep only one section so we don't show an unwanted timeline etc.
    if (brief.custom_sections && brief.custom_sections.length > 1) {
      brief = { ...brief, custom_sections: [brief.custom_sections[0]] };
    }

    // Ensure at least one custom section so the variant tab never appears empty
    if (!brief.custom_sections?.length) {
      brief = {
        ...brief,
        custom_sections: [
          {
            heading:
              formatInstructionResolved.length > 60
                ? formatInstructionResolved.slice(0, 60) + "…"
                : formatInstructionResolved,
            content: "This section is based on your request. The content could not be generated automatically—consider editing the brief to add the details.",
          },
        ],
      };
    }

    const firstSectionHeading = brief.custom_sections?.[0]?.heading?.trim();

    // Create the variant (explicit copy so custom_sections serializes reliably)
    const variant: RunVariant = {
      variant_id: uuid(),
      label: generateVariantLabel(formatInstructionResolved, firstSectionHeading),
      format_instruction: formatInstructionResolved,
      lens_outputs: lensOutputs,
      decision_brief: {
        ...brief,
        custom_sections: [...(brief.custom_sections ?? [])],
      },
      created_at: new Date().toISOString(),
    };

    // Add to run's variants array
    const updatedRun: DecisionRunResult = {
      ...run,
      variants: [...(run.variants ?? []), variant],
    };

    await replaceRun(run_id.trim(), updatedRun);

    return NextResponse.json({
      success: true,
      variant_id: variant.variant_id,
      run: updatedRun
    });

  } catch (error) {
    console.error("Variant creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
