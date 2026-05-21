# Decision Copilot

A decision-support app that helps you think through important decisions using three analysis lenses (Risk, Reversibility, People), optional follow-up questions, and an AI-generated decision brief.

## What it does

1. **Intake** — You describe the situation, constraints, and choose a posture (Explore, Pressure test, Surface risks, Generate alternatives). For “Pressure test” you also indicate what you’re leaning toward.

2. **Three-lens analysis** — The app runs three lenses in parallel:
   - **Risk** — Top risks, assumptions, blind spots, tradeoffs, remaining uncertainty.
   - **Reversibility** — Irreversible steps, safe-to-try-first options.
   - **People** — Stakeholder impacts (who’s affected, how, positive/negative/neutral), execution risks.

3. **Clarification (optional)** — If a lens needs more information, it can ask follow-up questions. You answer with Yes/No/Unknown, numbers, percentages, short text, or options. The analysis is then re-run with your answers so the model doesn’t repeat the same questions.

4. **Decision brief** — After lenses (and any clarification), an AI synthesis produces a brief: a short title, summary, recommendation, key considerations, and next steps, with a generated-at timestamp.

Runs are stored in DynamoDB (a local Docker container in dev, real AWS in prod). The result page shows context, all three lens outputs, the clarification form when needed, and the decision brief.

## Tech stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **LLM:** OpenAI (structured outputs for lenses and brief). Server-only.
- **Data:** DynamoDB — on branch **`one-table`**, one physical table (`…-app`) holds NextAuth and runs (`RUN#…` keys). On branch **`main`**, two tables (`…-runs` and `…-auth`). Local dev uses `amazon/dynamodb-local` in Docker.
- **Monorepo:** npm workspaces (`packages/nextjs`, `packages/local/docker-dynamodb`).

## DynamoDB persistence layer

**This branch (`one-table`):** one table **`${PROJECT_KEY}-${PROJECT_ENV}-app`**. NextAuth rows keep the adapter shape (`pk`/`sk`/`GSI1PK`/`GSI1SK`, TTL on `expires`). Decision runs use **`pk`/`sk` = `RUN#<run_id>`** with **`by-decision`** / **`by-user`** GSIs (hash on `decision_id` / `user_id`, range on **`updatedAt`** so lists reflect last activity). Code: `lib/db/runs.ts`, `lib/db/users.ts`, `lib/db/run-keys.ts`, `server/config/dynamodb.ts`. Table definition: `packages/local/docker-dynamodb/dynamo-create-table.sh`. Changing GSI key schema requires recreating the app table (for example `npm run dynamo:remove` then `npm run dynamo:create-table` in local dev).

**Coming from `main` with existing data?** Legacy **`…-runs`** and **`…-auth`** are unchanged on disk. Run **`npm run dynamo:migrate-legacy`** once after creating `…-app` to copy all runs and auth rows into the app table. New reads/writes use **`…-app`** only.

**Branch `main`:** two tables (`…-runs` with PK `run_id`, and `…-auth`). Use `main`’s `dynamo-create-table.sh` there.

### DAO surface (`lib/db/runs.ts`)

- **insertRun** / **getRun** / **replaceRun** / **getRunsByDecisionId** / **listRunsForUser** — same API as before; list queries return runs ordered by **`updatedAt`** (last activity). The physical table name and run primary key shape differ on this branch.

**Why:** Persisting runs lets users return to a result, submit clarification for an existing run, and keep history.

## Project structure

```
decision-copilot/
├── packages/
│   ├── nextjs/                       # Next.js app
│   │   ├── app/
│   │   │   ├── page.tsx              # Home
│   │   │   ├── intake/               # Intake form
│   │   │   ├── run/result/           # Result + clarification form
│   │   │   └── api/decision/run/     # POST run (intake or clarification)
│   │   ├── lenses/                   # Risk, Reversibility, People, Brief (AI)
│   │   ├── llm/                      # OpenAI / Anthropic / Gemini clients
│   │   ├── lib/db/                   # DynamoDB persistence (runs, users)
│   │   ├── server/config/dynamodb.ts # DynamoDB doc client singleton
│   │   └── types/                    # decision.ts (intake, lenses, brief, run)
│   └── local/
│       └── docker-dynamodb/          # Docker compose + create-table script
├── testing/                          # Request/response samples, test scripts
├── .env                              # See "Environment" below
└── package.json                      # Workspace root; dev/build/dynamo scripts
```

