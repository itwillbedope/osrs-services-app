# Payment Launch Boundary

This launch task does not integrate Stripe, PayPal, Apple Pay, Google Pay, cryptocurrency or any other live payment provider.

Manual payment review remains the launch-safe payment mode.

External payments can only be enabled after all of the following are complete:

- Provider is selected.
- Merchant account is approved.
- Exact OSRS service categories are accepted by the provider.
- Production API credentials are supplied privately outside GitHub.
- Webhook endpoint is configured.
- Webhook signature verification test passes.
- Idempotent webhook replay test passes.
- Test transaction is completed in the provider's approved test mode.
- Refund behavior and operator permissions are approved.
- Client approves checkout copy and customer-facing payment instructions.

No real payment secrets belong in GitHub, `.env.example`, `deploy/.env.production.example`, docs, scripts, screenshots or logs.

Keep these production defaults until the approved provider task changes them:

```env
PAYMENT_PROVIDER=MANUAL_REVIEW
EXTERNAL_PAYMENTS_ENABLED=false
PAYMENT_WEBHOOKS_ENABLED=false
PAYMENT_REFUNDS_ENABLED=false
```
