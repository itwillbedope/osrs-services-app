#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="${BACKUP_ROOT:-/var/backups/osrs-services}"
backup_dir="${backup_root}/${timestamp}"

mysql_host="${MYSQL_HOST:-127.0.0.1}"
mysql_port="${MYSQL_PORT:-3306}"
mysql_user="${MYSQL_USER:-osrs_app}"
mysql_database="${MYSQL_DATABASE:-${DATABASE_NAME:-osrs_services}}"
attachment_root="${ATTACHMENT_ROOT:-${CUSTOM_BUILD_PRIVATE_ATTACHMENT_ROOT:-/var/lib/osrs-services/private/custom-build-attachments}}"

if [[ -z "${mysql_database}" || -z "${mysql_user}" || -z "${backup_root}" ]]; then
  echo "Missing backup configuration." >&2
  exit 1
fi

mkdir -p "${backup_dir}"
chmod 700 "${backup_root}" "${backup_dir}"

echo "Creating MySQL backup: ${backup_dir}/mysql-${timestamp}.sql.gz"
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --host="${mysql_host}" \
  --port="${mysql_port}" \
  --user="${mysql_user}" \
  "${mysql_database}" | gzip -9 > "${backup_dir}/mysql-${timestamp}.sql.gz"

if [[ -d "${attachment_root}" ]]; then
  echo "Creating private attachment backup: ${backup_dir}/private-attachments-${timestamp}.tar.gz"
  tar -czf "${backup_dir}/private-attachments-${timestamp}.tar.gz" \
    -C "$(dirname "${attachment_root}")" \
    "$(basename "${attachment_root}")"
else
  echo "Attachment root does not exist yet; skipping attachment archive: ${attachment_root}"
fi

cat > "${backup_dir}/README.txt" <<EOF
OSRS Services backup
Created UTC: ${timestamp}
Database: ${mysql_database}
Attachment root: ${attachment_root}

This backup excludes node_modules, build cache and runtime logs.
Database passwords are not stored in this directory.
EOF

echo "Backup complete: ${backup_dir}"
