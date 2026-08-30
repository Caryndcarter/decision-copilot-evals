# Authorship influence · budget conditions

Committed Blind vs Revealed self/peer credit snapshot. Primary product title is **budget conditions**, not a vendor or model name. Stored mode keys stay `open` / `blind` / `reassigned`; `open` displays as Revealed. Blind is the default product path.

| Role | Batch | Stored `harness_kind` |
| --- | --- | --- |
| Scenario: Civitas (constrained tokens) | `db9445cf-ef02-5740-b69f-d34a1194e04a` | `civitas-replication` (do not retag) |
| Control: adequate budget (Sol) | `bc243273-6103-470c-9f11-94943925ca95` | `multi-demo-authorship` |

Machine-readable table: `packages/nextjs/data/authorship-budget-conditions.json`.

## Finding (ChatGPT as rater)

- **Civitas (constrained tokens):** Blind self-credit high on T1–T4, medium on T5. Revealed self-credit high on T1–T5 (only Blind vs Revealed self change). Revealed often compresses peers (Gemini low/minimal on 3 of 5 trials).
- **Adequate budget (Sol):** Blind and Revealed self-credit high on all five demos, including Civitas. No self change.

## Methodology footnotes

Synthesizer / model / `maxTokens` belong here, not in the product title.

- Influence scale: high = 4, medium = 3, low = 2, minimal = 1.
- Constrained-token contribution analyses inferred at **4096** tokens (then-current client/lens default). Current lens: OpenAI synthesizer 8192, others 16384.
- Constrained-tokens think-tank models: gpt-5.5, claude-sonnet-4-6, gemini-3.6-flash, grok-4.3.
- Control think-tank models: gpt-5.6-sol, claude-fable-5, gemini-3.6-flash, grok-4.5.
