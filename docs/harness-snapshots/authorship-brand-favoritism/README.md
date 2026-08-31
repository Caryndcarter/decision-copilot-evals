# Authorship influence · brand favoritism

Committed remapped-credit snapshot for the public story
`/model-studies/findings/brand-favoritism`. Same two batches as budget conditions.
Do not retag July 27.

| Batch | Decisions |
| --- | --- |
| Civitas (constrained tokens) `db9445cf-…` | 5 trials |
| adequate budget (Sol) `bc243273-…` | 5 demos |

Machine-readable table: `packages/nextjs/data/authorship-brand-favoritism.json`.

## Finding (peer credit, self excluded)

- Grok high-influence ratings: **14/30 Revealed → 18/30 Blind → 23/30 Reassigned**.
- Work *labeled* ChatGPT: mean **3.58** (26/40 high). Labeled Grok: **3.03** (15/40).
- Grok's real work shown as ChatGPT: **14/15 high**. Shown as Anthropic/Claude: **11/15**.
- ChatGPT rating Grok: **2.8 Revealed · 3.2 Blind · 3.6 Reassigned**.

Constrained Anthropic is Sonnet; adequate is Fable. Remap keys stay `anthropic`.

Two public wordings of this snapshot:

- `/model-studies/findings/brand-favoritism` — short Grok / ChatGPT labels (v1).
- `/model-studies/findings/brand-favoritism-models` — model ids and remap frequencies (v2).

Grok remaps (40 cells of real Grok work): 15 ChatGPT (gpt-5.5 / gpt-5.6-sol), 15 Anthropic (Sonnet / Fable), 10 Gemini 3.6 Flash. Never left labeled Grok. ChatGPT label finishes highest (14/15 high, mean 3.93). Gemini label has the largest lift vs Revealed (+0.50). ChatGPT-as-rater saw Grok-as-ChatGPT only twice.
