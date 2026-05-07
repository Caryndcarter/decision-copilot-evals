#!/usr/bin/env bash
# Create local DynamoDB tables for Decision Copilot.
#
# Tables:
#   - {PROJECT_KEY}-{PROJECT_ENV}-runs
#       PK: run_id (S)
#       GSI by-decision: decision_id HASH, createdAt RANGE (projection ALL)
#       GSI by-user:     user_id     HASH, createdAt RANGE (projection ALL)
#
#   - {PROJECT_KEY}-{PROJECT_ENV}-auth
#       PK: pk (S), SK: sk (S)
#       GSI1: GSI1PK HASH, GSI1SK RANGE (projection ALL)
#       (Schema required by @auth/dynamodb-adapter. TTL on `expires` is
#       enabled below so expired sessions / verification tokens are cleaned
#       up automatically.)
#
# Idempotent: "ResourceInUseException" (table already exists) is treated
# as success. Any other AWS CLI error is printed and the script exits.

set -euo pipefail

PROJECT_KEY="${PROJECT_KEY:-decision-copilot}"
PROJECT_ENV="${PROJECT_ENV:-local}"

ENDPOINT="${DYNAMODB_ENDPOINT:-http://127.0.0.1:${DYNAMODB_PORT:-8000}}"
REGION="${AWS_REGION:-us-east-1}"

RUNS_TABLE="${RUNS_TABLE_NAME:-${PROJECT_KEY}-${PROJECT_ENV}-runs}"
AUTH_TABLE="${AUTH_TABLE_NAME:-${PROJECT_KEY}-${PROJECT_ENV}-auth}"

# DynamoDB Local ignores credentials but the AWS CLI requires *something*.
# Set them inline so we never accidentally use a real ~/.aws profile.
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local

# Run an aws-cli command; succeed if the command exits 0 OR if its stderr
# matches "ResourceInUseException" (idempotent re-run). Print the real
# error and exit on anything else.
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

echo "→ Creating table: $RUNS_TABLE"
run_idempotent "$RUNS_TABLE" \
  aws dynamodb create-table \
    --table-name "$RUNS_TABLE" \
    --attribute-definitions \
      AttributeName=run_id,AttributeType=S \
      AttributeName=decision_id,AttributeType=S \
      AttributeName=user_id,AttributeType=S \
      AttributeName=createdAt,AttributeType=S \
    --key-schema \
      AttributeName=run_id,KeyType=HASH \
    --global-secondary-indexes \
      "[
         {
           \"IndexName\": \"by-decision\",
           \"KeySchema\": [
             {\"AttributeName\": \"decision_id\", \"KeyType\": \"HASH\"},
             {\"AttributeName\": \"createdAt\",   \"KeyType\": \"RANGE\"}
           ],
           \"Projection\": {\"ProjectionType\": \"ALL\"}
         },
         {
           \"IndexName\": \"by-user\",
           \"KeySchema\": [
             {\"AttributeName\": \"user_id\",   \"KeyType\": \"HASH\"},
             {\"AttributeName\": \"createdAt\", \"KeyType\": \"RANGE\"}
           ],
           \"Projection\": {\"ProjectionType\": \"ALL\"}
         }
       ]" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"

echo "→ Creating table: $AUTH_TABLE"
run_idempotent "$AUTH_TABLE" \
  aws dynamodb create-table \
    --table-name "$AUTH_TABLE" \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
      AttributeName=GSI1PK,AttributeType=S \
      AttributeName=GSI1SK,AttributeType=S \
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
         }
       ]" \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"

echo "→ Enabling TTL on $AUTH_TABLE.expires"
run_idempotent "TTL on $AUTH_TABLE" \
  aws dynamodb update-time-to-live \
    --table-name "$AUTH_TABLE" \
    --time-to-live-specification "Enabled=true,AttributeName=expires" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION"

echo
echo "DynamoDB ready at $ENDPOINT"
echo "Admin UI:        http://127.0.0.1:${DYNAMODB_ADMIN_PORT:-8001}"
