# Testing the decision run API

## Prerequisites

- **DynamoDB Local** running: `npm run dynamo:init` from repo root (one-time per machine; afterwards `npm run dynamo:start`).
- **`.env`** in repo root with `DYNAMODB_ENDPOINT`, `AWS_REGION`, dummy AWS keys, etc. (see top-level `README.md`).
- **Next.js** dev server: `npm run dev` from repo root.

## 1. Test intake (persists to DynamoDB)

From repo root:

```bash
./testing/test-api.sh
```

Or with an explicit request file:

```bash
./testing/test-api.sh testing/requests/explore-db-switch.json
```

- The response is printed and saved under `testing/responses/`.
- Copy `run_id` and `decision_id` from the response if you want to test clarification or check the DB.

## 2. Verify the run is in DynamoDB

**Option A – Admin UI**

Open [http://127.0.0.1:8011](http://127.0.0.1:8011), pick the `decision-copilot-local-runs` table, and you should see your run by `run_id`.

**Option B – AWS CLI**

```bash
AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
  aws dynamodb scan \
  --table-name decision-copilot-local-runs \
  --endpoint-url http://127.0.0.1:8010 \
  --region us-east-1
```

## 3. Test clarification (reads/updates from DynamoDB)

1. From a previous intake response, note `decision_id` and `run_id`.
2. Create a request file (e.g. `testing/requests/clarification.json`) with:

```json
{
  "type": "clarification",
  "decision_id": "<PASTE_DECISION_ID>",
  "run_id": "<PASTE_RUN_ID>",
  "clarification": {
    "clarification_round": 1,
    "answers": [
      { "question_id": "q1", "lens": "risk", "answer": "Intermediate", "answer_type": "enum" },
      { "question_id": "q2", "lens": "risk", "answer": true, "answer_type": "boolean" },
      { "question_id": "q3", "lens": "risk", "answer": 50, "answer_type": "numeric" }
    ]
  }
}
```

Replace `question_id` values with the ones from your intake response's `clarification_questions`, and set answers to match the types.

3. Run:

```bash
./testing/test-api.sh testing/requests/clarification.json
```

You should get back the updated run with `status: "complete"` and a new `decision_brief` / `lens_outputs`.

## 4. Test persistence across restarts

1. Run an intake with `./testing/test-api.sh` and note the `run_id`.
2. Stop the Next.js dev server (Ctrl+C), then start it again (`npm run dev`).
3. Call the clarification endpoint with that same `run_id` (step 3 above).

If the run is found and updated, runs are persisting in DynamoDB across restarts. (Container restarts also preserve the run because data lives on the `dynamodb-data` Docker volume; `npm run dynamo:remove` is what wipes it.)
