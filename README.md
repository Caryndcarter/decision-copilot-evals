# Decision Copilot

Turn AI models into **your own think tank** for high-stakes decisions. Describe your situation, run one model or many on the same brief through three analysis lenses (Risk, Reversibility, Stakeholders), answer follow-up questions, and get structured briefs you can compare. When you're ready, synthesize a **Unified Brief** — best-of-all-worlds thinking that merges the strongest ideas across models — with attribution for whose ideas made the cut. Extend analysis with research and variants, and discuss results in streaming chat.

This repo is the **evals deployment** of Decision Copilot: same product core, a separate MongoDB database (`DB_NAME`), a public **Model Studies** research site (committed snapshots — no login), a no-signup **product tour**, and authenticated **harness findings** dashboards for quote-level moral-eval work.

> **Just want to run it?** Jump to [Run it locally](#run-it-locally). Public Model Studies and the tour start with almost no setup.

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

10. **Demo scenarios & quick-fill** — Prebuilt intake scenarios (Meran Tankers / Hormuz routing, Slack→Teams, gen-AI compliance, HubSpot CRM for white-label fintech, and more) load realistic decision context with one click. On the clarification step, a demo quick-fill uses Gemini Flash to generate contextual sample answers in place so you can try the full flow fast.

11. **Product tour (no sign-up)** — `/tour` walks a frozen Meran Tankers decision (Strait of Hormuz routing) through intake, clarification, per-model Decision Briefs, and the Unified Brief. No API keys, no Mongo. The Decision Brief page has an on-page guide (model menu → analysis sections → Unified Brief). Tour briefs are labeled as shortened excerpts on purpose.

12. **Free-form analysis (optional)** — An alternate intake path where the model chooses its own JSON structure instead of the three-lens + brief workflow. Useful for experiments; the structured path is the recommended default.

Live runs are stored in **MongoDB** (Atlas or local; database name from `DB_NAME`, default `decision-copilot-evals`). The result page shows context, lens outputs, clarification when needed, the decision brief, research/variant tools, and chat. **My Decisions** (`/runs`) groups runs by decision and surfaces harness study batches for eval work. The intake form (`/intake`) is publicly viewable; starting a real run still requires a signed-in session.

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
- **Bootstrap** — Create an account from an invite first, then `npm run admin:set -- --email you@example.com`. The CLI looks up an existing user; it cannot mint the first account. After changing your own admin flag, sign out and back in so the JWT session refreshes.

### Research surfaces

Public Model Studies pages are a **committed snapshot**. They do not read live Atlas batches. Quote-level coding and live authorship rollups stay behind sign-in at `/harness/findings`.

- **Homepage (`/`)** — Product positioning, comparison vs generic multi-model chat, links to the tour and Model Studies.
- **How it works (`/how-it-works`)** — Product flow: intake → three lenses → Decision Briefs → Unified Brief.
- **Product tour (`/tour` → `/demo/*`)** — Frozen Meran Tankers walkthrough. No account.
- **Model Studies (`/model-studies`)** — Public research site (no sign-in):
  - **Overview** — Studies, published finding cards, dataset rollup.
  - **Results** (`/model-studies/results`) — Major findings, coded-batch charts, and a case index. Voice Influence charts share one C1–C5 category key (kind of pressure, not filing specifics).
  - **Case pages** (`/model-studies/results/<id>`) — What was submitted, what was coded, expandable full intake, scoreboards.
  - **Finding write-ups** (`/model-studies/findings/<slug>`) — Longer stories (e.g. Gemini capital-side lean, explicit human harm, ChatGPT self-credit, Grok-label penalty).
  - **Why it matters** and **Methodology**.
- **Harness findings (`/harness/findings`)** — Authenticated dashboard for quote-level moral-eval and live authorship batches (Meridian IC, Meran Tankers / Hormuz, Civitas, multi-demo authorship). Linked from **My Decisions** when you have matching harness runs.

**Studies on the public site**

| Study | Cases | What it holds constant / varies |
|-------|--------|----------------------------------|
| **Voice Influence** | Meridian IC; Meran Tankers | Same facts; five filer voices (provisional lean, confident tone, inflated urgency, load-bearing story, honest tradeoff). |
| **Authorship** | Synthesizer Behavior (route stays `authorship-budget-conditions`) | Same briefs under Blind / Revealed / Reassigned names. Two stories: ChatGPT self-credit vs peers, and a Grok-label penalty. |
| **Replication** | Civitas replication | Same scenario, many trials (Unified Briefs). |

Live multi-demo authorship batches are listed on Results as ongoing — they have no public committed scoreboard.

## Tech stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS.
- **LLM:** OpenAI, Anthropic, Google Gemini, and xAI (Grok). Structured outputs for lenses and brief; streaming for chat. Server-only API keys.
- **Data:** MongoDB (Atlas or local) — `runs` + Auth.js collections (`users`, sessions, etc.) in a dedicated database. Public Model Studies pages read committed JSON in the repo, not live Mongo.
- **Monorepo:** npm workspaces (`packages/nextjs`, optional local packages).

## MongoDB persistence layer

A separate **`DB_NAME`** (default `decision-copilot-evals`) isolates evals data from any other Decision Copilot app on the same cluster. Atlas (or local Mongo) creates the database on first write. Public `/model-studies` pages do not need this — they read committed snapshots in `packages/nextjs/data/` and `packages/nextjs/lib/`.

- **Connection:** `MONGODB_URI` + `DB_NAME` → `server/config/mongodb.ts` (native `mongodb` driver + `@auth/mongodb-adapter`).
- **Runs:** collection `runs`, keyed by `run_id`, with indexes on `decision_id` / `user_id` + `updatedAt`. DAO: `lib/db/runs.ts`.
- **Users:** collection `users` (credentials `passwordHash` + Auth.js adapter fields). DAO: `lib/db/users.ts`.
- **Invite requests:** collection `invite_requests` (public `/request-access` submissions; admin approve/deny). DAO: `lib/db/invite-requests.ts`.

### DAO surface (`lib/db/runs.ts`)

- **insertRun** / **getRun** / **replaceRun** / **getRunsByDecisionId** / **listRunsForUser** / **deleteRun** — list queries return runs ordered by **`updatedAt`** (last activity).

**Why:** Persisting runs lets users return to a result, submit clarification for an existing run, keep history, and build cross-provider comparisons over time.

## Project structure

```
decision-copilot-evals/
├── packages/
│   ├── nextjs/                       # Next.js app
│   │   ├── app/
│   │   │   ├── page.tsx              # Home (product + vs multi-model chat)
│   │   │   ├── how-it-works/         # Product flow
│   │   │   ├── tour/                 # Product tour landing (no sign-up)
│   │   │   ├── demo/                 # Frozen tour: intake, clarify, briefs, unified
│   │   │   ├── intake/               # Live intake form (viewable logged out)
│   │   │   ├── run/                  # Result, chat, unified brief, free-form
│   │   │   ├── runs/                 # My Decisions dashboard
│   │   │   ├── admin/                # Admin panel (invites, requests, users)
│   │   │   ├── auth/                 # Sign-in, sign-up (invite-gated)
│   │   │   ├── request-access/       # Public access-request form
│   │   │   ├── model-studies/        # Public research microsite
│   │   │   ├── harness/findings/     # Authenticated eval findings dashboard
│   │   │   └── api/                  # decision/*, admin/*, auth/*, invite-requests
│   │   ├── data/                     # Committed public snapshots (authorship, moral)
│   │   ├── lenses/                   # Risk, Reversibility, Stakeholders, Brief, Synthesis
│   │   ├── llm/                      # OpenAI, Anthropic, Gemini, xAI + streaming
│   │   ├── lib/db/                   # MongoDB persistence (runs, users, invite_requests)
│   │   ├── server/config/mongodb.ts  # Mongo client + DB_NAME (lazy; public pages skip it)
│   │   └── types/                    # decision.ts (intake, lenses, brief, run)
│   └── local/                        # Optional local tooling
├── docs/                             # Harness snapshots, design notes
├── testing/                          # Request/response samples, test scripts
├── EVALS.md                          # How to re-run harnesses
├── .env                              # See "Environment" below (create this; not committed)
└── package.json                      # Workspace root; dev/build/harness scripts
```

## Run it locally

Two tracks. **A** is enough to browse Model Studies and walk the product tour. **B** is the signed-in think tank (real model calls, persisted runs).

### Prerequisites

- **Node.js ≥ 20** and **npm ≥ 10**
- Track B only: a **MongoDB** URI (Atlas `mongodb+srv://…` or local `mongodb://127.0.0.1:27017`) and at least one LLM API key

### 1. Clone and install

```bash
git clone https://github.com/Caryndcarter/decision-copilot-evals.git
cd decision-copilot-evals
npm install
```

Create a `.env` file at the **repo root** (not `packages/nextjs`). The Next app loads that file via `next.config.ts`.

### Track A — public site and tour (no Mongo, no LLM keys)

Enough for `/`, `/how-it-works`, `/tour`, `/demo/*`, and `/model-studies/*`. Those pages use committed fixtures and snapshots.

```bash
# .env — AUTH_SECRET so Auth.js session endpoints do not error on public pages
AUTH_SECRET=                # openssl rand -base64 32
```

```bash
npm run dev
```

Open [http://localhost:5002](http://localhost:5002).

| Try this | URL |
|----------|-----|
| Homepage | http://localhost:5002/ |
| Product tour | http://localhost:5002/tour |
| Model Studies overview | http://localhost:5002/model-studies |
| Results (findings + charts) | http://localhost:5002/model-studies/results |
| A Voice Influence case | http://localhost:5002/model-studies/results/meridian-ic |
| Synthesizer Behavior | http://localhost:5002/model-studies/results/authorship-budget-conditions |

You cannot start a live think-tank run on this track. `/intake` is viewable; submit will 401 until you sign in.

### Track B — full product (Mongo + at least one model)

#### 2. Fill in `.env`

```bash
# At least one LLM key. Only the keys you set become selectable in the UI.
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=        # needed for the Unified Brief + Contributions
GEMINI_API_KEY=           # needed for demo quick-fill sample answers
XAI_API_KEY=

# Atlas or local Mongo. Use a dedicated DB_NAME so you do not write into another app.
MONGODB_URI=mongodb+srv://...
# MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=decision-copilot-evals

# Auth (required for sign-in and invite signing)
AUTH_SECRET=                # openssl rand -base64 32
AUTH_URL=http://localhost:5002
```

OpenAI alone runs the three-lens + brief flow. Add `ANTHROPIC_API_KEY` for the Unified Brief and `GEMINI_API_KEY` for demo answer generation. Full list: [Environment](#environment).

#### 3. Start the server, then create your account

`admin:set` looks up an existing user. Invite first, then grant admin.

```bash
npm run dev
```

In a second terminal:

```bash
npm run invite:create -- --days 7 --base-url http://localhost:5002
```

Open the printed `/auth/signup?invite=…` URL, create the account, and sign in.

```bash
npm run admin:set -- --email you@example.com
```

Sign out and back in so the JWT picks up `is_admin`. Then `/admin`, `/runs`, and `/harness/findings` work.

Optional persistence check: `npm run db:smoke`.

### Troubleshooting

- **Health check / Mongo errors:** confirm `MONGODB_URI` and, for Atlas, Network Access (your IP or `0.0.0.0/0` for testing). Local Mongo: `mongod` must be running.
- **Provider not listed in the UI:** its API key isn't set in `.env`. Add the key and restart `npm run dev`.
- **Wrong data / empty My Decisions:** check `DB_NAME` — evals should use `decision-copilot-evals`, not another app's database. Public Model Studies stay populated from committed files even if Mongo is empty.
- **Empty live authorship rollup:** public Synthesizer Behavior numbers come from `packages/nextjs/data/authorship-budget-conditions.json`. Live `/harness/findings` only shows batches owned by the signed-in user.
- **Port already in use / `.next/dev/lock`:** only one `next dev` per checkout. Stop the other process (`lsof -i :5002`) or use a separate [git worktree](#git-worktrees) on another port.
- **Sign-up blocked:** new accounts need a valid invite link (`/auth/signup?invite=…`) or use `/request-access` and wait for admin approval.
- **`admin:set` says no user found:** create the account from an invite first, then re-run the command.
- **Invite URL opens the wrong port:** pass `--base-url http://localhost:5002` or set `AUTH_URL`.

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
| `AUTH_URL` / `NEXTAUTH_URL` | Public app origin for Auth.js and invite URLs. Set to `http://localhost:5002` locally so `invite:create` prints the right host. On Vercel, omit or set to your deployment URL (`trustHost: true`). |

### Auth & route access

| Area | Sign-in required? |
|------|-------------------|
| `/`, `/how-it-works`, `/tour`, `/demo/*`, `/model-studies/*`, `/request-access`, `/auth/*` | No |
| `/intake` | Viewable logged out; starting a run needs a session (API 401) |
| `/run/*`, `/runs`, `/admin`, `/harness/*` | Yes |
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
7. Mint an invite against the production DB (`npm run invite:create` with prod `MONGODB_URI` / `DB_NAME` / `AUTH_SECRET` loaded), create the first account, then `npm run admin:set -- --email you@example.com`. Sign out and back in. Further invites can come from `/admin`.

### Git worktrees

Multiple checkouts can run side by side if each uses a different port (configured in that worktree’s `packages/nextjs/package.json`). List worktrees: `git worktree list`. Only one `next dev` per checkout — they share that checkout’s `.next` lock file.

### Other scripts

- `npm run build` — Build all workspaces.
- `npm run typecheck` — Type-check all workspaces.
- `npm test` — Vitest (unit tests for findings copy, tour chrome, etc.).
- `npm run invite:create` — Print an expiring signup invite URL (`--days`, `--base-url`).
- `npm run admin:set` — Grant or revoke `is_admin` by email (`--email`, optional `--revoke`). User must already exist.
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
