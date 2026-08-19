import type { DecisionBrief, DecisionIntake } from "@/types/decision";

export function formatBriefForAudit(b: DecisionBrief): string {
  const lines: string[] = [];
  if (b.title) lines.push(`# ${b.title}`);
  if (b.summary) {
    lines.push("\n## Summary");
    lines.push(b.summary);
  }
  if (b.recommendation) {
    lines.push("\n## Recommendation");
    lines.push(b.recommendation);
  }
  if (b.key_considerations?.length) {
    lines.push("\n## Key considerations");
    for (const c of b.key_considerations) lines.push(`- ${c}`);
  }
  if (b.next_steps?.length) {
    lines.push("\n## Next steps");
    for (const s of b.next_steps) lines.push(`- ${s}`);
  }
  if (b.custom_sections?.length) {
    for (const section of b.custom_sections) {
      lines.push(`\n## ${section.heading}`);
      lines.push(section.content);
    }
  }
  return lines.join("\n").trim();
}

export function formatIntakeForAudit(intake: DecisionIntake): string {
  const lines: string[] = [];
  lines.push(`Posture: ${intake.posture}`);
  if ("leaning_direction" in intake && intake.leaning_direction) {
    lines.push(`Stated lean / direction: ${intake.leaning_direction}`);
  }
  lines.push("\n## Situation");
  lines.push(intake.situation);
  lines.push("\n## Constraints");
  lines.push(intake.constraints);
  if (intake.knowns_assumptions?.trim()) {
    lines.push("\n## Knowns & assumptions");
    lines.push(intake.knowns_assumptions);
  }
  if (intake.unknowns?.trim()) {
    lines.push("\n## Unknowns");
    lines.push(intake.unknowns);
  }
  return lines.join("\n").trim();
}
