# Production Operations

Use these commands from the server as the application operator unless noted.

## PM2

```bash
pm2 status
pm2 describe osrs-web
pm2 describe osrs-chat
pm2 logs osrs-web --lines 100
pm2 logs osrs-chat --lines 100
pm2 restart osrs-web --update-env
pm2 restart osrs-chat --update-env
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
```

Do not paste environment dumps into tickets or chat. PM2 logs must not include passwords, database URLs containing passwords, SMTP secrets, payment secrets, session tokens, verification tokens or reset tokens.

## Nginx Logs

```bash
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -n 100 /var/log/nginx/error.log
sudo nginx -t
sudo systemctl reload nginx
```

Use request IDs or timestamps for diagnosis. Do not log raw cookies or authorization values.

## Disk Usage

```bash
df -h
du -sh /var/www/osrs-services/current/.next
du -sh /var/lib/osrs-services/private/custom-build-attachments
du -sh /var/backups/osrs-services
du -sh /var/log/osrs-services
```

## Database Health

```bash
mysqladmin --host=127.0.0.1 --user=osrs_app ping
mysql --host=127.0.0.1 --user=osrs_app osrs_services -e "SELECT COUNT(*) FROM _prisma_migrations;"
```

Use `.my.cnf`, a private prompt or a secret store for database credentials. Do not put database passwords in commands that may enter shell history.

## Health and Readiness

```bash
curl -fsS https://<host>/health
curl -fsS https://<host>/ready
pnpm production:smoke -- --base-url https://<host>
```

`/health` checks process liveness. `/ready` checks database reachability, Task 016 migration presence, private storage writability and safe config posture.

## Backup

```bash
deploy/scripts/backup-production.sh
```

Backups include MySQL and private attachment storage. They exclude `node_modules`, build cache and runtime logs.

## Restore

```bash
deploy/scripts/restore-production.sh /path/to/mysql-backup.sql.gz /path/to/private-attachments.tar.gz
```

Restore only after maintenance/offline state is active and explicit operator confirmation is complete.

## Deployment

```bash
deploy/scripts/release.sh <approved-commit-sha>
```

The release script fetches, verifies the intended commit, installs dependencies, generates Prisma, builds, runs production config checks, creates a backup checkpoint, deploys migrations, runs seed, reloads PM2 and runs smoke tests.
