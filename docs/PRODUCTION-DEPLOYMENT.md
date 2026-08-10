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

- `GET /health` confirms the app process is alive.
- `GET /ready` checks database reachability, Task 016 migration presence, storage writability and safe configuration booleans.

`/ready` intentionally does not expose secrets, provider credentials, SMTP passwords, raw tokens or raw webhook payloads.

## Launch Notes

- Production must use persistent MySQL, not CI MySQL.
- Set `NEXT_PUBLIC_APP_URL` to HTTPS.
- Keep `PAYMENT_PROVIDER=MANUAL_REVIEW` until a real provider task is approved.
- Never use `TEST_HOSTED` or `TEST_EMAIL` in production.
- Keep private attachment storage outside `public/`.
- Confirm backups, restore, SSL, domain routing, admin access and rollback before traffic cutover.
