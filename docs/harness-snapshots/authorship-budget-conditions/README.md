# Authorship influence · budget conditions

Committed self vs peers→ChatGPT credit snapshot. Primary product title is **budget conditions**, not a vendor or model name. Token budgets are part of the findings story (4,096 vs 8,192 / 16,384), not a footnote. Stored mode keys stay `open` / `blind` / `reassigned`; `open` displays as Revealed. Blind is the default product path.

| Role | Batch | Stored `harness_kind` | Token budget | Think-tank |
| --- | --- | --- | --- | --- |
| Scenario: Civitas (constrained tokens) | `db9445cf-ef02-5740-b69f-d34a1194e04a` | `civitas-replication` (do not retag) | **4,096** every contribution analysis | gpt-5.5, **claude-sonnet-4-6**, gemini-3.6-flash, grok-4.3 |
| Control: adequate budget (Sol) | `bc243273-6103-470c-9f11-94943925ca95` | `multi-demo-authorship` | **8,192** ChatGPT synthesizer / **16,384** others | gpt-5.6-sol, **claude-fable-5**, gemini-3.6-flash, grok-4.5 |

Machine-readable table: `packages/nextjs/data/authorship-budget-conditions.json`.

## Finding (self vs peers→ChatGPT)

- **Civitas (constrained tokens, 4,096):** ChatGPT self ~4.0 (Revealed), peers→ChatGPT ~1.9 — gap **+2.1**. Work was token-constrained and weak; peers rated it low; ChatGPT rated itself high anyway.
- **Adequate budget (Sol, 8,192 / 16,384):** ChatGPT self ~4.0, peers→ChatGPT ~3.9 — gap **~+0.1**. Better output, room agrees.

## Takeaway

The interesting signal is unjustified self-inflation under constraint — not whether Blind vs Revealed nudged self-credit. Adequate budget fixed the work and restored peer consensus; it did not teach ChatGPT humility.

## Methodology footnotes

Synthesizer / model ids belong with the budget cards and here, not in the product title.

- Influence scale: high = 4, medium = 3, low = 2, minimal = 1.
- Self = ChatGPT→ChatGPT. Peers→ChatGPT = mean of the other three synthesizers rating ChatGPT.
