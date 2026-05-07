import type { ResearchCompletion, ResearchSection } from "@/types/decision";

const DELIM = "\nRESEARCH_SECTIONS_JSON\n";

/** Insert a markdown sources block before `RESEARCH_SECTIONS_JSON` so Part 2 JSON still parses. */
export function insertWebSearchSourcesBeforeTrailer(
  raw: string,
  sources: { title?: string; uri: string }[],
): string {
  if (!sources.length) return raw;
  const seen = new Map<string, { title?: string; uri: string }>();
  for (const s of sources) {
    if (s.uri && !seen.has(s.uri)) seen.set(s.uri, s);
  }
  const lines = [...seen.values()].map((s) => {
    const label = (s.title ?? s.uri).replace(/\]/g, "\\]");
    return `- [${label}](${s.uri})`;
  });
  const footer = `### Sources (web)\n${lines.join("\n")}`;
  const idx = raw.lastIndexOf(DELIM);
  if (idx === -1) return `${raw.trimEnd()}\n\n${footer}`;
  const jsonPart = raw.slice(idx + DELIM.length);
  return `${raw.slice(0, idx).trimEnd()}\n\n${footer}\n${DELIM}${jsonPart}`;
}

/** NBSP, ZWSP, word joiner, BOM — often slip through .trim() but render as empty. */
const INVISIBLE_CHARS = /[\u00a0\u200b\u200c\u200d\u2060\ufeff]/g;

/**
 * True if the string has visible content after stripping invisible Unicode and trimming.
 */
export function isMeaningfulResearchText(s: string): boolean {
  return s.replace(INVISIBLE_CHARS, "").trim().length > 0;
}

/**
 * Parse the JSON `sections` array. Returns null if the value is not a valid array of section objects.
 * Empty array [] is valid (model chose no supplementary blocks).
 */
function parseSupplementarySections(raw: unknown): ResearchSection[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  const out: ResearchSection[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const h = (row as { heading?: unknown }).heading;
    const b = (row as { body?: unknown }).body;
    if (typeof h !== "string" || typeof b !== "string") return null;
    const heading = h.trim() || "Section";
    const body = b.trim();
    if (!isMeaningfulResearchText(body)) continue;
    out.push({ heading, body });
  }
  return out;
}

