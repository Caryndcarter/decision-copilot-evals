/**
 * Parse [SUGGEST_FORMAT: ...] from model output. Gemini often wraps tags in **markdown**,
 * which breaks naive regex; normalize before matching. Inner text may contain `]` (e.g.
 * "phases [1–3]") — use bracket-depth matching, not [^\]]+.
 */

export function normalizeSuggestFormatSource(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/^```(?:\w*)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();
  s = s.replace(/\uFF3B/g, "[").replace(/\uFF3D/g, "]");
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(/\*+(\[SUGGEST_FORMAT:)/gi, "$1")
      .replace(/(\])\*+/gi, "$1")
      .replace(/_+(\[SUGGEST_FORMAT:)/gi, "$1")
      .replace(/(\])_+/gi, "$1");
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * First `[SUGGEST_FORMAT: ...]` with bracket-balanced closing `]`.
 * Returns inner text and span in `normalized` for stripping.
 */
export function extractBalancedSuggestFormat(normalized: string): { inner: string; start: number; end: number } | null {
  const re = /\[SUGGEST_FORMAT:\s*/i;
  const m = re.exec(normalized);
  if (!m || m.index === undefined) return null;
  const openIdx = m.index;
  let depth = 0;
  for (let j = openIdx; j < normalized.length; j++) {
    const c = normalized[j];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        const inner = stripSuggestInnerJunk(normalized.slice(re.lastIndex, j));
        if (inner.length === 0) return null;
        return { inner, start: openIdx, end: j + 1 };
      }
    }
  }
  return null;
}

function stripSuggestInnerJunk(inner: string): string {
  return inner
    .trim()
    .replace(/^[\s"'「『]+/u, "")
    .replace(/[\s"'」』*_]+$/u, "")
    .replace(/\u201c|\u201d/g, "")
    .trim();
}

/**
 * Balanced tag first; if the model truncated before `]` (common with Gemini / token limits),
 * recover inner text from the remainder of the string so the UI does not show a broken tag
 * in the prose bubble or lightbulb line.
 */
export function extractSuggestFormatSpan(normalized: string): { inner: string; start: number; end: number } | null {
  const balanced = extractBalancedSuggestFormat(normalized);
  if (balanced?.inner && balanced.inner.trim().length > 0) {
    return balanced;
  }

  const re = /\[SUGGEST_FORMAT:\s*/i;
  const m = re.exec(normalized);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  const contentStart = re.lastIndex;
  const after = normalized.slice(contentStart);
  if (after.indexOf("]") !== -1) {
    return null;
  }

  const inner = stripSuggestInnerJunk(after);
  if (inner.length < 2) return null;
  return { inner, start, end: normalized.length };
}

/** Unbracketed `SUGGEST_FORMAT: ...` line/block (fallback). */
function extractUnbracketedSuggestFormat(normalized: string): string | null {
  const unbracketed = normalized.match(/SUGGEST_FORMAT:\s*([\s\S]+?)(?:\n\n|$)/i);
  if (!unbracketed) return null;
  const text = unbracketed[1].replace(/\s+/g, " ").trim().replace(/^[\[\]"']+|[\]\]"']+$/g, "");
  return text.length > 2 ? text : null;
}

/**
 * Normalize what the client sends for variant creation: inner `[SUGGEST_FORMAT: …]` when present,
 * else unbracketed tag line, else trimmed raw text.
 */
export function resolveVariantFormatInstruction(raw: string): string {
  const s = normalizeSuggestFormatSource(raw ?? "");
  const span = extractSuggestFormatSpan(s);
  if (span?.inner?.trim()) {
    return span.inner.replace(/\s+/g, " ").trim();
  }
  const u = extractUnbracketedSuggestFormat(s);
  if (u?.trim()) {
    return u.replace(/\s+/g, " ").trim();
  }
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Heuristic check for "the model ran out of tokens mid-sentence" so the reflect endpoint
 * can drop garbage before it reaches the user. Triggers when the text:
 *   - has no sentence-terminating punctuation, AND
 *   - ends with a stop word a sentence shouldn't end on (preposition, conjunction, article,
 *     auxiliary verb, etc).
 * Designed to be cheap and language-specific to English; false negatives are fine — the
 * goal is to catch the obvious truncations like "...financial implications of each".
 */
const TRAILING_STOP_WORDS = new Set([
  "a", "an", "the",
  "and", "or", "but", "nor", "so", "yet",
  "of", "to", "in", "on", "at", "by", "for", "from", "with", "without",
  "into", "onto", "over", "under", "as", "than", "then", "vs", "vs.",
  "is", "are", "was", "were", "be", "been", "being",
  "which", "that", "who", "whom", "whose",
  "if", "while", "when", "where", "because",
  "their", "his", "her", "our", "your", "my", "its",
]);

export function isLikelyTruncated(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  const lastChar = t[t.length - 1];
  if (/[.!?:\])"]/.test(lastChar)) return false;
  const tail = t.toLowerCase().match(/([a-z][a-z.'-]*)$/);
  if (!tail) return false;
  return TRAILING_STOP_WORDS.has(tail[1]);
}

/**
 * Strip residual SUGGEST_FORMAT scaffolding that the bracket parser sometimes leaves behind
 * when the model's output uses unusual whitespace, mixed brackets, or repeated tags. The UI
 * displays this string verbatim, so we have to guarantee it never starts with the literal
 * `[SUGGEST_FORMAT:` token (or ends with a stray closing `]`).
 */
function stripResidualTagWrapper(text: string): string {
  let out = text.trim();
  for (let i = 0; i < 3; i++) {
    const next = out
      .replace(/^[\s*_`"'\[]+/, "")
      .replace(/^SUGGEST_FORMAT\s*:\s*/i, "")
      .replace(/[\s*_`"'\]]+$/u, "")
      .trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

/** For reflect API: null means [NO_SUGGESTION] or empty. */
export function parseReflectionSuggestion(raw: string): string | null {
  const s = normalizeSuggestFormatSource(raw);
  if (!s) return null;
  if (/\[NO_SUGGESTION\]/i.test(s) || /^\s*NO_SUGGESTION\s*$/i.test(s)) {
    return null;
  }
  let result: string | null = null;
  const span = extractSuggestFormatSpan(s);
  if (span?.inner) {
    const text = span.inner.replace(/\s+/g, " ").trim();
    if (text.length > 0) result = text;
  }
  if (!result) {
    result = extractUnbracketedSuggestFormat(s);
  }
  if (!result) return null;
  const cleaned = stripResidualTagWrapper(result);
  return cleaned.length > 1 ? cleaned : null;
}

/** Short line for the amber “suggested format” card; full string is still used for variant creation. */
export function displayFormatSuggestionLabel(inner: string, maxLen = 72): string {
  const t = inner.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLen * 0.45 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

/**
 * Strip placeholder brackets and light markdown from the format tag so the variant chip doesn’t show
 * literal [TEXT] or **bold** from model templates.
 */
export function sanitizeFormatSuggestionForDisplay(inner: string): string {
  let s = inner.replace(/\s+/g, " ").trim();
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/\[(?:TEXT|TITLE|LABEL|PHRASE|SHORT\s*LABEL|YOUR\s*(?:TEXT|PHRASE))\]/gi, "");
  s = s.replace(/\[[A-Z][A-Z0-9_\s-]{0,32}\]/g, (full) => full.slice(1, -1).replace(/_/g, " ").toLowerCase());
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Prefer first ~sentence of assistant prose for the chip; else cleaned format tag. */
function leadPhraseFromProse(prose: string): string {
  const t = prose.replace(/\s+/g, " ").trim();
  if (t.length < 20) return "";
  const m = t.match(/^(.{15,}?[.!?:])(\s+|$)/);
  if (m) return m[1].replace(/:\s*$/, "").trim();
  return t.length > 120 ? displayFormatSuggestionLabel(t, 100) : t;
}

/**
 * Single short line for the amber card: summarizes chat prose when present, otherwise a cleaned
 * truncation of the format tag. Does not repeat the full message.
 */
export function variantSuggestionChipLine(prose: string, formatInner: string, maxLen = 80): string {
  const cleanedTag = sanitizeFormatSuggestionForDisplay(formatInner);
  const lead = leadPhraseFromProse(prose);
  const source = lead.length >= 20 ? lead : cleanedTag;
  return displayFormatSuggestionLabel(source, maxLen);
}

function stripNoSuggestionNoise(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\[NO_SUGGESTION\]$/i.test(t)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove any leftover `[SUGGEST_FORMAT: …]` blocks (duplicate tags, markdown drift). */
function stripResidualSuggestFormatBlocks(text: string): string {
  let out = text;
  for (let i = 0; i < 6; i++) {
    const n = normalizeSuggestFormatSource(out);
    const span = extractSuggestFormatSpan(n);
    if (!span) break;
    out = (n.slice(0, span.start) + n.slice(span.end)).trim();
  }
  return stripNoSuggestionNoise(out);
}

function normalizeLoose(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * When the model repeats the format line as a final paragraph (or the body is only an echo of the tag),
 * drop that duplication so the chat bubble and amber card are not redundant.
 */
function removeEchoedFormatProse(prose: string, formatInner: string): string {
  const a = prose.trim();
  const b = normalizeLoose(formatInner);
  if (!a || b.length < 35) return prose;

  const parts = a.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (parts.length === 0) return prose;

  if (parts.length === 1) {
    const single = normalizeLoose(parts[0]);
    // Only drop a lone paragraph if it is essentially the same text as the tag (Gemini/OpenAI sometimes
    // repeat the format line as the whole message). Do not use substring overlap — that wipes real 1-para explanations.
    if (single === b) return "";
    return prose;
  }

  const lastRaw = parts[parts.length - 1];
  const last = normalizeLoose(lastRaw);
  if (last.length < 28) return prose;

  const echo =
    last === b ||
    (last.length >= 50 &&
      b.length >= 50 &&
      (last.startsWith(b.slice(0, 50)) || b.startsWith(last.slice(0, 50))));
  if (echo) {
    return parts.slice(0, -1).join("\n\n").trim();
  }
  return prose;
}

/** For chat UI: split assistant message into optional format phrase and visible body text. */
export function parseFormatSuggestion(content: string): { suggestion: string | null; textContent: string } {
  const normalized = normalizeSuggestFormatSource(content);
  const span = extractSuggestFormatSpan(normalized);
  if (span?.inner) {
    const suggestion = span.inner.replace(/\s+/g, " ").trim();
    if (suggestion.length > 0) {
      let textContent = normalized.slice(0, span.start) + normalized.slice(span.end);
      textContent = textContent.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      textContent = stripResidualSuggestFormatBlocks(textContent);
      textContent = removeEchoedFormatProse(textContent, suggestion);
      return { suggestion, textContent };
    }
  }
  const unbracketed = extractUnbracketedSuggestFormat(normalized);
  if (unbracketed) {
    let stripped = normalized.replace(/SUGGEST_FORMAT:\s*[\s\S]+?(?:\n\n|$)/i, "").trim();
    stripped = stripResidualSuggestFormatBlocks(stripped);
    stripped = removeEchoedFormatProse(stripped, unbracketed);
    return { suggestion: unbracketed, textContent: stripped };
  }
  return { suggestion: null, textContent: content.trim() };
}
