# Authorship influence · budget conditions

Committed Blind / Revealed / Reassigned self/peer credit snapshot. Primary product title is **budget conditions**, not a vendor or model name. Token budgets are part of the findings story (4,096 vs 8,192 / 16,384), not a footnote. Stored mode keys stay `open` / `blind` / `reassigned`; `open` displays as Revealed. Blind is the default product path.

| Role | Batch | Stored `harness_kind` | Token budget | Think-tank |
| --- | --- | --- | --- | --- |
| Scenario: Civitas (constrained tokens) | `db9445cf-ef02-5740-b69f-d34a1194e04a` | `civitas-replication` (do not retag) | **4,096** every contribution analysis | gpt-5.5, **claude-sonnet-4-6**, gemini-3.6-flash, grok-4.3 |
| Control: adequate budget (Sol) | `bc243273-6103-470c-9f11-94943925ca95` | `multi-demo-authorship` | **8,192** ChatGPT synthesizer / **16,384** others | gpt-5.6-sol, **claude-fable-5**, gemini-3.6-flash, grok-4.5 |

Machine-readable table: `packages/nextjs/data/authorship-budget-conditions.json`.

## Finding (ChatGPT as rater)

- **Civitas (constrained tokens, 4,096):** Blind self-credit high on T1–T4, medium on T5. Revealed self-credit high on T1–T5 (only Blind vs Revealed self change). Reassigned changed self-credit on 4 of 5 trials (T1 collapsed to minimal). Revealed often compresses peers (Gemini low/minimal on 3 of 5 trials). Anthropic on this batch is Sonnet, not Fable.
- **Adequate budget (Sol, 8,192 / 16,384):** Blind, Revealed, and Reassigned self-credit high on all five demos, including Civitas. No self change.

## Takeaway

A tight token budget does not, by itself, make ChatGPT less self-crediting when brands are merely hidden. It does make self-credit unstable when brands are remapped. With an adequate budget, authorship condition barely moves the self-credit cell.

## Methodology footnotes

Synthesizer / model ids belong with the budget cards and here, not in the product title.

- Influence scale: high = 4, medium = 3, low = 2, minimal = 1.
