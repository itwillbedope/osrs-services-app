# Payment Provider Approval

Task 016 creates the provider-neutral payment foundation only. It does not activate Stripe, PayPal, Apple Pay, Google Pay, Payoneer, cryptocurrency, OSRS GP automation, bank transfer, card capture, wallet capture or any real external payment account.

## Required Before Hosted Payments

- Confirm the merchant account is approved for every OSRS Services product and service category.
- Confirm whether skilling, bossing, premium services, gold, items, bonds, outfits, accounts, membership and custom account-build quotes are allowed by the processor.
- Keep `external_payments_enabled=false` until those approvals are documented.
- Keep `payment_webhooks_enabled=false` until signature verification and event mapping are reviewed for the chosen provider.
- Keep `payment_refunds_enabled=false` until refund policy, operator permissions and provider refund behavior are reviewed.
- Keep manual review available as a fallback.

## Prohibited In Source

- Provider secret keys
- Webhook signing secrets
- Card numbers, CVV/CVC, PAN or wallet seeds
- Bank details
- Raw webhook payloads
- OAuth refresh tokens
- Real customer PII

## Current Provider Modes

- `MANUAL_REVIEW`: safe default, enabled in seed, no external calls.
- `TEST_HOSTED`: CI/local deterministic fixture mode, blocked in production.
- `EXTERNAL_HOSTED_CHECKOUT`: placeholder enum and adapter boundary for a later approved provider task.

Provider-specific activation must be a later task with explicit client approval, production credentials supplied outside source control and fresh end-to-end validation artifacts.
