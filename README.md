# Decision Copilot

Turn AI models into **your own think tank** for high-stakes decisions. Describe your situation, run one model or many on the same brief through three analysis lenses (Risk, Reversibility, People), answer follow-up questions, and get structured briefs you can compare. When you're ready, synthesize a **Unified Brief** — best-of-all-worlds thinking that merges the strongest ideas across models — with attribution for whose ideas made the cut. Extend analysis with research and variants, and discuss results in streaming chat.

> **Just want to run it?** Jump to [Run it locally](#run-it-locally).

## What it does

1. **Intake — brief your think tank** — Describe the decision, constraints, facts and assumptions, and open questions. Choose an analysis posture (compare options openly, challenge a leaning, risk-first, or widen the option set). Pick one AI model or convene your full think tank on the same brief. Demo scenarios illustrate the level of detail that works well. For “Challenge my leaning” you also state the plan you want pressure-tested.

2. **Three-lens analysis** — The app runs three lenses in parallel:
   - **Risk** — Top risks, assumptions, blind spots, tradeoffs, remaining uncertainty.
   - **Reversibility** — Irreversible steps, safe-to-try-first options.
   - **People** — Stakeholder impacts (who’s affected, how, positive/negative/neutral), execution risks.

3. **Clarification (optional)** — If a lens needs more information, it can ask follow-up questions. The answer control is inferred from the question wording (a question asking for an explanation renders as text, not a Yes/No dropdown). When multiple think-tank members are awaiting answers, similar follow-ups from different models are **de-duplicated and merged** into one combined form so you answer each distinct question once. The analysis is then re-run with your answers so the model doesn’t repeat the same questions.

4. **Decision brief** — After lenses (and any clarification), an AI synthesis produces a brief: title, summary, recommendation, key considerations, and next steps, with a **generated-at** timestamp shown in the UI.

5. **Multi-model think tank** — Choose **OpenAI**, **Anthropic**, **Google Gemini**, or **xAI (Grok)** individually, select a subset, or run **every configured model** on the same intake. Each produces its own structured analysis on the same brief. Partial failures are surfaced when one model errors in a parallel run.

6. **Cross-model comparison & Unified Brief** — Compare think-tank members side by side and synthesize a **Unified Brief** (Anthropic-authored) that merges research, variants, and lens outputs across lanes — best-of-all-worlds thinking in one recommendation. Regenerate synthesis as you add research or variants.

7. **Contribution attribution** — On the Unified Brief page, toggle the side panel from **Discuss** to **Contributions** to see Anthropic's honest take on *whose ideas made the cut*: per model, how much it influenced the final brief, which ideas were adopted, which unique angles only it raised, and what was deliberately left out.

8. **Research & variants** — Run targeted web-research tasks and alternative-scenario variants on a completed run; findings feed back into brief synthesis and chat context.

9. **Streaming chat** — Discuss a run, unified brief, or free-form analysis in chat with **SSE streaming** responses. Copy assistant messages as plain text or markdown.

10. **Demo scenarios & quick-fill** — Prebuilt intake scenarios (Slack→Teams, gen-AI compliance, HubSpot CRM for white-label fintech, and more) load realistic decision context with one click. On the clarification step, a demo quick-fill uses Gemini Flash to generate contextual sample answers in place so you can try the full flow fast.

11. **Free-form analysis (optional)** — An alternate intake path where the model chooses its own JSON structure instead of the three-lens + brief workflow. Useful for experiments; the structured path is the recommended default.

Runs are stored in DynamoDB (local Docker in dev, AWS in prod). The result page shows context, lens outputs, clarification when needed, the decision brief, research/variant tools, and chat.

## Tech stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **LLM:** OpenAI, Anthropic, Google Gemini, and xAI (Grok). Structured outputs for lenses and brief; streaming for chat. Server-only API keys.
- **Data:** DynamoDB — one physical **`…-app`** table on **`main`** for NextAuth and decision runs (`RUN#…` keys). Local dev uses `amazon/dynamodb-local` in Docker. Branch **`two-tables`** preserves the older two-table layout (`…-runs` + `…-auth`) if you need it.
- **Monorepo:** npm workspaces (`packages/nextjs`, `packages/local/docker-dynamodb`).

## DynamoDB persistence layer

**`main` (current):** one table **`${PROJECT_KEY}-${PROJECT_ENV}-app`**. NextAuth rows keep the adapter shape (`pk`/`sk`/`GSI1PK`/`GSI1SK`, TTL on `expires`). Decision runs use **`pk`/`sk` = `RUN#<run_id>`** with **`by-decision`** / **`by-user`** GSIs (hash on `decision_id` / `user_id`, range on **`updatedAt`** so lists reflect last activity). Code: `lib/db/runs.ts`, `lib/db/users.ts`, `lib/db/run-keys.ts`, `server/config/dynamodb.ts`. Table definition: `packages/local/docker-dynamodb/dynamo-create-table.sh`. Changing GSI key schema requires recreating the app table (for example `npm run dynamo:remove` then `npm run dynamo:create-table` in local dev).

More detail: [`docs/DYNAMODB_SINGLE_TABLE.md`](docs/DYNAMODB_SINGLE_TABLE.md).

**Migrating from the old two-table layout?** Legacy **`…-runs`** and **`…-auth`** tables can stay on disk. Run **`npm run dynamo:migrate-legacy`** once after creating **`…-app`** to copy all runs and auth rows into the app table. Idempotent; does not delete legacy tables.

**Branch `two-tables`:** frozen snapshot of the pre-migration layout (separate **`…-runs`** and **`…-auth`** tables). Use it if you need the old schema without the single-table changes.

### DAO surface (`lib/db/runs.ts`)

- **insertRun** / **getRun** / **replaceRun** / **getRunsByDecisionId** / **listRunsForUser** — list queries return runs ordered by **`updatedAt`** (last activity).

**Why:** Persisting runs lets users return to a result, submit clarification for an existing run, keep history, and build cross-provider comparisons over time.

## Project structure

```
decision-copilot/
├── packages/
│   ├── nextjs/                       # Next.js app
│   │   ├── app/
│   │   │   ├── page.tsx              # Home
│   │   │   ├── intake/               # Intake form
│   │   │   ├── run/                  # Result, chat, unified brief, free-form
│   │   │   └── api/decision/run/     # Run, chat, research, synthesis APIs
│   │   ├── lenses/                   # Risk, Reversibility, People, Brief, Synthesis
│   │   ├── llm/                      # OpenAI, Anthropic, Gemini, xAI + streaming
│   │   ├── lib/db/                   # DynamoDB persistence (runs, users)
│   │   ├── server/config/dynamodb.ts # DynamoDB doc client singleton
│   │   └── types/                    # decision.ts (intake, lenses, brief, run)
│   └── local/
│       └── docker-dynamodb/          # Docker compose + create-table script
├── docs/                             # DynamoDB single-table notes, migration guides
├── testing/                          # Request/response samples, test scripts
├── .env                              # See "Environment" below
└── package.json                      # Workspace root; dev/build/dynamo scripts
```

## Run it locally

### Prerequisites

- **Node.js ≥ 20** and **npm ≥ 10**
- **Docker** running (for local DynamoDB)
- **AWS CLI** installed (the create-table script uses it; for local dev the credentials can be dummy values — see step 2)

### 1. Install dependencies

```bash
git clone https://github.com/Caryndcarter/decision-copilot-dynamodb.git
cd decision-copilot-dynamodb
npm install
```

### 2. Create your `.env`

Create a `.env` file at the repo root. The minimum to boot the app locally:

```bash
# At least one LLM key is required; add the others to enable those providers.
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=        # needed for the Unified Brief + Contributions
GEMINI_API_KEY=           # needed for demo quick-fill sample answers
XAI_API_KEY=

# Local DynamoDB (Docker). These values work out of the box.
DYNAMODB_ENDPOINT=http://127.0.0.1:8010
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

> Only the LLM keys you set become selectable in the UI. OpenAI alone is enough to run the core three-lens + brief flow; add `ANTHROPIC_API_KEY` for the Unified Brief and `GEMINI_API_KEY` for demo answer generation. See the full [Environment](#environment) table for every option.

### 3. Start DynamoDB and create the table

```bash
npm run dynamo:init   # starts DynamoDB Local in Docker + creates the …-app table (one-time per machine)
```

### 4. Start the dev server

```bash
npm run dev
```

- **App:** [http://localhost:3000](http://localhost:3000) — describe a decision and convene your think tank (or load a demo scenario).
- **DynamoDB Admin UI:** [http://127.0.0.1:8011](http://127.0.0.1:8011) (port from `DYNAMODB_ADMIN_PORT`).

On later sessions you don't need `dynamo:init` again — `npm run dynamo:start` (or just `npm run dev` if the container is already up) is enough; data persists in the Docker volume.

### Troubleshooting

- **Port already in use (8010/8011):** another DynamoDB stack is likely running. Change `DYNAMODB_PORT` / `DYNAMODB_ADMIN_PORT` in `.env` (and update `DYNAMODB_ENDPOINT` to match), then re-run `npm run dynamo:init`.
- **`ResourceNotFoundException` / table missing:** run `npm run dynamo:create-table` (idempotent).
- **Provider not listed in the UI:** its API key isn't set in `.env`. Add the key and restart `npm run dev`.
- **Docker not running:** start Docker Desktop before `npm run dynamo:init`.

### Environment

Full list of variables for `.env` at the repo root:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for lenses and decision brief when using OpenAI. At least one LLM API key must be set. |
| `ANTHROPIC_API_KEY` | Optional. When set, you can choose Anthropic as the AI provider. |
| `GEMINI_API_KEY` | Optional. Same as above for Google Gemini. |
| `XAI_API_KEY` | Optional. When set, you can choose xAI (Grok) as the AI provider. |
| `OPENAI_MODEL` | Optional. OpenAI chat model (default `gpt-5.6-sol`; e.g. `gpt-5.6-terra` for lower cost). |
| `ANTHROPIC_MODEL` | Optional. Anthropic chat model (default `claude-fable-5`). |
| `XAI_MODEL` | Optional. xAI chat model (default `grok-4.5`). |
| `PROJECT_KEY` / `PROJECT_ENV` | Used in container and table names (default `decision-copilot` / `local`). |
| `APP_TABLE_NAME` | Optional. Single-table name (default `${PROJECT_KEY}-${PROJECT_ENV}-app`). |
| `DYNAMODB_ENDPOINT` | DynamoDB endpoint URL. Set for local Docker (`http://127.0.0.1:8010`); leave unset in prod to use real AWS. |
| `DYNAMODB_PORT` / `DYNAMODB_ADMIN_PORT` | Host ports for the DynamoDB and admin UI containers (defaults `8000` / `8001`; the repo ships with `8010` / `8011` to avoid clashing with other local DynamoDB stacks). |
| `AWS_REGION` | AWS region (default `us-east-1`). |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | DynamoDB Local ignores credentials but the SDK requires *something*; use `local` / `local`. In prod, leave unset and the SDK will use the default credential chain (IAM role, env vars, etc.). |
| `AUTH_SECRET` | Required for Auth.js sessions and for signing invite links. Generate with `openssl rand -base64 32`. |
| `INVITE_SECRET` | Optional. If set, used instead of `AUTH_SECRET` to sign invite tokens. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional. Enable Google sign-in (and first-time Google signup via invite). |
| `AUTH_URL` / `NEXTAUTH_URL` | Optional. Public app origin used when minting invite URLs (default `http://localhost:3001`). |

Signup is **invite-only**: mint a link with `npm run invite:create` (optional `--days 7`). Existing users can still sign in without an invite.

### Other scripts

- `npm run build` — Build all workspaces.
- `npm run typecheck` — Type-check all workspaces.
- `npm run invite:create` — Print an expiring signup invite URL (`--days`, `--base-url`).
- `npm run dynamo:init` — Bring up DynamoDB Local + create the **`…-app`** table.
- `npm run dynamo:migrate-legacy` — Copy rows from legacy **`…-runs`** and **`…-auth`** into **`…-app`** (optional; use when upgrading from the two-table layout). Idempotent; does not delete legacy tables.
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

Response includes `status` (e.g. `awaiting_clarification`, `complete`), `lens_outputs`, `clarification_questions` (when applicable), and `decision_brief` (title, `generated_at`, summary, recommendation, key_considerations, next_steps).

Chat endpoints under `/api/decision/run/.../chat` and `/api/decision/run/unified-brief-chat` stream responses via SSE.

## Clarification question types

- **Yes/No** — Options: Yes, No, Unknown.
- **Numeric** — Free-form number.
- **Percentage** — 0–100, shown with “%” and passed to the model as e.g. “25%”.
- **Short text** — Free-form text.
- **Enum** — Select one of the given options.

Answers are included in re-run prompts; “Unknown” is formatted as “unknown (user didn’t know)” so the model can treat it appropriately.

## License

Private / not specified.
