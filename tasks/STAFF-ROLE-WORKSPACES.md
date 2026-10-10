# Staff roles and owner access — 2026-10-10

## Authorized scope and plan

The owner has no staff credentials and requested three roles: Head with all access, sales and stats; Chat Support with chat only; Products & Data Editor with listings and content editing. Add the two restricted roles without changing existing legacy staff assignments. Rename the existing full-access Super Admin display name to Head. Add a capability-protected operational dashboard and navigation appropriate to each user's permissions. Verify server denial, role landing pages, actual order/payment aggregates and responsive layout.

Prepare a random owner password and login identifier in a private local handoff file outside Git. The browser credential-entry policy requires the user to enter and submit new credentials in Hostinger; do not log, commit or type them through browser automation. Existing ADMIN_SEED_EMAIL/PASSWORD initialization can create the first Head after the user's private configuration and redeploy. No public staff registration or default password is added.

## Verification and risks

Use unit tests for permission boundaries and currency/refund aggregation, full lint/type/format/tests and production build, seed twice, local desktop/mobile staff browser tests and release CI. No schema migration or payment activation. Preserve legacy roles/custom permissions and existing passwords. Head sees confirmed sales per currency, not pending quotes or fabricated revenue. The editor receives catalogue, listing, media, stock and pricing permissions without customer/order/payment/user management. Chat Support cannot access these or sales aggregates.
