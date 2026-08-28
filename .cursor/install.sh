#!/usr/bin/env bash
#
# Cloud Agent install phase (idempotent).
# Refreshes Node dependencies and ensures a local MongoDB server is available.
# Per-boot runtime work (starting mongod, writing .env) lives in start.sh.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[install] Installing Node dependencies (npm ci)…"
npm ci

# Local MongoDB server for development. Skipped when already present (e.g. from a
# prebuilt snapshot) so the step stays fast and idempotent.
if ! command -v mongod >/dev/null 2>&1; then
  echo "[install] Installing MongoDB 8.0…"
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq mongodb-org
else
  echo "[install] MongoDB already installed ($(mongod --version | head -1))."
fi

echo "[install] Done."
