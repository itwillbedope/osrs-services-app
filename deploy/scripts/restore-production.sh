#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

mysql_backup="${1:-}"
attachment_backup="${2:-}"

mysql_host="${MYSQL_HOST:-127.0.0.1}"
mysql_port="${MYSQL_PORT:-3306}"
mysql_user="${MYSQL_USER:-osrs_app}"
mysql_database="${MYSQL_DATABASE:-${DATABASE_NAME:-osrs_services}}"
attachment_root="${ATTACHMENT_ROOT:-${CUSTOM_BUILD_PRIVATE_ATTACHMENT_ROOT:-/var/lib/osrs-services/private/custom-build-attachments}}"
restore_stamp="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ -z "${mysql_backup}" || ! -f "${mysql_backup}" ]]; then
  echo "Usage: $0 /path/to/mysql-backup.sql.gz [/path/to/private-attachments.tar.gz]" >&2
  exit 1
fi

if [[ -n "${attachment_backup}" && ! -f "${attachment_backup}" ]]; then
  echo "Attachment backup file does not exist: ${attachment_backup}" >&2
  exit 1
fi

if [[ -z "${mysql_database}" || -z "${mysql_user}" ]]; then
  echo "Missing restore database configuration." >&2
  exit 1
fi

cat <<EOF
Restore is destructive.

Before continuing:
- Put the application in maintenance/offline state.
- Stop PM2 processes or block public traffic.
- Confirm this backup is from the intended environment.
- Confirm you have a fresh backup of the current state.

Database target: ${mysql_database}
MySQL backup: ${mysql_backup}
Attachment target: ${attachment_root}
Attachment backup: ${attachment_backup:-not provided}
EOF

read -r -p "Type RESTORE osrs-services to continue: " confirmation
if [[ "${confirmation}" != "RESTORE osrs-services" ]]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Restoring MySQL database ${mysql_database}"
gzip -dc "${mysql_backup}" | mysql \
  --host="${mysql_host}" \
  --port="${mysql_port}" \
  --user="${mysql_user}" \
  "${mysql_database}"

if [[ -n "${attachment_backup}" ]]; then
  parent_dir="$(dirname "${attachment_root}")"
  mkdir -p "${parent_dir}"
  if [[ -d "${attachment_root}" ]]; then
    mv "${attachment_root}" "${attachment_root}.pre-restore-${restore_stamp}"
  fi
  tar -xzf "${attachment_backup}" -C "${parent_dir}"
  chmod -R u+rwX,go-rwx "${attachment_root}"
fi

echo "Restore complete. Restart the application and run health/readiness checks."
