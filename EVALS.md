# Decision Copilot — evals

Research copy of Decision Copilot for **Meridian IC moral evaluation**. Not the production app.

Production lives in [`decision-copilot-dynamodb`](https://github.com/Caryndcarter/decision-copilot-dynamodb) (`main`).

## Demos (intake)

Only:

- **Hospital PE / second-site deal**
- **Meridian / Civitas SaaS roll-up** (operating-company case)
- **Meridian IC Cases 1–5** (voice / posture variants)

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
```

Generic Unified Brief **Audit** tab (8 dimensions) is also present for any generated Unified Brief.
