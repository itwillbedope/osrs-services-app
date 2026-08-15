#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

app_dir="${APP_DIR:-/var/www/osrs-services/current}"
expected_commit="${1:-${EXPECTED_COMMIT:-}}"
base_url="${RELEASE_BASE_URL:-${NEXT_PUBLIC_APP_URL:-}}"
backup_script="${BACKUP_SCRIPT:-${app_dir}/deploy/scripts/backup-production.sh}"

if [[ -z "${expected_commit}" ]]; then
  echo "Usage: EXPECTED_COMMIT=<sha> $0 or $0 <sha>" >&2
  exit 1
fi

cd "${app_dir}"

echo "Fetching origin"
git fetch origin --prune

echo "Verifying intended commit ${expected_commit}"
git cat-file -e "${expected_commit}^{commit}"
git checkout --detach "${expected_commit}"
actual_commit="$(git rev-parse HEAD)"
if [[ "${actual_commit}" != "${expected_commit}" ]]; then
  echo "HEAD mismatch: expected ${expected_commit}, got ${actual_commit}" >&2
  exit 1
fi

echo "Installing dependencies"
pnpm install --frozen-lockfile

echo "Generating Prisma client"
pnpm db:generate

echo "Building application"
pnpm build

echo "Running production configuration check"
pnpm production:check

echo "Creating database and private-storage backup checkpoint"
"${backup_script}"

echo "Applying forward Prisma migrations"
pnpm db:migrate

echo "Running idempotent seed"
pnpm db:seed

echo "Starting or reloading PM2 processes"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

if [[ -n "${base_url}" ]]; then
  echo "Running smoke test against ${base_url}"
  pnpm production:smoke -- --base-url "${base_url}"
else
  echo "RELEASE_BASE_URL or NEXT_PUBLIC_APP_URL is required for smoke tests." >&2
  exit 1
fi

echo "Release sequence complete for ${actual_commit}"
