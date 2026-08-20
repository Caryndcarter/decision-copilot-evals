import "server-only";
import { gemini } from "@/llm/gemini";
import type { CombinedClarificationQuestion } from "@/lib/merge-clarification-questions";
import { LENS_THEME_ORDER } from "@/lib/merge-clarification-questions";
import type {
  ClarificationDedupeResult,
  DedupedClarificationQuestion,
} from "@/lib/clarification-dedupe-types";
import { applyDedupeGuardrails } from "@/lib/clarification-dedupe-guardrails";
import { mergeParaphraseSingletons } from "@/lib/clarification-dedupe-similarity";
import { pickMergedAnswerType } from "@/lib/clarification-answer-type";
import type { LensQuestion } from "@/types/decision";

/** Model for semantic clarification dedupe (override via env). */
export const GEMINI_CLARIFICATION_DEDUP_MODEL =
  process.env.GEMINI_CLARIFICATION_DEDUP_MODEL?.trim() || "gemini-3.6-flash";

const LENS_ORDER = (l: string) => LENS_THEME_ORDER[l] ?? 9;

function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s%$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickPrimaryLens(members: CombinedClarificationQuestion[]): LensQuestion["lens"] {
  const sorted = [...members].sort((a, b) => LENS_ORDER(a.lens) - LENS_ORDER(b.lens));
  return sorted[0]!.lens;
}

function toDedupedGroup(
  merge_id: string,
  members: CombinedClarificationQuestion[],
  question_text: string
): DedupedClarificationQuestion {
  const lenses = [...new Set(members.map((m) => m.lens))];
  const options = members.find((m) => m.options?.length)?.options;
  return {
    merge_id,
    lens: pickPrimaryLens(members),
    lenses: lenses.length > 1 ? lenses : undefined,
    question_text,
    answer_type: pickMergedAnswerType(members, question_text),
    options,
    required: members.some((m) => m.required),
    providers: [...new Set(members.map((m) => m.provider))],
    entry_ids: members.map((m) => m.entry_id),
  };
}

function heuristicDedupe(all: CombinedClarificationQuestion[]): DedupedClarificationQuestion[] {
  const byKey = new Map<string, CombinedClarificationQuestion[]>();
  for (const q of all) {
    // Cross-lens: key ignores lens; only exact normalized text + compatible answer bucket
    const key = `${q.answer_type}|${normalizeQuestionText(q.question_text)}`;
    const bucket = byKey.get(key) ?? [];
    bucket.push(q);
    byKey.set(key, bucket);
  }

  const groups: DedupedClarificationQuestion[] = [];
  let idx = 0;
  for (const members of byKey.values()) {
    groups.push(toDedupedGroup(`heuristic-${idx++}`, members, members[0]!.question_text));
  }

  return groups.sort((a, b) => {
    const la = LENS_ORDER(a.lens);
    const lb = LENS_ORDER(b.lens);
    if (la !== lb) return la - lb;
    return a.question_text.localeCompare(b.question_text);
  });
}

function buildDedupeSchema() {
  return {
    type: "object",
    properties: {
      groups: {
        type: "array",
        description:
          "Merge paraphrases of the same fact across providers. Keep separate when different facts are needed.",
        items: {
          type: "object",
          properties: {
            group_id: { type: "string", description: "Short stable id, e.g. eu-ai-act-high-risk" },
            canonical_question_text: {
              type: "string",
              description:
                "ONE focused question only — never combine multiple sub-questions with 'and'. Prefer the clearest single member wording.",
            },
            member_entry_ids: {
              type: "array",
              items: { type: "string" },
              description: "Every entry_id that asks for this same information",
            },
          },
          required: ["group_id", "canonical_question_text", "member_entry_ids"],
        },
      },
    },
    required: ["groups"],
  };
}

function buildGroupsFromGemini(
  all: CombinedClarificationQuestion[],
  raw: {
    groups?: {
      group_id?: string;
      canonical_question_text?: string;
      member_entry_ids?: string[];
    }[];
  }
): DedupedClarificationQuestion[] {
  const byEntryId = new Map(all.map((q) => [q.entry_id, q]));
  const assigned = new Set<string>();
  const out: DedupedClarificationQuestion[] = [];

  for (const g of raw.groups ?? []) {
    const memberIds = (g.member_entry_ids ?? []).filter(
      (id) => byEntryId.has(id) && !assigned.has(id)
    );
    if (memberIds.length === 0) continue;

    for (const id of memberIds) assigned.add(id);

    const members = memberIds.map((id) => byEntryId.get(id)!);
    const text = (g.canonical_question_text ?? members[0]!.question_text).trim();
    out.push(toDedupedGroup((g.group_id ?? `gemini-${out.length}`).trim(), members, text));
  }

  // Any entry Gemini skipped → own singleton group (partial accept, not full reject)
  for (const q of all) {
    if (assigned.has(q.entry_id)) continue;
    out.push(toDedupedGroup(`singleton-${q.entry_id}`, [q], q.question_text));
  }

  const guarded = applyDedupeGuardrails(out, all, toDedupedGroup);
  const consolidated = mergeParaphraseSingletons(guarded, all, (members, questionText) =>
    toDedupedGroup(`merged-${members.map((m) => m.entry_id).join("-")}`, members, questionText)
  );

  return consolidated.sort((a, b) => {
    const la = LENS_ORDER(a.lens);
    const lb = LENS_ORDER(b.lens);
    if (la !== lb) return la - lb;
    return a.question_text.localeCompare(b.question_text);
  });
}

