/**
 * Condensed context from other decision runs (other providers/postures) for chat,
 * so the active model can compare against sibling analyses.
 */

import type { DecisionRunResult, LensOutput } from "@/types/decision";
import { runPostureLabel, runProviderLabel } from "@/lib/run-display-name";

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function appendLensCompact(lines: string[], lensOutputs: LensOutput[]) {
  if (!lensOutputs?.length) return;
  lines.push("\nLens highlights:");
  for (const lens of lensOutputs) {
    if (lens.lens === "risk") {
      const r = lens as {
        top_risks?: string[];
        assumptions_detected?: string[];
        blind_spots?: { area: string; description: string }[];
        tradeoffs?: { option: string; upside: string; downside: string }[];
        remaining_uncertainty?: string[];
      };
      if (r.top_risks?.length) lines.push("- Risks: " + truncate(r.top_risks.join("; "), 400));
      if (r.blind_spots?.length)
        lines.push(
          "- Blind spots: " +
            truncate(r.blind_spots.map((b) => `${b.area}: ${b.description}`).join("; "), 350)
        );
      if (r.tradeoffs?.length)
        lines.push(
          "- Tradeoffs: " +
            truncate(r.tradeoffs.map((t) => `${t.option} (↑${t.upside}, ↓${t.downside})`).join("; "), 350)
        );
      if (r.remaining_uncertainty?.length)
        lines.push("- Open: " + truncate(r.remaining_uncertainty.join("; "), 280));
    }
    if (lens.lens === "reversibility") {
      const rev = lens as { irreversible_steps?: string[]; safe_to_try_first?: string[] };
      if (rev.irreversible_steps?.length)
        lines.push("- Irreversible: " + truncate(rev.irreversible_steps.join("; "), 280));
      if (rev.safe_to_try_first?.length)
        lines.push("- Safe first: " + truncate(rev.safe_to_try_first.join("; "), 280));
    }
    if (lens.lens === "people") {
      const p = lens as {
        stakeholder_impacts?: { stakeholder: string; impact: string; sentiment: string }[];
        execution_risks?: string[];
      };
      if (p.stakeholder_impacts?.length)
        lines.push(
          "- Stakeholders: " +
            truncate(
              p.stakeholder_impacts.map((s) => `${s.stakeholder} (${s.sentiment}): ${s.impact}`).join("; "),
              400
            )
        );
      if (p.execution_risks?.length)
        lines.push("- Execution risks: " + truncate(p.execution_risks.join("; "), 280));
    }
  }
}

