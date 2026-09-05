#!/usr/bin/env bash
# Local development bootstrap: infra via docker compose, apps on the host.
set -euo pipefail
cd "$(dirname "$0")/../.."

docker compose -f infra/docker/docker-compose.yml up -d mysql redis minio
cp -n .env.example .env || true
pnpm install
pnpm --filter @chatter/database db:generate
pnpm --filter @chatter/database db:migrate
pnpm --filter @chatter/database build
pnpm --filter @chatter/database db:seed
echo "Infra ready. Run: pnpm dev  (or: node apps/api/dist/main.js, pnpm --filter @chatter/web dev)"
