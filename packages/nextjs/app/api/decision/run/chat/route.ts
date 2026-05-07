import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getRun, getRunsByDecisionId, replaceRun } from "@/lib/db/runs";
import { buildSiblingRunsContextAppendix } from "@/lib/sibling-runs-chat-context";
import { runPostureLabel, runProviderLabel } from "@/lib/run-display-name";
import { looksLikeFreeFormResearchRequest, researchLabelFromUserMessage } from "@/lib/chat-research-intent";
import {
  clampResearchSections,
  deriveSummaryFromText,
  fallbackResearchSections,
  insertWebSearchSourcesBeforeTrailer,
  isMeaningfulResearchText,
  splitResearchStructuredResponse,
  summarizeForResearchChat,
} from "@/lib/research-structured-response";
import { getClient } from "@/llm";
import type {
  DecisionRunResult,
  LensQuestion,
  DecisionBrief,
  ProviderSynthesis,
  ResearchCompletion,
} from "@/types/decision";

/** Optional override so chat can use current questions/answers (e.g. sidebar edits only in sessionStorage) */
interface ClarificationContextOverride {
  questions: LensQuestion[];
  answers: Record<string, string | number | boolean>;
}

function buildRunContext(
  result: DecisionRunResult,
  clarificationOverride?: ClarificationContextOverride,
  synthesis?: ProviderSynthesis
): string {
  const parts: string[] = [];

  parts.push("## Decision context");
  parts.push(`Situation: ${result.intake.situation}`);
  parts.push(`Constraints: ${result.intake.constraints}`);
  parts.push(`Posture: ${result.intake.posture}`);
  if (result.intake.leaning_direction) {
    parts.push(`Leaning toward: ${result.intake.leaning_direction}`);
  }
  if (result.intake.knowns_assumptions?.trim()) {
    parts.push(`What I know / am assuming: ${result.intake.knowns_assumptions}`);
  }
  if (result.intake.unknowns?.trim()) {
    parts.push(`What I don't know: ${result.intake.unknowns}`);
  }

  if (result.lens_outputs?.length) {
    parts.push("\n## Lens analysis");
    for (const lens of result.lens_outputs) {
      if (lens.lens === "risk") {
        const r = lens as {
          top_risks?: string[];
          assumptions_detected?: string[];
          blind_spots?: { area: string; description: string }[];
          tradeoffs?: { option: string; upside: string; downside: string }[];
          remaining_uncertainty?: string[];
        };
        if (r.top_risks?.length) parts.push("Top risks: " + r.top_risks.join("; "));
        if (r.assumptions_detected?.length) parts.push("Assumptions: " + r.assumptions_detected.join("; "));
        if (r.blind_spots?.length)
          parts.push("Blind spots: " + r.blind_spots.map((b) => `${b.area}: ${b.description}`).join("; "));
        if (r.tradeoffs?.length)
          parts.push(
            "Tradeoffs: " + r.tradeoffs.map((t) => `${t.option} (upside: ${t.upside}, downside: ${t.downside})`).join("; ")
          );
        if (r.remaining_uncertainty?.length)
          parts.push("Remaining uncertainty: " + r.remaining_uncertainty.join("; "));
      }
      if (lens.lens === "reversibility") {
        const rev = lens as { irreversible_steps?: string[]; safe_to_try_first?: string[] };
        if (rev.irreversible_steps?.length) parts.push("Irreversible steps: " + rev.irreversible_steps.join("; "));
        if (rev.safe_to_try_first?.length) parts.push("Safe to try first: " + rev.safe_to_try_first.join("; "));
      }
      if (lens.lens === "people") {
        const p = lens as {
          stakeholder_impacts?: { stakeholder: string; impact: string; sentiment: string }[];
          execution_risks?: string[];
        };
        if (p.stakeholder_impacts?.length)
          parts.push(
            "Stakeholder impacts: " +
              p.stakeholder_impacts.map((s) => `${s.stakeholder} (${s.sentiment}): ${s.impact}`).join("; ")
          );
        if (p.execution_risks?.length) parts.push("Execution risks: " + p.execution_risks.join("; "));
      }
    }
  }

  if (result.decision_brief) {
    parts.push("\n## Decision brief");
    parts.push(`Summary: ${result.decision_brief.summary}`);
    parts.push(`Recommendation: ${result.decision_brief.recommendation}`);
    if (result.decision_brief.key_considerations?.length) {
      parts.push("Key considerations: " + result.decision_brief.key_considerations.join("; "));
    }
    if (result.decision_brief.next_steps?.length) {
      parts.push("Next steps: " + result.decision_brief.next_steps.join("; "));
    }
    const extras = result.decision_brief.custom_sections?.filter((s) => s.heading?.trim() && s.content?.trim());
    if (extras?.length) {
      parts.push("\n### Additional brief sections (from the analysis model)");
      for (const s of extras) {
        const body =
          s.content.length > 4000 ? `${s.content.slice(0, 4000).replace(/\s+\S*$/, "")}…` : s.content;
        parts.push(`\n#### ${s.heading.trim()}\n${body}`);
      }
    }
  }

  const questions = clarificationOverride?.questions ?? result.clarification_questions ?? [];
  if (questions.length > 0) {
    parts.push("\n## Follow-up questions (from the analysis)");
    questions.forEach((q, i) => {
      parts.push(`${i + 1}. [${q.lens}] ${q.question_text}`);
    });
  }

  if (clarificationOverride?.answers && Object.keys(clarificationOverride.answers).length > 0 && questions.length > 0) {
    parts.push("\n## User's answers to follow-up questions (current)");
    questions.forEach((q, i) => {
      const key = `${q.lens}-${q.question_id}`;
      const raw = clarificationOverride.answers[key];
      if (raw === undefined) return;
      const answer = typeof raw === "boolean" ? (raw ? "Yes" : "No") : String(raw);
      parts.push(`${i + 1}. ${q.question_text}: ${answer}`);
    });
  } else if (result.clarifications?.length) {
    const last = result.clarifications[result.clarifications.length - 1];
    if (last.answers?.length) {
      parts.push("\n## User's answers to follow-up questions");
      last.answers.forEach((a, i) => {
        const q = result.clarification_questions?.find(
          (cq) => cq.question_id === a.question_id && cq.lens === a.lens
        );
        const qText = q?.question_text ?? `(${a.lens})`;
        const answer = typeof a.answer === "boolean" ? (a.answer ? "Yes" : "No") : String(a.answer);
        parts.push(`${i + 1}. ${qText}: ${answer}`);
      });
    }
  }

  if (result.research_completions?.length) {
    parts.push("\n## Research completed for this decision");
    parts.push("The user has run the following research tasks. Use these findings when answering follow-up questions.");
    for (const rc of result.research_completions) {
      parts.push(`\n### ${rc.label}`);
      if (rc.summary) parts.push(`Key finding: ${rc.summary}`);
      if (rc.main_answer) {
        const excerpt =
          rc.main_answer.length > 600 ? rc.main_answer.slice(0, 600).replace(/\s+\S*$/, "") + "…" : rc.main_answer;
        parts.push(excerpt);
      } else if (rc.sections?.length) {
        for (const s of rc.sections.slice(0, 3)) {
          parts.push(`**${s.heading}:** ${s.body.slice(0, 300)}${s.body.length > 300 ? "…" : ""}`);
        }
      }
    }
  }

  if (synthesis) {
    parts.push("\n## Cross-provider synthesis");
    parts.push(`Providers compared: ${synthesis.providers.join(", ")}`);
    parts.push(`Summary: ${synthesis.overall_summary}`);
    if (synthesis.consensus.length) {
      parts.push("Consensus points (all providers agree):");
      synthesis.consensus.forEach((p) => parts.push(`- ${p.area}: ${p.description}`));
    }
    if (synthesis.majority_view.length) {
      parts.push("Majority view (most providers):");
      synthesis.majority_view.forEach((p) => parts.push(`- ${p.area}: ${p.description}`));
    }
    if (synthesis.minority_opinions.length) {
      parts.push("Minority opinions (one provider only):");
      synthesis.minority_opinions.forEach((p) =>
        parts.push(`- ${p.area} [${p.providers.join(", ")}]: ${p.description}`)
      );
    }
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      run_id,
      messages = [],
      newMessage,
      clarification_questions,
      clarification_answers,
      variant_id,
      decision_brief_override,
      synthesis,
      research_starter,
    } = body as {
      run_id?: string;
      messages?: { role: "user" | "assistant"; content: string }[];
      newMessage?: string;
      clarification_questions?: LensQuestion[];
      clarification_answers?: Record<string, string | number | boolean>;
      variant_id?: string;
      decision_brief_override?: DecisionBrief;
      synthesis?: ProviderSynthesis;
      research_starter?: { label: string; group_title?: string };
    };

    if (!run_id?.trim()) {
      return NextResponse.json({ error: "run_id is required" }, { status: 400 });
    }
    if (!newMessage?.trim()) {
      return NextResponse.json({ error: "newMessage is required" }, { status: 400 });
    }

    const run = await getRun(run_id.trim());
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    let contextRun: DecisionRunResult = run;
    if (variant_id?.trim()) {
      const variant = run.variants?.find((v) => v.variant_id === variant_id.trim());
      if (variant) {
        contextRun = {
          ...run,
          lens_outputs: variant.lens_outputs,
          decision_brief: variant.decision_brief,
        };
      }
    }
    if (decision_brief_override) {
      contextRun = {
        ...contextRun,
        decision_brief: decision_brief_override,
      };
    }

    const clarificationOverride =
      clarification_questions?.length && clarification_answers && Object.keys(clarification_answers).length > 0
        ? { questions: clarification_questions, answers: clarification_answers }
        : undefined;
    const primaryMeta = `You are **${runProviderLabel(run.llm_provider)}** in this chat, assisting on this decision run (${runPostureLabel(run.intake.posture)}). The next sections are **this run's** analysis and research until any "Other models' runs" block.\n\n`;
    const baseContext = primaryMeta + buildRunContext(contextRun, clarificationOverride, synthesis);

    const siblingRuns = await getRunsByDecisionId(run.decision_id);
    const siblingAppendix = buildSiblingRunsContextAppendix(run.run_id, siblingRuns);
    const context = siblingAppendix ? `${baseContext}\n\n${siblingAppendix}` : baseContext;

    const trimmedMessage = newMessage.trim();
    type ResearchStarterRef = { label: string; group_title?: string };
    const explicitStarter: ResearchStarterRef | undefined = research_starter?.label?.trim()
      ? {
          label: research_starter.label.trim(),
          ...(research_starter.group_title?.trim() ? { group_title: research_starter.group_title.trim() } : {}),
        }
      : undefined;
    const inferredStarter: ResearchStarterRef | undefined =
      !explicitStarter && looksLikeFreeFormResearchRequest(trimmedMessage)
        ? { label: researchLabelFromUserMessage(trimmedMessage) }
        : undefined;
    const effectiveStarter: ResearchStarterRef | undefined = explicitStarter ?? inferredStarter;
    const researchTurn = Boolean(effectiveStarter);
    const researchWebSearchEnabled =
      researchTurn && process.env.DECISION_COPILOT_DISABLE_RESEARCH_WEB_SEARCH !== "1";

    const analysisOnlySystem = (() => {
      const formatSuggestionInstruction =
        run.status === "complete" || run.status === "pending_brief"
          ? `

When the user asks to add a section, view, or format change (e.g. timeline, cost breakdown, milestones, comparison table):
1. First describe in 1–3 sentences what you would add and why it would help (e.g. "I'll add a timeline section that shows key milestones and target dates so you can see the sequence of steps." or "A cost breakdown by phase would clarify where the main spend falls."). Put the full explanation only in this prose—not inside the tag.
2. Then on a new line include exactly: [SUGGEST_FORMAT: <short label only, about 6–12 words — e.g. "Timeline of key milestones" or "Cost breakdown by phase">]
   The tag must be a brief title the UI can show in one line. Do not paste your whole explanation into the tag, and do not repeat the same long sentence in both the prose and the tag.
   The line MUST end with a closing square bracket ] right after the short phrase—no trailing quotation mark, markdown, or text after the ]. Do not truncate the tag mid-bracket.
Do not respond with only "Good suggestion" or only the format marker. For any other questions, do not include [SUGGEST_FORMAT].`
          : `

**Brief variants:** The run is not finalized yet (e.g. awaiting or processing clarification, or analysis still in progress). The product cannot create alternate brief formats until the run is complete or the brief is ready. If the user asks for an extra section, timeline, matrix, or "variant", reply in plain prose only—describe what could be added later—and do **not** include [SUGGEST_FORMAT: ...] or imply they can create a variant in the app right now.`;
      const siblingHint = siblingAppendix
        ? `\n- The context may include **Other models' runs** below the primary analysis. When the user compares providers, asks whether you agree with another model, or wants reconciling views, use those sections explicitly and attribute them by provider/posture (e.g. "OpenAI's run surfaced…"). You are answering as **this chat's model** for the primary run only—do not claim you produced the sibling runs' text.`
        : "";

      return `You are a helpful assistant for someone working through a decision. You have structured analysis of their decision below.

- For questions about the analysis itself, answer directly from the context provided.
- For related research questions (industry comparisons, technology options, pricing, vendor tradeoffs, common patterns, etc.), draw on your general knowledge and connect findings to their specific situation, risks, and constraints.
- You cannot browse the web. Do not fabricate specific URLs. You can suggest search queries, well-known documentation areas, or categories of sources to look up, and flag when the user should verify current pricing or details themselves.
- Only decline when the question is genuinely unrelated to the decision or any domain that could inform it.${siblingHint}${formatSuggestionInstruction}

${context}`;
    })();

    const researchWebBlock = researchWebSearchEnabled
      ? `**Live web:** This turn may use the provider’s real-time web search. Use retrieved material in your answer; cite URLs when you rely on them; say when the user should verify dates, pricing, or policy details themselves.`
      : `**No live web:** You cannot browse the web or verify current pages. Do not fabricate specific URLs or "I read article X" claims. Offer concrete search queries, categories of sources to open, or well-known documentation areas; say when the user should confirm dates or details themselves.`;

    const researchSiblingHint = siblingAppendix
      ? "\n**Other provider runs:** The context may include other models' analyses for the same decision—use them when the user asks about agreement, disagreement, or how your research relates to those findings. Attribute those runs by provider/posture.\n"
      : "";

    const researchSystemPreamble = `You are a research assistant helping someone who is working through a decision. Their message is a **research-style** request (preset starter, Research mode, or a free-form question that needs external knowledge or comparisons).

**Scope:** You are **not** limited to the decision analysis below. Draw on general knowledge: industry patterns, migration or rollout approaches, common risks, vendor or product ecosystem context, and what kinds of public material typically helps (official docs, engineering blogs, case studies, community write-ups). Do **not** refuse the topic as outside the provided context.

${researchWebBlock}
${researchSiblingHint}
**Grounding:** Use the decision context below to tailor examples and connect findings to their risks, stakeholders, constraints, and open questions when relevant.

${context}`;

    const researchFormatBlock = `

## Research reply format (required for this turn)
The user sent a **research-style** request (starter, explicit Research mode, or inferred desk-research question).

**Part 1 — Main answer (markdown, before the delimiter):** Write your **complete** response here: findings, reasoning, caveats, and how to find or validate sources. This is the **only** place for full narrative—the reader treats this as the primary write-up. Do not hold back detail here because of Part 2.

**Part 2 — After the main answer:** On its own line, output exactly:
RESEARCH_SECTIONS_JSON
Then one raw JSON object (no markdown code fence) with this exact shape:
{"title":"3-5 word label for this research (e.g. 'Vercel vs AWS cost')","summary":"one sentence capturing the key finding or bottom line (max 20 words)","sections":[{"heading":"short title","body":"markdown or plain text"}, ...]}

The "title" field is required: write a 3–5 word label that names the research topic clearly, like a document title. Examples: "Vercel vs AWS cost", "Slack to Teams migration risks", "VP sales replacement options". Do not restate the full question.

The "summary" field is required: write a single sentence (max 20 words) that captures the most important takeaway or bottom line from your answer — something substantive, not a restatement of the question. Example: "Vercel costs 3-5x more than Fargate at scale; the gap widens past ~10M requests/month."

Use Part 2 **only** for *extra* scannable material that is **not** already covered in the main answer—for example: a tight bullet list of suggested search queries or resource types, a small comparison table, a checklist, a timeline, or short definitions. **Do not** summarize, restate, or paraphrase the main answer in these sections. If nothing qualifies, output exactly: {"title":"…","summary":"…","sections":[]}

Use at most **6** sections in Part 2 when needed. Do not put the delimiter or JSON inside Part 1.`;

    const systemContent = researchTurn ? researchSystemPreamble + researchFormatBlock : analysisOnlySystem;

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemContent },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: newMessage.trim() },
    ];

    const client = getClient(run.llm_provider ?? "openai");
    const response = await client.run(chatMessages, {
      temperature: 0.5,
      maxTokens: researchTurn ? (researchWebSearchEnabled ? 4096 : 2048) : 1536,
      enableWebSearch: researchWebSearchEnabled,
    });

    const ws = response.webSearch?.sources;
    const rawForSplit =
      researchTurn && ws && ws.length > 0
        ? insertWebSearchSourcesBeforeTrailer(response.content, ws)
        : response.content;

    const { displayContent, supplementarySections, jsonTrailerOk, title: researchTitle, summary } =
      splitResearchStructuredResponse(rawForSplit);
    const fullAnswerText = displayContent.trim() || rawForSplit.trim();

    let research_completions: ResearchCompletion[] = [...(run.research_completions ?? [])];
    let assistantMessage: {
      role: "assistant";
      content: string;
      research_completion_id?: string;
    };

    if (researchTurn && effectiveStarter) {
      const research_id = randomUUID();
      const mainProse = displayContent.trim();
      const sectionsToStore = jsonTrailerOk
        ? clampResearchSections(supplementarySections ?? [])
        : clampResearchSections(fallbackResearchSections(fullAnswerText));
      const summaryLine = summary ?? (mainProse ? deriveSummaryFromText(mainProse) : undefined);
      const entry: ResearchCompletion = {
        research_id,
        label: effectiveStarter.label,
        ...(effectiveStarter.group_title?.trim() ? { group_title: effectiveStarter.group_title.trim() } : {}),
        ...(researchTitle ? { title: researchTitle } : {}),
        ...(summaryLine ? { summary: summaryLine } : {}),
        completed_at: new Date().toISOString(),
        ...(sectionsToStore.length > 0 ? { sections: sectionsToStore } : {}),
        ...(jsonTrailerOk && isMeaningfulResearchText(mainProse) ? { main_answer: mainProse } : {}),
      };
      research_completions = [...research_completions, entry];
      const chatSummary = summarizeForResearchChat(fullAnswerText, jsonTrailerOk ? supplementarySections : null);
      assistantMessage = {
        role: "assistant",
        content: chatSummary,
        research_completion_id: research_id,
      };
    } else {
      assistantMessage = { role: "assistant", content: fullAnswerText };
    }

    const updatedMessages = [
      ...(run.chat_messages ?? []),
      { role: "user" as const, content: newMessage.trim() },
      assistantMessage,
    ];

    await replaceRun(run_id.trim(), { ...run, chat_messages: updatedMessages, research_completions });

    return NextResponse.json({
      content: assistantMessage.content,
      research_completion_id: assistantMessage.research_completion_id,
      research_completions,
    });
  } catch (error) {
    console.error("Decision run chat error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("API_KEY") && message.includes("not set")) {
      return NextResponse.json(
        {
          error:
            "The AI provider for this run is not configured. Add the required API key to your .env (e.g. ANTHROPIC_API_KEY or OPENAI_API_KEY).",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}
