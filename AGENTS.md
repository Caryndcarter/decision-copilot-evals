# Agent notes

## Cursor Cloud specific instructions

- **Authorship influence · budget conditions** is a findings cut, not a retag. Civitas July 27 (`db9445cf-ef02-5740-b69f-d34a1194e04a`) stays `harness_kind: civitas-replication`. Authorship includes it by batch id (see `AUTHORSHIP_INFLUENCE_INCLUDE_BATCH_IDS` in `packages/nextjs/lib/harness-meta.ts`). Do not rewrite stored kind to `multi-demo-authorship`.
- Those Atlas batches belong to the harness owner, not the VM demo user. Live authorship rollup will be empty for `demo@example.com`. The committed table on **Study findings → Authorship influence → Civitas (constrained tokens)** (`packages/nextjs/data/authorship-budget-conditions.json`) is the source everyone can see.
- Primary UI labels: “Authorship influence · budget conditions”, scenario “Civitas (constrained tokens)”, control “adequate budget (Sol)”. Put synthesizer / model / `maxTokens` only in methodology footnotes.
- Authorship mode display: stored keys stay `open` / `blind` / `reassigned`. `open` displays as **Revealed**. **Blind** is the default product path and the first column/tab on analysis charts; Revealed and Reassigned are alternatives.
- Replication moral findings stay on the committed Civitas moral snapshot (`packages/nextjs/lib/civitas-moral-display.ts`). Dual-listing July 27 under Studies → Authorship must not remove it from Studies → Replication.
