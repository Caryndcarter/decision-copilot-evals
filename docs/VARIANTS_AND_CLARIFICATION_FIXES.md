# Variants, timeline display, editing, and Anthropic clarification questions

This doc explains three areas of behavior and the fixes applied:

1. **Why the timeline (and other variant custom sections) wasn’t showing**
2. **Why variants can be edited with Tiptap and how the LLM sees those edits**
3. **Why Anthropic stopped showing clarification questions and how it was fixed**

---

## 1. Timeline / variant custom sections not showing

### What was going wrong

When a user asked for a “timeline” (or cost breakdown, risk playbook, etc.) and a variant was created:

- The **server** correctly built the variant: the variant API ran brief synthesis with the format instruction, got back `custom_sections` (e.g. a timeline section), and the server log showed something like `[Variant] Brief custom_sections: [{ heading: "...", content: "..." }]`.
- The **UI** on the timeline variant tab showed nothing: the Decision brief block appeared, but the custom (timeline) section did not.

So the data existed in the variant’s `decision_brief` on the server and in the returned run JSON, but the client either didn’t keep it or didn’t render it.

### Why it was happening

- **Sync and display of `custom_sections`:**  
  In `ResultContent`, the brief is driven by `result.decision_brief` and a local `briefDraft`. When switching to a variant, the parent passes `result={{ ...result, decision_brief: activeVariant.decision_brief }}`. The draft is set from `result.decision_brief` in a `useEffect`. If that sync didn’t explicitly preserve `custom_sections`, or if the read-only branch only read `result.decision_brief.custom_sections` and that reference was missing or empty in some code paths, the timeline (and any other custom section) could disappear or never show.

- **Serialization and merging:**  
  When building the payload for save or for chat, the merged brief is built from refs + `briefDraft`. If `custom_sections` weren’t included in that merge (e.g. only title/summary/recommendation/key_considerations/next_steps), they could be dropped when saving or when sending context to the LLM. So the fix needed to ensure `custom_sections` are always part of the “current brief” and of the displayed content.

### What was changed (the “answer”)

1. **ResultContent – keep and show `custom_sections`**
   - In the `useEffect` that sets `briefDraft` from `result.decision_brief`, we now always set `custom_sections: result.decision_brief.custom_sections ?? []` so the draft never drops them when syncing from the variant (or base) brief.
   - In `getCurrentBriefMerged()` we explicitly include `custom_sections: draft.custom_sections ?? result.decision_brief.custom_sections ?? []` so any save or chat context uses the current custom sections.
   - In the read-only branch, we render from `(result.decision_brief.custom_sections ?? briefDraft?.custom_sections)?.map(...)` so we show custom sections from either the result or the draft and don’t rely on a single possibly-empty source.

2. **Variant API – reliable payload**
   - The new variant’s `decision_brief` is built as a plain object with an explicit array: `decision_brief: { ...brief, custom_sections: [...(brief.custom_sections ?? [])] }` so the JSON response always includes `custom_sections` in a serializable form and the client consistently receives them.

With these changes, when you create a timeline (or any) variant, the API returns the run with the variant’s `decision_brief.custom_sections` set, the client keeps that in `result` and passes the selected variant’s brief into `ResultContent`, and `ResultContent` both syncs it into `briefDraft` and renders it in both editable and read-only paths.

---

## 2. Variants and Tiptap editing, and the LLM seeing user edits

### Can variants be edited with Tiptap?

Yes. Variants use the same `ResultContent` component as the base brief. Editing is gated by:

- `canEdit = Boolean(onRunUpdate) && (result.status === "complete" || result.status === "pending_brief")`

So when a run is complete or pending_brief, both the base brief and any variant brief are editable: title, summary, recommendation, key considerations, next steps, and **custom sections** (e.g. timeline) are all rendered with Tiptap (or list editors) and can be changed inline.

### Why it might have seemed like variants “weren’t able to be” edited

- **Persistence:** If the API didn’t know which brief to update, edits might have been applied to the base run brief instead of the variant. The fix was to support **variant-scoped updates** in the run API.
- **Chat context:** If the chat API only ever used the run’s stored `decision_brief` (e.g. from the DB), it would not see unsaved or just-saved edits made in the UI. So the LLM could appear to “not see” user edits.

### How editing and “LLM sees changes” work now

- **update_brief with variant_id**  
  The run API accepts `update_brief` with an optional `variant_id`. When `variant_id` is present, it updates that variant’s `decision_brief` (including `custom_sections`) and leaves the base brief and other variants unchanged. So Tiptap edits to a variant are saved to the correct brief.

