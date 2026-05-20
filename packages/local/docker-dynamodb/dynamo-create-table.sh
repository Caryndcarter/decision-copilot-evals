#!/usr/bin/env bash
# Create the single DynamoDB table used on the `one-table` branch.
#
# One physical table holds:
#   - NextAuth adapter items (pk/sk + GSI1, TTL on `expires`)
#   - Decision runs (pk = RUN#<run_id>, sk = RUN#<run_id>; GSIs by-decision / by-user
#     sort by updatedAt so “recent” lists reflect last activity; run items omit GSI1PK/GSI1SK)
#
# Legacy two-table layout (`…-runs` + `…-auth`) lives on `main`; migrate data with
#   `npm run dynamo:migrate-legacy` after this table exists.
#
# Idempotent: ResourceInUseException is treated as success.

set -euo pipefail

PROJECT_KEY="${PROJECT_KEY:-decision-copilot}"
PROJECT_ENV="${PROJECT_ENV:-local}"

ENDPOINT="${DYNAMODB_ENDPOINT:-http://127.0.0.1:${DYNAMODB_PORT:-8000}}"
REGION="${AWS_REGION:-us-east-1}"

APP_TABLE="${APP_TABLE_NAME:-${PROJECT_KEY}-${PROJECT_ENV}-app}"

export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local

run_idempotent() {
  local label="$1"
  shift
  local err
  if err=$("$@" 2>&1 >/dev/null); then
    echo "  ✓ $label"
    return 0
  fi
  if grep -q "ResourceInUseException\|already exists\|TimeToLive is already enabled" <<<"$err"; then
    echo "  • $label (already configured)"
    return 0
  fi
  echo "  ✗ $label failed:"
  echo "$err" | sed 's/^/      /'
  return 1
}

echo "→ Creating single app table: $APP_TABLE"
run_idempotent "$APP_TABLE" \
  aws dynamodb create-table \
    --table-name "$APP_TABLE" \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
      AttributeName=GSI1PK,AttributeType=S \
      AttributeName=GSI1SK,AttributeType=S \
      AttributeName=decision_id,AttributeType=S \
      AttributeName=user_id,AttributeType=S \
      AttributeName=createdAt,AttributeType=S \
      AttributeName=updatedAt,AttributeType=S \
    --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --global-secondary-indexes \
      "[
         {
           \"IndexName\": \"GSI1\",
           \"KeySchema\": [
             {\"AttributeName\": \"GSI1PK\", \"KeyType\": \"HASH\"},
             {\"AttributeName\": \"GSI1SK\", \"KeyType\": \"RANGE\"}
           ],
           \"Projection\": {\"ProjectionType\": \"ALL\"}
         },
         {
           \"IndexName\": \"by-decision\",
           \"KeySchema\": [
             {\"AttributeName\": \"decision_id\", \"KeyType\": \"HASH\"},
             {\"AttributeName\": \"updatedAt\",   \"KeyType\": \"RANGE\"}
           ],
           \"Projection\": {\"ProjectionType\": \"ALL\"}
         },
         {
           \"IndexName\": \"by-user\",
           \"KeySchema\": [
             {\"AttributeName\": \"user_id\",   \"KeyType\": \"HASH\"},
             {\"AttributeName\": \"updatedAt\", \"KeyType\": \"RANGE\"}
           ],
           \"Projection\": {\"ProjectionType\": \"ALL\"}
         }
       ]" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"

echo "→ Enabling TTL on $APP_TABLE.expires (sessions / verification tokens)"
run_idempotent "TTL on $APP_TABLE" \
  aws dynamodb update-time-to-live \
    --table-name "$APP_TABLE" \
    --time-to-live-specification "Enabled=true,AttributeName=expires" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"

echo
echo "DynamoDB app table ready at $ENDPOINT — $APP_TABLE"
echo "Admin UI: http://127.0.0.1:${DYNAMODB_ADMIN_PORT:-8001}"
echo "If you have legacy …-runs / …-auth from branch main, run: npm run dynamo:migrate-legacy"
