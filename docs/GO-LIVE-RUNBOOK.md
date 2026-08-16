# Go-Live Runbook

This is the final operator sequence. Production is not ready merely because CI is green.

## PRE-LAUNCH

Actions:

- Confirm approved launch commit.
- Confirm no production secrets are committed.
- Confirm `.env.production` exists only on the server.
- Confirm client inputs are complete.
- Confirm rollback owner and time window.

Pass: launch owner, technical owner and client approve the window.

Fail: any secret is in GitHub, legal copy is unapproved, payment/email provider status is unclear, or rollback owner is missing.

## STAGING

Actions:

- Bootstrap staging VPS.
- Configure staging database and environment.
- Run migrations and seed.
- Build and start PM2 processes.
- Configure Nginx and SSL.
- Run health, readiness and smoke tests.
- Complete manual QA.

Pass: staging smoke and client-critical workflows pass.

Fail: `/ready` fails, smoke has launch-critical failures, or manual payment copy is unapproved.

## CLIENT APPROVAL

Actions:

- Review service prices, stock, account listings, product listings, legal pages, payment instructions, support email, chat hours and feature flags.

Pass: written client approval for production cutover.

Fail: any required launch input remains unresolved.

## BACKUP

Actions:

- Back up production database.
- Back up private attachment storage.
- Confirm backup files exist and are readable.

Pass: backup checkpoint exists before migration.

Fail: backup fails or restore procedure is untested.

## PRODUCTION DEPLOY

Actions:

```bash
deploy/scripts/release.sh <approved-commit-sha>
```

Pass: release script completes, PM2 processes are online and smoke tests pass.

Fail: install, build, production check, backup, migration, seed, PM2 or smoke tests fail.

## DNS CUTOVER

Actions:

- Back up GoDaddy DNS records.
- Update approved A/CNAME records.
- Preserve MX, SPF, DKIM, DMARC and TXT verification records.

Pass: DNS resolves to the approved production server.

Fail: email records are lost, wrong IP is used, or production owner has not approved.

## SSL

Actions:

- Issue certificates for production hostnames.
- Verify Nginx syntax.
- Reload Nginx.

Pass: HTTPS works for apex and `www`.

Fail: certificate mismatch, mixed HTTP behavior, or Nginx syntax failure.

## SMOKE TEST

Actions:

```bash
curl -fsS https://osrsservices.com/health
curl -fsS https://osrsservices.com/ready
pnpm production:smoke -- --base-url https://osrsservices.com
```

Pass: launch-critical endpoints pass.

Fail: any critical public endpoint fails.

## FEATURE ACTIVATION

Actions:

- Enable only client-approved feature flags.
- Keep external payments off.
- Keep payment webhooks off.
- Keep payment refunds off unless manual workflow is approved.
- Keep email off until SMTP launch is complete.
- Enable realtime chat only after WebSocket validation.

Pass: each enabled feature has a named approval and validation result.

Fail: feature activation is automatic, undocumented or uses real provider credentials before approval.

## POST-LAUNCH MONITORING

Actions:

- Watch PM2 logs.
- Watch Nginx logs.
- Monitor disk usage.
- Monitor `/health` and `/ready`.
- Confirm order and manual payment review behavior.

Pass: no secret leakage and no critical error trend.

Fail: repeated 5xx responses, failing readiness, disk pressure, payment/email misconfiguration or customer-impacting workflow failure.

## ROLLBACK

Actions:

- Disable affected feature flag first.
- Roll code back only to a schema-compatible commit.
- Roll Nginx or DNS back from saved config/record backups.
- Restore database only as last resort.

Pass: customer-impacting issue is resolved and data is preserved.

Fail: rollback would destroy or hide production order/payment/customer data.
