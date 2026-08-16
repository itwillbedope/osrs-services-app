# Production Database Procedure

Production and staging use committed Prisma forward migrations only.

Allowed production commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

`pnpm db:migrate` is defined as `prisma migrate deploy` in `package.json`.

Never run these against staging or production:

```bash
prisma migrate reset
pnpm db:reset
```

## Database Creation

Create a UTF8MB4 database and a restricted application user:

```sql
CREATE DATABASE osrs_services
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'osrs_app'@'127.0.0.1'
  IDENTIFIED BY '<private-strong-password>';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON osrs_services.* TO 'osrs_app'@'127.0.0.1';

FLUSH PRIVILEGES;
```

Use a private password manager or host secret store for credentials. Do not commit `DATABASE_URL`, `DATABASE_PASSWORD` or dumps.

## Initial Migration

```bash
set -a
. ./.env.production
set +a
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Run `pnpm db:seed` a second time during staging validation to confirm seeded defaults are idempotent and preserve edited feature flags.

## Verification

```bash
pnpm production:check
curl -fsS https://staging.osrsservices.com/health
curl -fsS https://staging.osrsservices.com/ready
pnpm production:smoke -- --base-url https://staging.osrsservices.com
```

Verify in the admin UI:

- Feature flags remain in the intended launch state.
- Manual-review payment method exists.
- TEST_HOSTED is disabled and blocked for production.
- Email delivery remains disabled until SMTP go-live.
- Chat settings match staging expectations.

## Backup

Before every migration:

```bash
deploy/scripts/backup-production.sh
```

The backup script covers the MySQL database and private attachment storage. It excludes `node_modules`, build cache and runtime logs.

## Restore

Restore is a last resort:

```bash
deploy/scripts/restore-production.sh /path/to/mysql-backup.sql.gz /path/to/private-attachments.tar.gz
```

Put the application in maintenance/offline state before restoring. The restore script requires explicit typed confirmation and does not store database passwords.

## Rollback Limitations

Prisma migrations are forward migrations. Application code can often roll back to a compatible previous commit, but database schema and data changes may not be automatically reversible. For application problems, disable the affected feature flag first, then roll application code back only when it remains compatible with the migrated schema.