function formatOneSiblingRun(run: DecisionRunResult, maxChars: number): string {
  const lens_outputs =
    run.lens_outputs?.length > 0 ? run.lens_outputs : run.lens_outputs_first_draft ?? [];

  const lines: string[] = [];
  const header = `${runProviderLabel(run.llm_provider)} · ${runPostureLabel(run.intake.posture)}`;
  lines.push(`### Other run: ${header}`);
  lines.push(`Status: ${run.status}`);
  if (run.intake.posture === "pressure_test" && "leaning_direction" in run.intake && run.intake.leaning_direction) {
    lines.push(`Leaning toward: ${run.intake.leaning_direction}`);
  }

  if (lens_outputs.length > 0) {
    appendLensCompact(lines, lens_outputs);
  } else {
    lines.push("\n(No lens output on this run yet.)");
  }

  const brief = run.decision_brief ?? run.decision_brief_first_draft;
  if (brief) {
    lines.push("\nBrief (that run):");
    if (brief.summary) lines.push("Summary: " + truncate(brief.summary, 450));
    if (brief.recommendation) lines.push("Recommendation: " + truncate(brief.recommendation, 280));
    if (brief.key_considerations?.length)
      lines.push("Key considerations: " + truncate(brief.key_considerations.join("; "), 400));
    const extras = brief.custom_sections?.filter((s) => s.heading?.trim() && s.content?.trim());
    if (extras?.length) {
      lines.push("\nAdditional brief sections:");
      for (const s of extras) {
        lines.push(`- **${truncate(s.heading.trim(), 80)}**: ${truncate(s.content, 500)}`);
      }
    }
  }

  if (run.clarification_questions?.length) {
    lines.push("\nFollow-up questions that model raised:");
    run.clarification_questions.forEach((q, i) => {
      lines.push(`${i + 1}. [${q.lens}] ${truncate(q.question_text, 220)}`);
    });
  }

  if (run.clarifications?.length) {
    const last = run.clarifications[run.clarifications.length - 1];
    if (last.answers?.length) {
      lines.push("\nUser clarifications recorded on that run:");
      last.answers.forEach((a, i) => {
        const q = run.clarification_questions?.find(
          (cq) => cq.question_id === a.question_id && cq.lens === a.lens
        );
        const qText = q?.question_text ?? `(${a.lens})`;
        const answer = typeof a.answer === "boolean" ? (a.answer ? "Yes" : "No") : String(a.answer);
        lines.push(`${i + 1}. ${truncate(qText, 120)}: ${truncate(answer, 200)}`);
      });
    }
  }

  if (run.research_completions?.length) {
    lines.push("\nResearch completed on that run:");
    for (const rc of run.research_completions) {
      const head = rc.title?.trim() || rc.label || "Research";
      lines.push(`\n- **${head}**`);
      if (rc.summary) lines.push(`  Finding: ${truncate(rc.summary, 200)}`);
      if (rc.main_answer) {
        lines.push(`  Excerpt: ${truncate(rc.main_answer, 420)}`);
      } else if (rc.sections?.length) {
        for (const s of rc.sections.slice(0, 2)) {
          lines.push(`  ${s.heading}: ${truncate(s.body, 240)}`);
        }
      }
    }
  }

  if (run.variants?.length) {
    lines.push("\nSaved analysis variants on that run:");
    for (const v of run.variants) {
      lines.push(`- **${v.label}** (${truncate(v.format_instruction, 140)})`);
      if (v.decision_brief?.summary) lines.push(`  Variant brief: ${truncate(v.decision_brief.summary, 200)}`);
    }
  }

  let out = lines.join("\n");
  if (out.length > maxChars) {
    out = out.slice(0, maxChars - 1).replace(/\s+\S*$/, "") + "…";
  }
  return out;
}

const DEFAULT_MAX_TOTAL = 14_000;

/**
 * Markdown appendix: other runs for the same `decision_id` (excluding `currentRunId`).
 * Returns null if there are no eligible siblings.
 */
export function buildSiblingRunsContextAppendix(
  currentRunId: string,
  allRuns: DecisionRunResult[],
  maxTotalChars: number = DEFAULT_MAX_TOTAL
): string | null {
  const siblings = allRuns
    .filter((r) => {
      if (r.run_id === currentRunId) return false;
      const hasAnalysis =
        (r.lens_outputs?.length ?? 0) > 0 ||
        (r.lens_outputs_first_draft?.length ?? 0) > 0 ||
        Boolean(r.decision_brief ?? r.decision_brief_first_draft);
      return hasAnalysis;
    })
    .sort((a, b) => {
      const pa = runProviderLabel(a.llm_provider);
      const pb = runProviderLabel(b.llm_provider);
      if (pa !== pb) return pa.localeCompare(pb);
      return runPostureLabel(a.intake.posture).localeCompare(runPostureLabel(b.intake.posture));
    });

  if (siblings.length === 0) return null;

  const perRun = Math.min(5_000, Math.max(1_800, Math.floor(maxTotalChars / siblings.length)));
  const blocks = siblings.map((r) => formatOneSiblingRun(r, perRun));
  let body = blocks.join("\n\n---\n\n");
  if (body.length > maxTotalChars) {
    body = body.slice(0, maxTotalChars - 1).replace(/\s+\S*$/, "") + "…\n\n_[Sibling context truncated for size.]_";
  }

  return `## Other models' runs (same decision — comparison only)

The structured sections **above** this block describe **this chat's run** (the analysis attached to the conversation you are in). Each subsection below is a **separate run** (often a different AI provider or posture) on the same decision. The user may ask you to compare, agree or disagree, or suggest reconciling differences. Attribute findings to the provider/posture named in each heading (e.g. "In Anthropic's run…"). Do not claim you authored the other runs' text.

${body}`;
}
