# Staging Launch Plan

Target staging domain placeholder: `staging.osrsservices.com`.

No production DNS cutover happens during staging.

## 1. Server Setup

- Provision Ubuntu LTS VPS.
- Install Node 24, pnpm 11.7.0, MySQL 8, Nginx and PM2.
- Create `osrsapp` user, app directory, private attachment directory, log directory and backup directory.
- Clone the approved launch commit.

Pass: system services are installed and directories have restricted permissions.

## 2. Database Setup

- Create `osrs_services` database with `utf8mb4`.
- Create restricted `osrs_app` database user.
- Configure `.env.production` privately for staging values.

Pass: app user can connect; root credentials are not stored in project files.

## 3. Environment

- Use `NEXT_PUBLIC_APP_URL=https://staging.osrsservices.com`.
- Keep `PAYMENT_PROVIDER=MANUAL_REVIEW`.
- Keep external payments, webhooks, refunds and email disabled.
- Set `CHAT_ALLOWED_ORIGINS=https://staging.osrsservices.com`.
- Set private attachment root outside `public/`.

Pass: `pnpm production:check -- --allow-missing-production-config` is clean during setup; full `pnpm production:check` passes after real staging config is present.

## 4. Migrations and Seed

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:seed
```

Pass: migrations deploy; seed rerun preserves feature flags and edited review rows.

## 5. Build and PM2

```bash
pnpm build
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 status
```

Pass: `osrs-web` and `osrs-chat` are online. Realtime chat can still remain feature-flag disabled.

## 6. Nginx and SSL

- Configure `deploy/nginx/osrs-services.conf.example` for `staging.osrsservices.com`.
- Obtain SSL certificate for the staging hostname.
- Run `sudo nginx -t`.
- Reload Nginx.

Pass: HTTPS terminates successfully and HTTP redirects to HTTPS.

## 7. Health, Ready and Smoke Tests

```bash
curl -fsS https://staging.osrsservices.com/health
curl -fsS https://staging.osrsservices.com/ready
pnpm production:smoke -- --base-url https://staging.osrsservices.com
```

Pass: launch-critical endpoints return acceptable statuses.

## 8. Manual Smoke QA

Validate:

- Admin login at `/login`.
- Customer registration at `/account/register`.
- Customer login at `/account/login`.
- Product browsing at `/products`.
- Account browsing at `/accounts`.
- Custom account build intake at `/custom-account-build`.
- Cart at `/cart`.
- Checkout at `/checkout`.
- Manual payment review copy.
- Order confirmation/tracking with non-production test data only.
- Inventory/admin workflows using staging data.
- Customer dashboard after intentional feature-flag approval.
- Chat HTTP fallback and Socket.IO after staging WebSocket approval.
- Mobile QA on narrow and tablet viewports.

Pass: no order, customer, email or payment action uses production secrets or real provider credentials.

## 9. Client Approval

Client must approve prices, legal pages, manual payment instructions, support email, feature-flag launch state and go-live window before production DNS cutover.
