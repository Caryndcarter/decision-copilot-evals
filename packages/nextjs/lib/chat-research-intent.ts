/**
 * Detect free-form chat messages that should use the research pipeline (structured reply + Research output),
 * even when the client did not send research_starter (no preset / Research toggle).
 */

/** Strong signals the user wants external knowledge, comparisons, or desk research—not only Q&A on the embedded analysis. */
const RESEARCH_HINT =
  /\b(compare|comparison|versus|vs\.?|alternative(s)?|benchmark|industry|case stud|white\s*paper|peer|migration\s+path|rollout|vendor(s)?|pricing|market\s|regulatory|compliance\s+framework|best practice|playbook|reference architecture|how\s+do\s+(other|companies|teams|orgs)|what\s+do\s+(other|companies|teams)|desk\s+research|literature|survey|statistics|evidence|third[- ]party|competitor|tooling|tech\s+stack|evaluate\s+options|pros\s+and\s+cons|tradeoffs?\s+between|look\s+up|search\s+for|official\s+doc|documentation|engineering\s+blog|public\s+source|external|outside\s+the\s+analysis|examples?\s+of|learn about|overview of|deep\s+dive|investigate)\b/i;

/**
 * Often means "explain our run output," not a research task—unless research hints also appear.
 */
const ANALYSIS_ONLY_HINT =
  /\b(this analysis|the brief|the\s+lens|above analysis|risk lens|people lens|reversibility lens|what\s+does\s+the\s+analysis|why\s+did\s+you\s+list|summarize\s+(the|my)\s+(analysis|brief|risks)\b)/i;

export function looksLikeFreeFormResearchRequest(message: string): boolean {
  const t = message.trim();
  if (t.length < 12) return false;
  // Short messages: only when the intent is clearly outward-looking
  if (t.length < 28) return RESEARCH_HINT.test(t);
  if (ANALYSIS_ONLY_HINT.test(t) && !RESEARCH_HINT.test(t)) return false;
  if (RESEARCH_HINT.test(t)) return true;
  // Long, exploratory questions often want broader context even without buzzwords
  if (t.length >= 200 && /\?/.test(t) && /\b(options|approaches|strategies|examples|typical|usually|often|landscape|ecosystem)\b/i.test(t)) {
    return true;
  }
  return false;
}

/** Short title for Research output panel (first line, trimmed length). */
export function researchLabelFromUserMessage(message: string): string {
  const line = message.split(/\r?\n/).find((l) => l.trim().length > 0) ?? message;
  const t = line.trim();
  if (t.length <= 100) return t;
  return `${t.slice(0, 97)}…`;
}