const DEDUPE_SYSTEM_PROMPT = `You merge follow-up clarification questions from multiple AI models about the same decision.

**Merge paraphrases aggressively** — same underlying fact = one group, even when wording, length, or lens differ. **Do not merge different facts** into one group or one compound question.

Rules:
1. **Same fact = one group** — one answer would satisfy every member (cross-provider paraphrases, cross-lens repeats, verbose vs concise wording).
2. **Merge across providers** — OpenAI + Gemini + Anthropic asking the same thing in different words = one group.
3. **Merge across lenses** when the answer is identical (true duplicates, not merely related topics).
4. **Merge within the same provider** when two questions are redundant.
5. **Different facts = separate groups** — related topic area is NOT enough:
   - Technical feasibility vs. engineering effort vs. team readiness vs. security requirements → SEPARATE
   - Budget vs. timeline vs. headcount → SEPARATE
6. Target roughly **35–55% reduction** when many models asked overlapping questions.
7. Every entry_id appears in **exactly one** group.
8. **canonical_question_text: ONE focused question.** Never write kitchen-sink questions joining multiple sub-questions with "and". Prefer the clearest, shortest member wording.
9. Match answer shape to wording — explain/describe/assess → open-ended, not yes/no.

Examples that MUST be one group:
- "Has a formal, documented legal assessment been conducted to definitively classify our proposed AI features under the EU AI Act (e.g., high-risk, limited risk, minimal risk), including an analysis of all relevant annexes and national specificities?" (Gemini)
- "Have you conducted a detailed analysis to determine if your use cases are classified as high-risk under the EU AI Act?" (OpenAI)
→ Same group: EU AI Act risk classification.

- "What is your annual budget for this initiative?" and "What spending cap has been approved?" → same group.

- "What are the specific requirements of large-enterprise RFPs related to AI governance and data security?" (OpenAI, risk lens)
- "What are the specific requirements and negotiable points in the enterprise RFPs regarding AI governance and compliance?" (Gemini, people lens)
→ Same group: enterprise RFP AI governance requirements — lens does NOT matter.

Examples that stay SEPARATE:
- VPC/self-hosted feasibility vs. engineering effort vs. team readiness vs. third-party API security requirements — different facts.
- EU AI Act classification vs. GDPR data-transfer mechanism — different facts.`;

export async function dedupeClarificationQuestionsWithGemini(
  all: CombinedClarificationQuestion[]
): Promise<ClarificationDedupeResult> {
  if (all.length === 0) {
    return {
      unique: [],
      all,
      original_count: 0,
      unique_count: 0,
      dedupe_model: GEMINI_CLARIFICATION_DEDUP_MODEL,
      dedupe_method: "gemini",
    };
  }

  if (all.length === 1) {
    const q = all[0]!;
    return {
      unique: [toDedupedGroup("solo-0", [q], q.question_text)],
      all,
      original_count: 1,
      unique_count: 1,
      dedupe_model: GEMINI_CLARIFICATION_DEDUP_MODEL,
      dedupe_method: "gemini",
    };
  }

  const inventory = all
    .map(
      (q) =>
        `- entry_id: \`${q.entry_id}\` | lens: ${q.lens} | answer_type: ${q.answer_type} | provider: ${q.provider} | question: ${q.question_text}`
    )
    .join("\n");

  const user = `Merge these ${all.length} questions. Combine cross-provider paraphrases and redundant repeats. Keep separate when different facts are needed — never write compound canonical questions.

${inventory}

Return JSON: every entry_id exactly once.`;

  try {
    const response = await gemini.run(
      [
        { role: "system", content: DEDUPE_SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
      {
        model: GEMINI_CLARIFICATION_DEDUP_MODEL,
        schema: buildDedupeSchema(),
        temperature: 0.15,
        maxTokens: 8192,
      }
    );

    const unique = buildGroupsFromGemini(all, (response.parsed ?? {}) as Parameters<typeof buildGroupsFromGemini>[1]);
    return {
      unique,
      all,
      original_count: all.length,
      unique_count: unique.length,
      dedupe_model: GEMINI_CLARIFICATION_DEDUP_MODEL,
      dedupe_method: "gemini",
    };
  } catch (err) {
    console.warn("[clarification-dedupe] Gemini failed; using heuristic fallback", err);
  }

  const unique = heuristicDedupe(all);
  return {
    unique,
    all,
    original_count: all.length,
    unique_count: unique.length,
    dedupe_model: GEMINI_CLARIFICATION_DEDUP_MODEL,
    dedupe_method: "heuristic",
    fallback: true,
  };
}
