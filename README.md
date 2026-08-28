# Decision Copilot

Turn AI models into **your own think tank** for high-stakes decisions. Describe your situation, run one model or many on the same brief through three analysis lenses (Risk, Reversibility, Stakeholders), answer follow-up questions, and get structured briefs you can compare. When you're ready, synthesize a **Unified Brief** — best-of-all-worlds thinking that merges the strongest ideas across models — with attribution for whose ideas made the cut. Extend analysis with research and variants, and discuss results in streaming chat.

This repo is the **evals deployment** of Decision Copilot: same product core, a separate MongoDB database (`DB_NAME`), plus a public **Model Studies** research site and authenticated **harness findings** dashboards for moral-eval work.

> **Just want to run it?** Jump to [Run it locally](#run-it-locally).

## What it does

### Decision product

1. **Intake — brief your think tank** — Describe the decision, constraints, facts and assumptions, and open questions. Choose an analysis posture (compare options openly, challenge a leaning, risk-first, or widen the option set). Pick one AI model or convene your full think tank on the same brief. Demo scenarios illustrate the level of detail that works well. For “Challenge my leaning” you also state the plan you want pressure-tested.

2. **Three-lens analysis** — The app runs three lenses in parallel:
   - **Risk** — Top risks, assumptions, blind spots, tradeoffs, remaining uncertainty.
   - **Reversibility** — Irreversible steps, safe-to-try-first options.
   - **Stakeholders** — Stakeholder impacts (who’s affected, how, positive/negative/neutral), execution risks.

3. **Clarification (optional)** — If a lens needs more information, it can ask follow-up questions. The answer control is inferred from the question wording (a question asking for an explanation renders as text, not a Yes/No dropdown). When multiple think-tank members are awaiting answers, similar follow-ups from different models are **de-duplicated and merged** into one combined form so you answer each distinct question once. The analysis is then re-run with your answers so the model doesn’t repeat the same questions.

4. **Decision brief** — After lenses (and any clarification), an AI synthesis produces a brief: title, summary, recommendation, key considerations, and next steps, with a **generated-at** timestamp shown in the UI.

5. **Multi-model think tank** — Choose **OpenAI**, **Anthropic**, **Google Gemini**, or **xAI (Grok)** individually, select a subset, or run **every configured model** on the same intake. Each produces its own structured analysis on the same brief. Partial failures are surfaced when one model errors in a parallel run.

6. **Cross-model comparison & Unified Brief** — Compare think-tank members side by side and synthesize a **Unified Brief** (Anthropic-authored) that merges research, variants, and lens outputs across lanes — best-of-all-worlds thinking in one recommendation. Regenerate synthesis as you add research or variants.

7. **Contribution attribution** — On the Unified Brief page, toggle the side panel from **Discuss** to **Contributions** to see Anthropic's honest take on *whose ideas made the cut*: per model, how much it influenced the final brief, which ideas were adopted, which unique angles only it raised, and what was deliberately left out.

8. **Research & variants** — Run targeted web-research tasks and alternative-scenario variants on a completed run; findings feed back into brief synthesis and chat context.

9. **Streaming chat** — Discuss a run, unified brief, or free-form analysis in chat with **SSE streaming** responses. Copy assistant messages as plain text or markdown.

10. **Demo scenarios & quick-fill** — Prebuilt intake scenarios (Slack→Teams, gen-AI compliance, HubSpot CRM for white-label fintech, and more) load realistic decision context with one click. On the clarification step, a demo quick-fill uses Gemini Flash to generate contextual sample answers in place so you can try the full flow fast.

11. **Free-form analysis (optional)** — An alternate intake path where the model chooses its own JSON structure instead of the three-lens + brief workflow. Useful for experiments; the structured path is the recommended default.

Runs are stored in **MongoDB Atlas** (database name from `DB_NAME`, default `decision-copilot-evals`). The result page shows context, lens outputs, clarification when needed, the decision brief, research/variant tools, and chat. **My Decisions** (`/runs`) groups runs by decision and surfaces harness study batches for eval work.

### Access & accounts (invite-only)

Signup is **invite-only**. Existing users sign in with email/password or Google without a new invite.

**How someone gets in:**

1. **Request access** — Public form at `/request-access`. Submissions land in Mongo as pending `invite_requests` (honeypot + timing + per-IP rate limits). Optional `SLACK_INVITE_ALERT_WEBHOOK_URL` posts to Slack when a request arrives.
2. **Admin review** — Signed-in admins open **`/admin`**: approve (mints a 7-day, email-scoped invite URL to copy and send manually) or deny. Nothing is emailed automatically.
3. **Direct invite** — Admins can also mint a general invite link from `/admin` or `npm run invite:create` (optionally scoped to one email when approving a request).
4. **Signup** — Recipient opens the invite link (`/auth/signup?invite=…`), creates credentials or completes Google OAuth. The token must be valid and, when email-scoped, match the signup address.

**Admin tooling** (`is_admin` flag):

- **`/admin`** — Create invite links, review pending access requests, list users, grant/revoke admin.
- **`/runs` as admin** — See harness batches and runs across users (not just your own).
- **Bootstrap** — First admin: `npm run admin:set -- --email you@example.com`. After changing your own admin flag, sign out and back in so the JWT session refreshes.

### Research surfaces

- **Homepage (`/`)** — Product positioning plus a comparison table vs generic multi-model AI chat (structured brief vs open thread, fixed Risk/Reversibility/Stakeholders rubric, link to Model Studies).
- **Model Studies (`/model-studies`)** — Public microsite: study overviews, rollup findings, methodology pages. No sign-in required.
- **Harness findings (`/harness/findings`)** — Authenticated dashboard for moral-eval and authorship study batches (Meridian IC, Hormuz, multi-demo authorship). Linked from **My Decisions** when you have matching harness runs.

## Tech stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **LLM:** OpenAI, Anthropic, Google Gemini, and xAI (Grok). Structured outputs for lenses and brief; streaming for chat. Server-only API keys.
- **Data:** MongoDB Atlas — `runs` + Auth.js collections (`users`, sessions, etc.) in a dedicated database on the shared cluster.
- **Monorepo:** npm workspaces (`packages/nextjs`, optional local packages).

## MongoDB persistence layer

Same Atlas **cluster** credentials as the original Decision Copilot; a separate **`DB_NAME`** (default `decision-copilot-evals`) isolates evals data. Atlas creates the database on first write.

- **Connection:** `MONGODB_URI` + `DB_NAME` → `server/config/mongodb.ts` (native `mongodb` driver + `@auth/mongodb-adapter`).
- **Runs:** collection `runs`, keyed by `run_id`, with indexes on `decision_id` / `user_id` + `updatedAt`. DAO: `lib/db/runs.ts`.
- **Users:** collection `users` (credentials `passwordHash` + Auth.js adapter fields). DAO: `lib/db/users.ts`.
- **Invite requests:** collection `invite_requests` (public `/request-access` submissions; admin approve/deny). DAO: `lib/db/invite-requests.ts`.

### DAO surface (`lib/db/runs.ts`)

- **insertRun** / **getRun** / **replaceRun** / **getRunsByDecisionId** / **listRunsForUser** / **deleteRun** — list queries return runs ordered by **`updatedAt`** (last activity).

**Why:** Persisting runs lets users return to a result, submit clarification for an existing run, keep history, and build cross-provider comparisons over time.

## Project structure

```
decision-copilot/
├── packages/
│   ├── nextjs/                       # Next.js app
│   │   ├── app/
│   │   │   ├── page.tsx              # Home (product + vs multi-model chat)
│   │   │   ├── intake/               # Intake form
│   │   │   ├── run/                  # Result, chat, unified brief, free-form
│   │   │   ├── runs/                 # My Decisions dashboard
│   │   │   ├── admin/                # Admin panel (invites, requests, users)
│   │   │   ├── auth/                 # Sign-in, sign-up (invite-gated)
│   │   │   ├── request-access/       # Public access-request form
│   │   │   ├── model-studies/        # Public research microsite
│   │   │   ├── harness/findings/     # Authenticated eval findings dashboard
│   │   │   └── api/                  # decision/*, admin/*, auth/*, invite-requests
│   │   ├── lenses/                   # Risk, Reversibility, Stakeholders, Brief, Synthesis
│   │   ├── llm/                      # OpenAI, Anthropic, Gemini, xAI + streaming
│   │   ├── lib/db/                   # MongoDB persistence (runs, users, invite_requests)
│   │   ├── server/config/mongodb.ts  # Mongo client + DB_NAME
│   │   └── types/                    # decision.ts (intake, lenses, brief, run)
│   └── local/                        # Optional local tooling
├── docs/                             # Harness snapshots, design notes
├── testing/                          # Request/response samples, test scripts
├── .env                              # See "Environment" below
└── package.json                      # Workspace root; dev/build/harness scripts
```

## Run it locally

### Prerequisites

- **Node.js ≥ 20** and **npm ≥ 10**
- **MongoDB Atlas** URI (same cluster as the original app is fine; use a distinct `DB_NAME`)

### 1. Install dependencies

```bash
git clone <this-repo>
cd decision-copilot-evals
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

# MongoDB Atlas — same cluster URI as original Decision Copilot; separate database
MONGODB_URI=mongodb+srv://...
DB_NAME=decision-copilot-evals

# Auth (required for sign-in and invite signing)
AUTH_SECRET=                # openssl rand -base64 32
```

> Only the LLM keys you set become selectable in the UI. OpenAI alone is enough to run the core three-lens + brief flow; add `ANTHROPIC_API_KEY` for the Unified Brief and `GEMINI_API_KEY` for demo answer generation. See the full [Environment](#environment) table for every option.

### 3. Bootstrap an admin and create your first invite

```bash
npm run admin:set -- --email you@example.com
npm run invite:create -- --days 7
```

Open the printed invite URL to create your account, then sign in.

### 4. Start the dev server

```bash
npm run dev
```

- **App:** [http://localhost:5002](http://localhost:5002) — homepage, Model Studies, and (after sign-in) intake and My Decisions.

Optional persistence check: `npm run db:smoke`.

### Troubleshooting

- **Health check / Mongo errors:** confirm `MONGODB_URI` and Atlas Network Access (your IP or `0.0.0.0/0` for testing).
- **Provider not listed in the UI:** its API key isn't set in `.env`. Add the key and restart `npm run dev`.
- **Wrong data / empty app:** check `DB_NAME` — evals should use `decision-copilot-evals`, not the original `decision-copilot` database.
- **Port already in use / `.next/dev/lock`:** only one `next dev` per checkout. Stop the other process (`lsof -i :5002`) or use a separate [git worktree](#git-worktrees) on another port.
- **Sign-up blocked:** new accounts need a valid invite link (`/auth/signup?invite=…`) or use `/request-access` and wait for admin approval.

### Environment

Full list of variables for `.env` at the repo root:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for lenses and decision brief when using OpenAI. At least one LLM API key must be set. |
| `ANTHROPIC_API_KEY` | Optional. When set, you can choose Anthropic as the AI provider. |
| `GEMINI_API_KEY` | Optional. Same as above for Google Gemini. |
| `XAI_API_KEY` | Optional. When set, you can choose xAI (Grok) as the AI provider. |
| `OPENAI_MODEL` | Optional. OpenAI chat model (default `gpt-5.6-sol`; e.g. `gpt-5.6-terra` for lower cost). |
| `OPENAI_WEB_SEARCH_MODEL` | Optional. Model for research / live-web turns via Responses `web_search` (defaults to `OPENAI_MODEL`). |
| `ANTHROPIC_MODEL` | Optional. Anthropic chat model (default `claude-fable-5`). |
| `XAI_MODEL` | Optional. xAI chat model (default `grok-4.5`). |
| `MONGODB_URI` | Atlas (or local) Mongo connection string. |
| `DB_NAME` | Database name on that cluster (default `decision-copilot-evals`). |
| `AUTH_SECRET` | Required for Auth.js sessions and for signing invite links. Generate with `openssl rand -base64 32`. |
| `INVITE_SECRET` | Optional. If set, used instead of `AUTH_SECRET` to sign invite tokens. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional. Enable Google sign-in (first-time Google signup still requires a valid invite). |
| `SLACK_INVITE_ALERT_WEBHOOK_URL` | Optional. Slack Incoming Webhook URL; posts when someone submits `/request-access`. |
| `AUTH_URL` / `NEXTAUTH_URL` | Public app origin for Auth.js and invite URLs. Local default `http://localhost:5002`. On Vercel, omit or set to your deployment URL (`trustHost: true`). |

### Auth & route access

| Area | Sign-in required? |
|------|-------------------|
| `/`, `/model-studies/*`, `/request-access`, `/auth/*` | No |
| `/intake`, `/run/*`, `/runs`, `/admin`, `/harness/*` | Yes |
| `/api/decision/*`, `/api/admin/*` | Yes (401 when unauthenticated) |
| `/api/invite-requests` (POST) | No (public form; rate-limited) |
| `/api/health` | No |

Unauthenticated visitors hitting protected pages are redirected to `/auth/signin` with a `callbackUrl`.

### Deploying on Vercel

1. Import the repo; set **Root Directory** to `packages/nextjs`.
2. **Install command:** `cd ../.. && npm ci` (monorepo lockfile at repo root).
3. Set env vars: `AUTH_SECRET`, `MONGODB_URI`, `DB_NAME`, LLM keys, optionally `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `INVITE_SECRET` / `SLACK_INVITE_ALERT_WEBHOOK_URL`.
4. In Google Cloud OAuth, add redirect URI `https://<your-domain>/api/auth/callback/google`.
5. Atlas Network Access must allow Vercel egress (often `0.0.0.0/0` unless using private networking).
6. Turn on **Vercel Deployment Protection** (password or Vercel Authentication) so strangers cannot hit the URL even before app auth.
7. Bootstrap the first admin against the production DB: `npm run admin:set -- --email you@example.com` with prod `MONGODB_URI` / `DB_NAME` loaded, then mint invites from `/admin` or `npm run invite:create`.

### Git worktrees

Multiple checkouts can run side by side if each uses a different port (configured in that worktree’s `packages/nextjs/package.json`). List worktrees: `git worktree list`. Only one `next dev` per checkout — they share that checkout’s `.next` lock file.

### Other scripts

- `npm run build` — Build all workspaces.
- `npm run typecheck` — Type-check all workspaces.
- `npm run invite:create` — Print an expiring signup invite URL (`--days`, `--base-url`).
- `npm run admin:set` — Grant or revoke `is_admin` by email (`--email`, optional `--revoke`).
- `npm run db:smoke` — Round-trip smoke test for runs/users against Mongo.
- `npm run harness:meridian-ic` / `harness:civitas` / `harness:hormuz` / `harness:demos:authorship` — Eval harnesses (see `EVALS.md`).

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
