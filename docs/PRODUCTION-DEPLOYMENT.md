# Production Deployment

Task 016 adds a production-readiness endpoint and validation script, but it does not deploy the application.

## Required Checks

- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:seed`
- `pnpm build`
- `pnpm production:check`

## Runtime Checks

- `pnpm runtime:check` verifies SWC helper resolution from the application and
  Next.js and loads the Next.js environment initialization module.

- `GET /health` confirms the app process is alive.
- `GET /ready` checks database reachability, Task 016 migration presence, storage writability and safe configuration booleans.

`/ready` intentionally does not expose secrets, provider credentials, SMTP passwords, raw tokens or raw webhook payloads.

## Hostinger missing SWC helper recovery

If logs show `Cannot find module '@swc/helpers/_/_interop_require_default'`, deploy
the committed `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` together.
The workspace selects a hoisted dependency tree to avoid reliance on pnpm
virtual-store symlinks during Hostinger packaging. The helper is also an explicit
production dependency pinned to Next.js's existing version.

Use a fresh Hostinger dependency installation (`pnpm install --frozen-lockfile`)
and rebuild the app rather than restarting the existing broken artifact. Retain
the current production environment variables and database. The existing build
prestep still applies pending forward migrations and seeds, so retain the normal
backup procedure; do not reset or replace the database.

Run `node scripts/check-runtime-dependencies.mjs` in the deployed app directory
when a shell is available. Hostinger's generated `server.js` may bypass the npm
`prestart` hook. Verify `/health` returns 200 JSON, then verify `/ready` and the
homepage before declaring the outage resolved.

## Launch Notes

- Production must use persistent MySQL, not CI MySQL.
- Set `NEXT_PUBLIC_APP_URL` to HTTPS.
- Keep `PAYMENT_PROVIDER=MANUAL_REVIEW` until a real provider task is approved.
- Never use `TEST_HOSTED` or `TEST_EMAIL` in production.
- Keep private attachment storage outside `public/`.
- Confirm backups, restore, SSL, domain routing, admin access and rollback before traffic cutover.
