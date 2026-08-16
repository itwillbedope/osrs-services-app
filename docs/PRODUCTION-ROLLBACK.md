# Production Rollback

Rollback starts with the smallest reversible change. Do not assume database migrations can be automatically undone.

## 1. Feature-Flag Rollback

Use this first for launch-scope behavior problems:

- Disable the affected database feature flag.
- For payments, keep `PAYMENT_PROVIDER=MANUAL_REVIEW`, `EXTERNAL_PAYMENTS_ENABLED=false`, `PAYMENT_WEBHOOKS_ENABLED=false` and `PAYMENT_REFUNDS_ENABLED=false`.
- For email, set `EMAIL_DELIVERY_ENABLED=false`.
- For realtime chat, disable `chat_realtime_enabled` and stop `osrs-chat` if needed.

Pass criteria: the affected public/admin behavior is no longer reachable and existing records remain intact.

Fail criteria: the app cannot boot, migrations are incompatible, or the feature flag cannot be changed safely.

## 2. Application Code Rollback

Use only a commit compatible with the already-applied database schema:

```bash
git fetch origin --prune
git checkout --detach <previous-compatible-commit-sha>
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pnpm production:smoke -- --base-url https://<host>
```

Pass criteria: `/health`, `/ready` and launch-critical pages pass smoke tests.

Fail criteria: old code cannot run against the migrated schema. In that case, return to the forward commit and keep the affected feature disabled.

## 3. Nginx Rollback

Before editing Nginx, copy the last known-good config:

```bash
sudo cp /etc/nginx/sites-available/osrs-services.conf /etc/nginx/sites-available/osrs-services.conf.$(date -u +%Y%m%dT%H%M%SZ)
```

To roll back:

```bash
sudo cp /path/to/known-good-osrs-services.conf /etc/nginx/sites-available/osrs-services.conf
sudo nginx -t
sudo systemctl reload nginx
```

Pass criteria: HTTPS routes web traffic to port 3000 and `/socket.io` to port 3001.

## 4. DNS Rollback

Use the pre-cutover DNS record backup. Restore previous A/CNAME values and preserve MX, SPF, DKIM, DMARC and other TXT records.

DNS rollback depends on TTL and resolver cache. Keep the previous host running until traffic has drained.

## 5. Database Restore

Restore database backups only as a last resort for data-corruption or unrecoverable migration incidents.

```bash
deploy/scripts/restore-production.sh /path/to/mysql-backup.sql.gz /path/to/private-attachments.tar.gz
```

Pass criteria: restore completes, application boots, `/ready` passes and operator verifies key records.

Fail criteria: backup is missing, stale, from the wrong environment or cannot be restored cleanly.