## Getting started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Docker (for local DynamoDB)
- AWS CLI (used by the create-table script; credentials can be dummy values for local — see below)

### Install and run

```bash
npm install
npm run dynamo:init   # start DynamoDB Local + create …-app table (one-time per machine)
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000). Use "Start a decision intake" to begin.

DynamoDB Admin UI is at [http://127.0.0.1:8011](http://127.0.0.1:8011) (port from `DYNAMODB_ADMIN_PORT`).

### Environment

Create a `.env` at the repo root. Relevant variables:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for lenses and decision brief when using OpenAI. At least one LLM API key must be set. |
| `ANTHROPIC_API_KEY` | Optional. When set, you can choose Anthropic as the AI provider. |
| `GEMINI_API_KEY` | Optional. Same as above for Google Gemini. |
| `XAI_API_KEY` | Optional. When set, you can choose xAI (Grok) as the AI provider. |
| `XAI_MODEL` | Optional. xAI chat model (default `grok-4.3`). |
| `PROJECT_KEY` / `PROJECT_ENV` | Used in container and table names (default `decision-copilot` / `local`). |
| `APP_TABLE_NAME` | Optional. Single-table name on **`one-table`** (default `${PROJECT_KEY}-${PROJECT_ENV}-app`). |
| `DYNAMODB_ENDPOINT` | DynamoDB endpoint URL. Set for local Docker (`http://127.0.0.1:8010`); leave unset in prod to use real AWS. |
| `DYNAMODB_PORT` / `DYNAMODB_ADMIN_PORT` | Host ports for the DynamoDB and admin UI containers (defaults `8000` / `8001`; the repo ships with `8010` / `8011` to avoid clashing with other local DynamoDB stacks). |
| `AWS_REGION` | AWS region (default `us-east-1`). |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | DynamoDB Local ignores credentials but the SDK requires *something*; use `local` / `local`. In prod, leave unset and the SDK will use the default credential chain (IAM role, env vars, etc.). |

### Other scripts

- `npm run build` — Build all workspaces.
- `npm run typecheck` — Type-check all workspaces.
- `npm run dynamo:init` — Bring up DynamoDB Local + create the **`…-app`** table (this branch).
- `npm run dynamo:migrate-legacy` — Copy rows from legacy **`…-runs`** and **`…-auth`** into **`…-app`** (optional; use after switching from `main` with existing data). Idempotent; does not delete legacy tables.
- `npm run dynamo:snapshot` — Clone live `…-runs` / `…-auth` into `…-archive` tables (frozen copy; originals unchanged). Override with `SNAPSHOT_RUNS_TABLE_NAME` / `SNAPSHOT_AUTH_TABLE_NAME`.
- `npm run dynamo:start` / `dynamo:stop` — Start/stop the containers (data persists).
- `npm run dynamo:remove` — Stop and delete the data volume.
- `npm run dynamo:create-table` — Just (re)run the create-table script for **`…-app`**; safe to re-run, idempotent.

## API

- **POST `/api/decision/run`**
  - **Intake:** `{ "type": "intake", "intake": { "situation", "constraints", "posture", ... } }`  
    Runs the three lenses (and brief if no clarification needed). Returns full run result; store or redirect to result page.
  - **Clarification:** `{ "type": "clarification", "decision_id", "run_id", "clarification": { "clarification_round", "answers": [...] } }`  
    Re-runs lenses with user answers and generates the brief. Returns updated run result.

Response includes `status` (e.g. `awaiting_clarification`, `complete`), `lens_outputs`, `clarification_questions` (when applicable), and `decision_brief` (title, generated_at, summary, recommendation, key_considerations, next_steps).

## Clarification question types

- **Yes/No** — Options: Yes, No, Unknown.
- **Numeric** — Free-form number.
- **Percentage** — 0–100, shown with “%” and passed to the model as e.g. “25%”.
- **Short text** — Free-form text.
- **Enum** — Select one of the given options.

Answers are included in re-run prompts; “Unknown” is formatted as “unknown (user didn’t know)” so the model can treat it appropriately.

## License

Private / not specified.
