import type { CombinedClarificationQuestion } from "@/lib/merge-clarification-questions";

const STOP_WORDS = new Set([
  "what",
  "how",
  "the",
  "and",
  "for",
  "are",
  "your",
  "you",
  "this",
  "that",
  "with",
  "from",
  "have",
  "has",
  "been",
  "would",
  "will",
  "about",
  "any",
  "our",
  "been",
  "does",
  "there",
]);

/** Same-fact anchors — paraphrases sharing one anchor id ask for the same underlying fact. */
const FACT_ANCHORS: { id: string; test: RegExp }[] = [
  {
    id: "eu-ai-act-classification",
    test: /eu ai act.*(high.?risk|classif|limited risk|minimal risk|annex|risk tier)/i,
  },
  {
    id: "eu-ai-act-classification",
    test: /(high.?risk|classif|limited risk|minimal risk|annex|risk tier).*eu ai act/i,
  },
  {
    id: "gdpr-transfer",
    test: /gdpr.*(transfer|adequacy|scc|dpa|cross.?border)/i,
  },
  {
    id: "budget-cap",
    test: /\b(budget|spending cap|funding|cost ceiling)\b/i,
  },
  {
    id: "vpc-feasibility",
    test: /\b(feasib|viable)\b.*\b(vpc|self.?host|on.?prem)/i,
  },
  {
    id: "vpc-feasibility",
    test: /\b(vpc|self.?host|on.?prem).*\b(feasib|viable)/i,
  },
  {
    id: "engineering-effort",
    test: /\b(engineering effort|effort estimate|implementation effort|person.?months|sprints)\b/i,
  },
  {
    id: "team-readiness",
    test: /\b(team readiness|staff readiness|team capacity|ready to (operate|support|run))\b/i,
  },
  {
    id: "api-security-requirements",
    test: /\b(security requirement|non.?negotiable|constraint).*\b(api|third.?party)/i,
  },
  {
    id: "api-security-requirements",
    test: /\b(api|third.?party).*\b(security requirement|non.?negotiable|constraint)/i,
  },
  {
    id: "go-live-timeline",
    test: /\b(go.?live|launch date|deadline|timeline|when will)\b/i,
  },
  {
    id: "enterprise-rfp-ai-governance",
    test: /\b(rfp|rfps|request for proposal)\b.*\b(ai governance|governance|compliance|data security)/i,
  },
  {
    id: "enterprise-rfp-ai-governance",
    test: /\b(ai governance|governance|compliance|data security)\b.*\b(rfp|rfps|enterprise)/i,
  },
];

export function extractFactFingerprint(text: string): string | null {
  for (const anchor of FACT_ANCHORS) {
    if (anchor.test.test(text)) return anchor.id;
  }
  return null;
}

function normalizeTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\bhigh risk\b/g, "high-risk")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Short verbose paraphrases often score low on Jaccard but high on containment. */
function containment(a: Set<string>, b: Set<string>): number {
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  if (smaller.size === 0) return 0;
  let hit = 0;
  for (const t of smaller) {
    if (larger.has(t)) hit++;
  }
  return hit / smaller.size;
}

export function questionSimilarity(a: string, b: string): number {
  const ta = normalizeTokens(a);
  const tb = normalizeTokens(b);
  return Math.max(jaccard(ta, tb), containment(ta, tb) * 0.92);
}

export function averageMemberSimilarity(members: CombinedClarificationQuestion[]): number {
  if (members.length < 2) return 1;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      total += questionSimilarity(members[i]!.question_text, members[j]!.question_text);
      pairs++;
    }
  }
  return pairs === 0 ? 1 : total / pairs;
}

export function membersShareFactFingerprint(members: CombinedClarificationQuestion[]): boolean {
  const fps = members.map((m) => extractFactFingerprint(m.question_text)).filter(Boolean);
  if (fps.length < 2) return false;
  return new Set(fps).size === 1;
}

export function membersHaveDistinctFingerprints(members: CombinedClarificationQuestion[]): boolean {
  const fps = members.map((m) => extractFactFingerprint(m.question_text)).filter(Boolean);
  return new Set(fps).size >= 2;
}

/** Both questions ask for requirements on the same topic (common cross-lens paraphrase). */
function sharedRequirementsStem(a: string, b: string): boolean {
  const stem = /^what are the (specific )?requirements/i;
  if (!stem.test(a.trim()) || !stem.test(b.trim())) return false;
  const topics = [/\brfp/i, /\bgovern/i, /\bcompliance/i, /\bsecurity/i, /\benterprise/i];
  return topics.filter((r) => r.test(a) && r.test(b)).length >= 2;
}

export function areParaphraseCandidates(a: string, b: string): boolean {
  const fp1 = extractFactFingerprint(a);
  const fp2 = extractFactFingerprint(b);
  if (fp1 != null && fp1 === fp2) return true;
  if (sharedRequirementsStem(a, b)) return true;
  return questionSimilarity(a, b) >= 0.42;
}

/** Merge singleton groups that Gemini missed but are clear paraphrases. */
export function mergeParaphraseSingletons<T extends { entry_ids: string[]; question_text: string }>(
  groups: T[],
  all: CombinedClarificationQuestion[],
  toGroup: (members: CombinedClarificationQuestion[], questionText: string) => T
): T[] {
  const byEntryId = new Map(all.map((q) => [q.entry_id, q]));
  const singletons = groups.filter((g) => g.entry_ids.length === 1);
  const merged = groups.filter((g) => g.entry_ids.length > 1);
  if (singletons.length < 2) return groups;

  const assigned = new Set<string>();
  const out: T[] = [...merged];

  for (let i = 0; i < singletons.length; i++) {
    const g1 = singletons[i]!;
    const id1 = g1.entry_ids[0]!;
    if (assigned.has(id1)) continue;
    const m1 = byEntryId.get(id1);
    if (!m1) continue;

    const cluster: CombinedClarificationQuestion[] = [m1];
    assigned.add(id1);

    for (let j = i + 1; j < singletons.length; j++) {
      const g2 = singletons[j]!;
      const id2 = g2.entry_ids[0]!;
      if (assigned.has(id2)) continue;
      const m2 = byEntryId.get(id2);
      if (!m2) continue;

      if (areParaphraseCandidates(m1.question_text, m2.question_text)) {
        cluster.push(m2);
        assigned.add(id2);
      }
    }

    if (cluster.length === 1) {
      out.push(g1);
    } else {
      const text = [...cluster].sort((a, b) => a.question_text.length - b.question_text.length)[0]!
        .question_text;
      out.push(toGroup(cluster, text));
    }
  }

  return out;
}
