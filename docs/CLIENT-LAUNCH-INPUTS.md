# Client Launch Inputs

## Required Before Launch

- Final service prices for skilling, bossing, premium services and custom account builds.
- Delivery estimates for standard, priority and express options.
- Gold buy rate.
- Gold sell rate.
- Gold stock and buying capacity.
- Actual account listings approved for public display.
- Actual product stock, product pricing and availability.
- Manual payment method.
- Manual payment instructions shown during checkout.
- Business/support email address.
- SMTP account and sender domain.
- Legal Terms of Service.
- Privacy Policy.
- Refund Policy.
- Admin email for the first production Super Admin.
- Chat operating hours and offline message.
- Client-approved feature flags for launch.
- External payment provider selection and approval, if applicable after launch.
- Confirmation that product/account images are licensed and safe for public use.
- Production go-live window and rollback contact.

## Can Be Added After Launch

- Membership.
- Loyalty.
- Reviews.
- Referrals.
- Recurring subscriptions.
- New calculators.
- New marketplaces.
- External payment provider integration.
- Automated refund provider flow.
- Social login, OAuth, passkeys or MFA.
- Multi-node chat scaling.
- WhatsApp, n8n or other third-party automation.

## Initial Recommendation

Launch with manual-review payments, email delivery disabled until SMTP is proven, external payments disabled, payment webhooks disabled, payment refunds disabled and realtime chat enabled only after staging WebSocket validation.
