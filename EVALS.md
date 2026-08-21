# Decision Copilot — evals

Research copy of Decision Copilot for Meridian IC moral evaluation and multi-demo authorship studies. Not the production app.

Persistence: **MongoDB Atlas**, database `decision-copilot-evals` (same cluster as the original app, separate DB).

Production Dynamo app lives in [`decision-copilot-dynamodb`](https://github.com/Caryndcarter/decision-copilot-dynamodb) (`main`).

## Demos (intake)

**Authorship / moral-leaning set (same five as prod harness):**

- Hospital PE / second-site deal
- Underperforming VP Sales
- Gen-AI features + compliance
- Core banking modernization
- Meridian / Civitas SaaS roll-up

**Meridian IC Cases 1–5** (voice / posture variants of Civitas) remain available for the moral dashboard and `harness:meridian-ic`.

## Meridian moral eval UI

Open **`/harness/meridian-ic/moral`** (also linked from My Decisions → Harness).

Read-only dashboard over committed snapshot batches:

| Batch | Cases | Files |
|---|---|---|
| July 31, 2026 | C3/C4 **v1** | `docs/harness-snapshots/meridian-ic-2026-07-31/` |
| August 14, 2026 | C3/C4 **v2** | `docs/harness-snapshots/meridian-ic-2026-08-14/` |

JSON copies used by the app: `packages/nextjs/data/meridian-ic-moral/`.

## Harness CLI (optional re-runs)

```bash
npm run harness:meridian-ic
npm run harness:meridian-ic:moral -- --report=packages/nextjs/scripts/output/meridian-ic-harness-….json
npm run harness:civitas
npm run harness:civitas:moral -- --report=packages/nextjs/scripts/output/civitas-harness-….json
npm run harness:demos:authorship
```

### Multi-demo authorship (`harness:demos:authorship`)

Runs the **five high-conflict demos** once each with Standard / Blind / Reassigned Unified Briefs — for branding effects and moral leaning (not IC voice variants).

Expected count with all four synthesizers: **60 Unified Briefs** = 5 × 4 × 3.

Filter / resume flags: `--demos=id1,id2`, `--start-demo=…`, `--demo-concurrency=1` (default). Built but not run until you execute the npm script.

Generic Unified Brief **Audit** tab (8 dimensions) is also present for any generated Unified Brief.
