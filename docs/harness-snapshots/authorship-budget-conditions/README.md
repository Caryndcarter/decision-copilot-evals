# Authorship influence · budget conditions

Committed self vs peers→ChatGPT credit snapshot. Primary product title is **budget conditions**, not a vendor or model name. The comparison covers two operating conditions, not a clean token-only experiment. Stored mode keys stay `open` / `blind` / `reassigned`; `open` displays as Revealed. Blind is the default product path.

| Role | Batch | Stored `harness_kind` | Contribution-analysis configuration | Think-tank |
| --- | --- | --- | --- | --- |
| Scenario: Civitas (constrained tokens) | `db9445cf-ef02-5740-b69f-d34a1194e04a` | `civitas-replication` (do not retag) | GPT-5.5 sent **`reasoning_effort: "low"`**, 4,096-token cap. Anthropic/xAI 4,096 with **no reasoning setting sent**; Gemini client floor **8,192**. | gpt-5.5, **claude-sonnet-4-6**, gemini-3.6-flash, grok-4.3 |
| Control: adequate budget (Sol) | `bc243273-6103-470c-9f11-94943925ca95` | `multi-demo-authorship` | **`reasoning_effort: "low"`** sent to every provider; ChatGPT cap **8,192** (16,384 for the other three as reasoning headroom — provenance only, keep it off the cards) | gpt-5.6-sol, **claude-fable-5**, gemini-3.6-flash, grok-4.5 |

Machine-readable table: `packages/nextjs/data/authorship-budget-conditions.json`.

## Finding (self vs peers→ChatGPT)

- **GPT-5.5 sent `reasoning_effort: "low"`, 4,096-token cap:** ChatGPT self ~4.0 (Revealed), peers→ChatGPT ~1.9 — gap **+2.1**. The other three synthesizers were sent no reasoning setting. Peers rated its weak contribution low while it rated itself high.
- **gpt-5.6-sol, every model sent `reasoning_effort: "low"`:** ChatGPT self ~4.0, peers→ChatGPT ~3.9 — gap **~+0.1**. Stronger work brought peer judgment into agreement with the unchanged self-rating.

## Takeaway

The signal is a calibration gap. Reading and judging completed work may be easier than assessing and producing one’s own contribution: even sent `reasoning_effort: "low"`, GPT-5.5 still gave peers a range of scores rather than flat top marks — what it could not do was register the weakness peers saw in its own contribution. The later gpt-5.6-sol run shows the same top self-rating agreeing with peers once the work was stronger.

Keep the limitation in the methodology footnotes, not in the takeaway. Public copy should state what happened; it should not pre-emptively argue against a token-only causal claim no reader has made.

## Methodology footnotes

Synthesizer / model ids belong with the budget cards and here, not in the product title.

- Influence scale: high = 4, medium = 3, low = 2, minimal = 1.
- Self = ChatGPT→ChatGPT. Peers→ChatGPT = mean of the other three synthesizers rating ChatGPT.
- The comparison is descriptive. It also changes model generation and case mix, and the July 27 condition did not apply identical effective settings across providers.
- Configuration comes from the repository version active for each batch. Contribution documents do not record maximum tokens, effort, or measured reasoning-token use.
- Say what was sent, not how it felt. Describe the July 27 condition as `reasoning_effort: "low"` with a named token cap; do not use vague labels like "low-effort condition" on their own.
