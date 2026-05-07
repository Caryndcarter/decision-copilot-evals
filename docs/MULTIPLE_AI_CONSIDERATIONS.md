# Multiple AI Providers — Design Considerations

Notes for supporting OpenAI and Anthropic (and possibly per-model choice) in Decision Copilot.

---

## 1. Provider vs. model

- **Provider-only** (`llm_provider: "openai" | "anthropic"`): Simpler. Each provider uses a single default model (e.g. `gpt-4o`, `claude-sonnet-4-20250514`). Good for MVP and for “run with OpenAI vs run with Anthropic.”
- **Model-level** (`llm_model: "gpt-4o" | "claude-3.5-sonnet" | ...`): More control. Requires a fixed enum or allowlist so the UI and API stay in sync. Run would store both `llm_provider` and `llm_model`; the client would pass `options.model` when calling the LLM.

**Recommendation:** Start with **provider-only**. Add optional `llm_model` later if you want “same provider, different model” runs (e.g. gpt-4o vs gpt-4-turbo). Backward compatibility: existing runs with no `llm_provider` default to OpenAI; if you add `llm_model` later, missing value means “use provider default.”

---

## 2. Schema compatibility (structured output)

- **OpenAI:** Uses `response_format: { type: "json_schema", json_schema: { name, strict, schema } }`. Raw content is parsed as JSON and returned as `response.parsed`.
- **Anthropic:** When `options.schema` is set, uses a **tool** with `input_schema: options.schema` and `tool_choice` to force that tool. The tool-use block’s `input` is returned as `response.parsed` and stringified for `response.content`.

Both clients expose the same contract: `content` (string) and `parsed` (object when schema is provided). All four lenses (risk, reversibility, people, brief) use `response.parsed`, so they work with either provider.

**Caveats:**

- Anthropic’s tool `input_schema` format may differ slightly from OpenAI’s `json_schema` (e.g. strict mode, required array). The same schema object is passed to both; if one provider rejects a schema, we may need a thin adapter or provider-specific schema tweaks.
- **Recommendation:** Run at least one full lens + brief flow with Anthropic and confirm output shape (and that `parsed` matches what `parseRiskOutput` / `parseBriefOutput` etc. expect). Add an integration or E2E test that runs one lens with both providers and asserts the same shape.

---

## 3. Prompt tuning

- Lens (and brief) prompts are currently written and tuned for OpenAI. They will likely work with Claude, but quality or style may differ (length, tone, structure).
- **Recommendation:** Ship with shared prompts first. If you see consistent gaps (e.g. Claude under-specifies risks, or over-explains), consider **per-provider prompt variants** later (e.g. a small `getSystemPrompt(lens, provider)` that returns a slightly different string for `anthropic`). No need to implement that until you have real runs to compare.

---

## Summary

| Topic              | Recommendation |
|--------------------|----------------|
| Provider vs model  | Start with provider-only; add optional `llm_model` later if needed. |
| Schema compatibility | Contract is aligned; verify with a real Anthropic run and add a test. |
| Prompt tuning      | Use shared prompts first; add per-provider variants only if quality demands it. |