- **decision_brief_override**  
  The chat API accepts an optional `decision_brief_override`. When the client sends it (with the latest brief content, including any in-memory edits), the run context passed to the LLM is built from this override instead of the stored run brief. So the model sees the same content the user is looking at, including:
  - The selected variant’s brief (base or timeline/cost/risk-playbook variant),
  - Any edits the user has made in Tiptap (and that the client has merged into the brief it sends).

- **How the client sends the current brief**  
  - **Result page:** Uses `getBriefForChat` (e.g. `resultContentRef.current?.getCurrentBrief() ?? currentBrief`) so at send time the chat gets the very latest from the editors (refs + draft).
  - **Chat page:** Uses `decisionBrief={currentBrief}`. `currentBrief` is updated by `onBriefChange(briefDraft)` from `ResultContent`, so after each draft change the parent has the latest brief; when the user sends a message, that same brief is sent as `decision_brief_override` so the LLM sees the user’s edits (and the correct variant).

So: **variants are editable with Tiptap**, and **the LLM can see and discuss those user edits** because the client sends the current brief (including variant and custom sections) as `decision_brief_override` and the run API supports updating the variant’s brief via `variant_id`.

---

## 3. Anthropic clarification questions: why they disappeared and how they were fixed

### What was going wrong

With **Anthropic** as the provider, after the initial run the UI often showed **no clarification questions** and went straight to the final decision brief. With **OpenAI**, the same flow correctly produced 1–3 follow-up questions (e.g. timeline, stakeholders, reversibility) for the user to answer before the brief.

So the issue was specific to how the Anthropic client (and/or the lens schemas) were being used for structured output.

### Why Anthropic stopped showing questions

- **Strict schema and `questions_to_answer_next`:**  
  The lenses (risk, reversibility, people) use **structured output** so the model must return a fixed schema. The schema includes `questions_to_answer_next` as an array of question objects. For Anthropic we use **tool-based** structured output with `strict: true`, so the model’s response must conform exactly to the schema (types, required fields, etc.).

- **Schema constraints that broke Anthropic:**  
  - **`maxItems` on `questions_to_answer_next`:** At one point the schema had something like `maxItems: 3` on the `questions_to_answer_next` array. Anthropic’s API does **not** support `maxItems` for array types. The API returned **400** with a message like “For 'array' type, property 'maxItems' is not supported.” That could cause the whole lens call to fail or fall back in a way that produced no questions.
  - **`options` type:** The question objects have an `options` field (for enum-style questions). Using something like `type: ["array", "null"]` could conflict with Anthropic’s strict handling. The schema was changed to `type: "array"` (with description that enum questions use an array of strings, and non-enum use `[]`) so Anthropic accepts it.
  - **No minimum guarantee:** Even with a valid schema, the model could return an empty array `[]` for `questions_to_answer_next` if the prompt didn’t strongly require at least one question. So we had to both fix the schema and strengthen the prompt and defaults.

### What was changed (the “answer”)

1. **Remove `maxItems`**  
   Removed `maxItems` from `questions_to_answer_next` in all three lens schemas (risk, reversibility, people) so Anthropic no longer returns 400 for that property.

2. **Schema fixes for Anthropic**  
   - `options`: use `type: "array"` (and document that it’s an array of strings for enums, empty array otherwise) for Anthropic compatibility.  
   - Keep `minItems: 1` on `questions_to_answer_next` so the schema explicitly requires at least one question.

3. **Strict mode**  
   The Anthropic client continues to use `strict: true` for the structured-response tool so the model must follow the schema (required fields, types). That avoids silent drops or malformed output; the important part was making the schema itself valid for Anthropic (no `maxItems`, correct `options` type).

4. **Prompts and defaults**  
   - Lens prompts were tightened to say things like: “Always provide at least one question so the user can clarify before the final brief—do not skip straight to conclusions without asking.”  
   - In the run route, when a lens returned **zero** questions (e.g. after a fallback or parse), we use **default clarification questions** (e.g. “What’s your timeline or key milestone for this decision?”) from `getDefaultClarificationQuestions()` in both **handleIntake** and **handleRerunProvider**, so the user always sees at least one question even if the provider misbehaves.

5. **Logging**  
   When a lens returns 0 questions (especially for Anthropic), the run route logs it so we can see in server logs if the model is still occasionally returning an empty array.

In short: **Anthropic stopped showing questions** because of an invalid schema for their API (`maxItems`, and possibly `options` type) and because the model wasn’t strongly required to return at least one question. The **solution** was: remove unsupported schema properties, fix array/options types for Anthropic, keep strict schema adherence, require at least one question in the schema (`minItems: 1`) and in the prompt, and add a default-question fallback when the lens returns none.
