# Payment Architecture

Prepare checkout interfaces for PayPal, Apple Pay, Google Pay, cards, Payoneer, cryptocurrency, and OSRS GP. All external provider methods are disabled by default until the client completes provider approval and configuration.

Build a provider-adapter contract, admin enable or disable controls, server-side verification, reliable webhook processing, and clear payment-state handling.

Do not store raw card details. Keep environment-specific configuration outside source control.

Apple Pay and Google Pay should be treated as wallet options supplied through the chosen processor when supported.

OSRS GP uses a manual review workflow with an editable exchange rate, trade instructions, confirmation, staff assignment, and audit history.

## Task 016 foundation

Task 016 adds the provider adapter contract, durable `PaymentTransaction`, `PaymentWebhookEvent`, `PaymentRefund`, provider configuration, eligibility rules and admin payment screens.

Manual review remains enabled. `TEST_HOSTED` is a deterministic CI/local fixture and is blocked in production. `EXTERNAL_HOSTED_CHECKOUT` is a placeholder for a later approved provider task and has no live adapter.

External hosted checkout is gated by all of the following:

- database feature flag `external_payments_enabled`
- enabled checkout payment method
- provider configuration
- per-cart-item payment eligibility rules
- server-authoritative order total and currency checks
- webhook signature verification and idempotency

Payment redirects never mark an order paid. Only verified server-side webhook processing can transition the payment transaction and order state.

Refunds require `payment_refunds_enabled` and `payments.refund`. Refund rows and transaction events are recorded, but provider-specific money movement remains disabled until a real provider is approved.

No card fields, CVV/CVC, raw provider credentials, SMTP passwords, raw tokens or raw webhook payloads are stored by Task 016.