/** Strip optional ```json ... ``` wrapper the model sometimes adds */
function unwrapJsonFence(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  const lines = t.split("\n");
  if (lines.length < 2) return t;
  const first = lines[0].replace(/^```\w*/, "").trim();
  if (first) return t;
  const last = lines[lines.length - 1].trim();
  if (last !== "```") return t;
  return lines.slice(1, -1).join("\n").trim();
}

/**
 * Split assistant reply into main markdown and optional supplementary JSON sections.
 * Expected trailer: {"sections":[...]} — sections may be [].
 */
export function splitResearchStructuredResponse(raw: string): {
  displayContent: string;
  /** null if delimiter missing or JSON invalid; [] if model sent no extras; otherwise supplementary blocks only */
  supplementarySections: ResearchSection[] | null;
  /** True when delimiter present and JSON parsed with a valid `sections` array */
  jsonTrailerOk: boolean;
  /** 3–5 word model-generated title for this research topic, if present */
  title?: string;
  /** One-sentence model-generated summary of the key finding, if present */
  summary?: string;
} {
  const idx = raw.lastIndexOf(DELIM);
  if (idx === -1) {
    return { displayContent: raw.trimEnd(), supplementarySections: null, jsonTrailerOk: false };
  }

  const displayContent = raw.slice(0, idx).trimEnd();
  let jsonPart = raw.slice(idx + DELIM.length).trim();
  jsonPart = unwrapJsonFence(jsonPart);

  try {
    const parsed = JSON.parse(jsonPart) as { sections?: unknown; summary?: unknown; title?: unknown };
    if (!("sections" in parsed)) {
      return { displayContent, supplementarySections: null, jsonTrailerOk: false };
    }
    const supplementarySections = parseSupplementarySections(parsed.sections);
    if (supplementarySections === null) {
      return { displayContent, supplementarySections: null, jsonTrailerOk: false };
    }
    const title =
      typeof parsed.title === "string" && isMeaningfulResearchText(parsed.title)
        ? parsed.title.trim().slice(0, 80)
        : undefined;
    const summary =
      typeof parsed.summary === "string" && isMeaningfulResearchText(parsed.summary)
        ? parsed.summary.trim().slice(0, 200)
        : undefined;
    return { displayContent, supplementarySections, jsonTrailerOk: true, title, summary };
  } catch {
    return { displayContent, supplementarySections: null, jsonTrailerOk: false };
  }
}

const SUMMARY_MAX = 160;

/**
 * Extract a short summary sentence from free-form answer text.
 * Used as a fallback when the model doesn't output a `summary` field.
 */
export function deriveSummaryFromText(text: string): string | undefined {
  const cleaned = text.replace(INVISIBLE_CHARS, "").trim();
  if (!cleaned) return undefined;
  // Strip leading markdown headings
  const withoutHeading = cleaned.replace(/^#{1,4}\s+[^\n]+\n+/, "").trim();
  const source = withoutHeading || cleaned;
  // Find the first sentence (ends with . ! ?) that is substantive
  const sentenceMatch = source.match(/[^.!?\n]{20,}[.!?]/);
  const candidate = sentenceMatch ? sentenceMatch[0].trim() : source.split("\n")[0].trim();
  if (!candidate || candidate.length < 15) return undefined;
  return candidate.length <= SUMMARY_MAX ? candidate : candidate.slice(0, SUMMARY_MAX).replace(/\s+\S*$/, "") + "…";
}

/** When the model omits JSON, show the whole reply as one section in the panel. */
export function fallbackResearchSections(displayContent: string): ResearchSection[] {
  const t = displayContent.trim();
  const body = isMeaningfulResearchText(t) ? t : "(No content.)";
  return [{ heading: "Answer", body }];
}

const MAX_SECTION_BODY = 12000;
const MAX_SECTIONS = 12;

export function clampResearchSections(sections: ResearchSection[]): ResearchSection[] {
  return sections
    .filter((s) => isMeaningfulResearchText(s.body))
    .slice(0, MAX_SECTIONS)
    .map((s) => ({
      heading: s.heading.slice(0, 200),
      body: s.body.length > MAX_SECTION_BODY ? `${s.body.slice(0, MAX_SECTION_BODY)}…` : s.body,
    }));
}

const RESEARCH_CHAT_SUMMARY_MAX = 360;

/**
 * Short line(s) for the chat thread; full answer is stored only in research_completions.
 */
export function summarizeForResearchChat(
  displayContent: string,
  supplementarySections: ResearchSection[] | null
): string {
  const cleaned = displayContent.trim();
  if (isMeaningfulResearchText(cleaned)) {
    const firstBlock = cleaned.split(/\n\n+/)[0]?.trim() ?? cleaned;
    if (firstBlock.length <= RESEARCH_CHAT_SUMMARY_MAX) return firstBlock;
    const slice = firstBlock.slice(0, RESEARCH_CHAT_SUMMARY_MAX);
    const lastPeriod = slice.lastIndexOf(". ");
    if (lastPeriod > 80) return `${slice.slice(0, lastPeriod + 1).trim()}`;
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 60) return `${slice.slice(0, lastSpace).trim()}…`;
    return `${slice.trim()}…`;
  }
  const substantiveExtras = supplementarySections?.filter((s) => isMeaningfulResearchText(s.body)) ?? [];
  if (substantiveExtras.length > 0) {
    const s0 = substantiveExtras[0];
    const body = s0.body.trim();
    if (!body) return `${s0.heading} — see Research output for details.`;
    if (body.length <= 280) return `${s0.heading}: ${body}`;
    const slice = body.slice(0, 280);
    const lastSpace = slice.lastIndexOf(" ");
    return `${s0.heading}: ${lastSpace > 60 ? slice.slice(0, lastSpace) : slice}…`;
  }
  return "Research task completed — see Research output for the full answer.";
}

/** Same heading logic as the Research output panel: model title, else starter group · label. */
export function researchCompletionDisplayTitle(c: ResearchCompletion): string {
  const raw = c.title?.replace(INVISIBLE_CHARS, "").trim();
  if (raw && isMeaningfulResearchText(raw)) return raw.slice(0, 160);
  return c.group_title ? `${c.group_title} · ${c.label}` : c.label;
}

/** Structured summary if present, else first sentence from main answer. */
export function researchCompletionSummaryLine(c: ResearchCompletion): string | undefined {
  const s = c.summary?.replace(INVISIBLE_CHARS, "").trim();
  if (s && isMeaningfulResearchText(s)) return s.slice(0, 220);
  if (c.main_answer) return deriveSummaryFromText(c.main_answer);
  return undefined;
}

/**
 * For dropdowns and Research output headers: topic label / model title is the main line;
 * one-line summary (when present and distinct) is the smaller secondary line below.
 */
export function researchCompletionNavLines(c: ResearchCompletion): {
  primary: string;
  secondary?: string;
} {
  const heading = researchCompletionDisplayTitle(c).trim();
  const summary = researchCompletionSummaryLine(c)?.trim();

  if (summary) {
    const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
    const same = heading.length > 0 && norm(summary) === norm(heading);
    return {
      primary: heading || summary,
      secondary: !same ? summary : undefined,
    };
  }

  return { primary: heading || "Research" };
}
