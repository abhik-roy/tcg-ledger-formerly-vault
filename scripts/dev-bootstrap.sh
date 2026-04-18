#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Starting dev Postgres container..."
docker compose -f docker-compose.dev.yml up -d postgres-dev

echo "==> Waiting for healthcheck..."
for i in {1..30}; do
  if docker compose -f docker-compose.dev.yml ps postgres-dev | grep -q healthy; then
    echo "==> Postgres is healthy."
    break
  fi
  sleep 2
done

if ! docker compose -f docker-compose.dev.yml ps postgres-dev | grep -q healthy; then
  echo "ERROR: Postgres did not become healthy in 60s" >&2
  exit 1
fi

echo "==> Applying Prisma migrations..."
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  DATABASE_URL="postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev" \
    npx prisma migrate deploy
else
  echo "==> No migrations yet; skipping apply step."
fi

echo "==> Dev DB ready at: postgres://tcg_dev:tcg_dev_password@127.0.0.1:5433/tcg_ledger_dev"
