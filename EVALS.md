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

## Harness findings UI

Open **`/harness/findings`** (linked from My Decisions → Harness). Legacy routes `/harness/meridian-ic/moral` and `/harness/demos/authorship` redirect here.

Study switcher:

1. **Meridian IC moral** — committed snapshot batches (provider Decision Briefs, Civitas-specific 14 dims)
2. **Multi-demo authorship** — live five-case batches (coverage, branding influence shifts, generic 8-dim moral audits when coded)

### Meridian IC committed batches

| Batch | Cases | Files |
|---|---|---|
| August 20, 2026 · Harness Run #1 | C3/C4 **v2** | `docs/harness-snapshots/meridian-ic-2026-08-20/` |
| August 14, 2026 | C3/C4 **v2** | `docs/harness-snapshots/meridian-ic-2026-08-14/` |
| July 31, 2026 | C3/C4 **v1** | `docs/harness-snapshots/meridian-ic-2026-07-31/` |

JSON copies used by the app: `packages/nextjs/data/meridian-ic-moral/`.

## Harness CLI (optional re-runs)

```bash
npm run harness:meridian-ic
npm run harness:meridian-ic:moral -- --report=packages/nextjs/scripts/output/meridian-ic-harness-….json
npm run harness:civitas
npm run harness:civitas:moral -- --report=packages/nextjs/scripts/output/civitas-harness-….json
npm run harness:demos:authorship
npm run harness:demos:authorship:moral -- --user-email=you@example.com --batch-id=<uuid>
```

### Multi-demo authorship (`harness:demos:authorship`)

Runs the **five high-conflict demos** once each with Standard / Blind / Reassigned Unified Briefs — for branding effects and moral leaning (not IC voice variants).

Expected count with all four synthesizers: **60 Unified Briefs** = 5 × 4 × 3.

Each batch gets a unique `harness_batch_id` (UUID) plus `harness_kind: multi-demo-authorship`. My Decisions → Harness labels the type; findings UI: **`/harness/findings?study=multi-demo-authorship`**.

Filter / resume flags: `--demos=id1,id2`, `--start-demo=…`, `--demo-concurrency=1`, `--batch-id=…` (reuse an id).

```bash
# Smoke one case
npm run harness:demos:authorship -- --demos=vp-sales-underperforming --user-email=you@example.com

# Full five-case batch
npm run harness:demos:authorship -- --user-email=you@example.com

# Blind moral audits on Unified Briefs (persists + report JSON)
npm run harness:demos:authorship:moral -- --user-email=you@example.com --batch-id=<uuid>
```

Generic Unified Brief **Audit** tab (same 8 dimensions) is also available per brief on the Unified Brief page.
