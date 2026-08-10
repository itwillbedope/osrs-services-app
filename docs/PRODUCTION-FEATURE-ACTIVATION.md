# Production Feature Activation

Task 016 keeps production-impacting features disabled by default. Enable them only after migrations, seed verification, client review and rollback planning.

## Feature Flags

- `external_payments_enabled`: off until a real provider is approved and configured.
- `payment_webhooks_enabled`: off until provider signatures, event mapping and idempotency are validated.
- `payment_refunds_enabled`: off until refund permissions and provider behavior are approved.
- `email_delivery_enabled` is environment-driven and should stay false until SMTP sender details and templates are reviewed.

## Activation Order

1. Deploy migrations with `pnpm db:migrate`.
2. Run `pnpm db:seed` twice and confirm manual edits are preserved.
3. Run `pnpm production:check` against production-like environment values.
4. Review `/admin/launch-readiness`, `/admin/checkout/payment-eligibility`, `/admin/checkout/email` and `/admin/payments`.
5. Review legal pages at `/terms`, `/privacy` and `/refund-policy`.
6. Enable only the reviewed flag, validate, then proceed to the next flag.

## Rollback

First disable feature flags. Preserve orders, payment transactions, webhook events, email delivery rows, readiness rows and audit rows. Do not run `prisma migrate reset` against shared or production data.
