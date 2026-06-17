import type { CombinedClarificationQuestion } from "@/lib/merge-clarification-questions";
import type { DedupedClarificationQuestion } from "@/lib/clarification-dedupe-types";
import {
  averageMemberSimilarity,
  membersHaveDistinctFingerprints,
  membersShareFactFingerprint,
} from "@/lib/clarification-dedupe-similarity";

/** Distinct factual dimensions in one compound question (not shared across paraphrases). */
const COMPOUND_DIMENSIONS = [
  /\bfeasib/i,
  /\b(financial|budget|cost|funding)\b/i,
  /\b(effort|engineering|estimate|hours|sprint)\b/i,
  /\b(readiness|team|staff|capacity|headcount)\b/i,
  /\b(security|compliance|requirement|constraint|non-negotiable)\b/i,
  /\b(timeline|deadline|go-live|schedule)\b/i,
  /\b(vendor|third-party|api)\b/i,
];

function countCompoundDimensions(text: string): number {
  return COMPOUND_DIMENSIONS.filter((re) => re.test(text)).length;
}

/** True when canonical wording bundles multiple distinct asks (often via "and"). */
export function isCompoundQuestionText(text: string): boolean {
  if (/\band\s+what\s+(are|is|would|were)\b/i.test(text)) return true;

  const andCount = (text.match(/\band\b/gi) ?? []).length;
  if (andCount >= 2 && text.length > 90) return true;

  return countCompoundDimensions(text) >= 3;
}

function pickBestSingleQuestionText(members: CombinedClarificationQuestion[]): string {
  const sorted = [...members].sort((a, b) => a.question_text.length - b.question_text.length);
  return sorted[0]!.question_text.trim();
}

function shouldSplitGroup(
  members: CombinedClarificationQuestion[],
  canonicalText: string
): boolean {
  if (members.length <= 1) return false;

  if (membersShareFactFingerprint(members)) return false;

  const similarity = averageMemberSimilarity(members);
  if (similarity >= 0.45) return false;

  if (membersHaveDistinctFingerprints(members)) return true;

  if (isCompoundQuestionText(canonicalText) && similarity < 0.4) return true;

  return false;
}

function resolveCanonicalText(
  members: CombinedClarificationQuestion[],
  canonicalText: string
): string {
  if (!isCompoundQuestionText(canonicalText)) return canonicalText;
  if (members.length === 1) return members[0]!.question_text.trim();

  if (membersShareFactFingerprint(members) || averageMemberSimilarity(members) >= 0.35) {
    return pickBestSingleQuestionText(members);
  }
  return canonicalText;
}

export function applyDedupeGuardrails(
  groups: DedupedClarificationQuestion[],
  all: CombinedClarificationQuestion[],
  toGroup: (
    merge_id: string,
    members: CombinedClarificationQuestion[],
    question_text: string
  ) => DedupedClarificationQuestion
): DedupedClarificationQuestion[] {
  const byEntryId = new Map(all.map((q) => [q.entry_id, q]));
  const out: DedupedClarificationQuestion[] = [];

  for (const group of groups) {
    const members = group.entry_ids
      .map((id) => byEntryId.get(id))
      .filter((q): q is CombinedClarificationQuestion => q != null);

    if (members.length === 0) continue;

    if (shouldSplitGroup(members, group.question_text)) {
      for (const m of members) {
        out.push(toGroup(`split-${m.entry_id}`, [m], m.question_text));
      }
      continue;
    }

    const questionText = resolveCanonicalText(members, group.question_text);
    if (questionText === group.question_text && members.length === group.entry_ids.length) {
      out.push(group);
    } else {
      out.push(toGroup(group.merge_id, members, questionText));
    }
  }

  return out;
}
