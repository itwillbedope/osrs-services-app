# Staff roles and owner login — 2026-10-10

## Task

- Task ID: STAFF-ROLE-WORKSPACES
- Branch: feat/staff-role-workspaces
- Date: 2026-10-10

## Summary

The owner requested Head, Chat Support and Products & Data Editor. Head is the existing SUPER_ADMIN role with all capabilities, including the new dashboard.view permission. It can manage users, operations, orders, customers, payments and all content. The protected landing dashboard replaces the obsolete foundation placeholder with actual order counts, current UTC-month orders, open orders, active customers, confirmed sales per currency, successful recorded refunds, net sales, status counts and recent orders. Pending payments never count as paid sales. Revenue is not presented as profit or settlement balances.

CHAT_SUPPORT is a new role limited to chat viewing, replies, assignments, status changes and internal notes. It has no order/payment/customer/listing/user administration or dashboard statistics. Chat configuration controls are hidden and remain protected on the server. PRODUCT_DATA_EDITOR can manage service/product/account listings, content, media, prices, publishing and stock, without sales, payments, customer records, support chat or user access. Navigation is capability-filtered; /admin directs restricted staff to chat or catalogue. Direct URL requests still require server authorization. Sidebar navigation scrolls on desktop and mobile staff can sign out.

Legacy Editor/Support Agent roles and customized grants are preserved to avoid silently changing existing staff assignments. The three requested roles are shown first and described on Users & roles. Existing passwords and assignments survive reseeding. Owner initialization now refuses to promote an existing CUSTOMER account into staff.

## Files changed

- prisma/seed-core.ts
- src/lib/auth/permissions.ts and admin-workspace.ts
- src/lib/admin/dashboard.ts and sales-summary.ts
- src/components/admin-nav.tsx and admin-shell.tsx
- src/app/(admin)/admin/layout.tsx and page.tsx
- src/app/(admin)/admin/users/page.tsx and chat/page.tsx
- src/tests/seed-idempotence.test.ts and staff-workspaces.test.ts
- tests/e2e/staff-workspaces.spec.ts
- tasks/STAFF-ROLE-WORKSPACES.md, docs/DECISIONS.md and this report

## Database

No schema migration. Additive permission and role seeding uses existing normalized tables. No existing accounts are reassigned to the new roles. Rollback retains the additional role records; disable assigned users before removing capability definitions. No orders, stock, prices or payment configuration are modified by this task.

## Commands and test results

Lint, strict typecheck, formatting and the source privacy scan passed. The full unit suite passed 293 tests across 52 files. The production build, migration check (25 existing migrations, none pending), generation and repeated seeding passed. All six desktop/mobile staff browser tests passed. Screenshots were visually reviewed after waiting for loaded workspace content. Browser tests verify role landing, filtered navigation, role explanations, forbidden direct routes and no page overflow. Next can stream an HTTP 200 before rendering a forbidden child route, so tests require the actual denial boundary and no dashboard data; the unauthorized chat API must return 401 or 403. Unit tests cover role boundaries, separate currencies/refunds and preventing customer promotion. Final release CI and production deployment are recorded in workspace outputs/staff-access after verification.

## Owner credential handoff

A random 32-character owner password and unique head login identifier were generated into the private local outputs/staff-access/OWNER-LOGIN.txt file outside Git. It does not create an email mailbox. No password is committed, logged or embedded in public code. The login is not active until the owner privately enters ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD, ADMIN_SEED_NAME=Head and ADMIN_SEED_RESET_PASSWORD=false in Hostinger and saves them, then a deployment runs the existing protected initialization. Browser credential entry/submission requires a user handoff. After login at /login?next=/admin, Head can create staff users with Chat Support or Products & Data Editor at /admin/users. Passwords entered in staff creation are hashed and excluded from audit payloads.

## Assumptions and known issues

The owner requested role templates and will create their own team users; no real team identities were invented. Only the first Head credential handoff is prepared. No public account creation grants staff rights. A role only limits permissions when its user is not also assigned broader roles; access edits revoke staff sessions. Chat remains subject to the existing owner-controlled availability flags. Sales aggregates reflect recorded receipts/refunds, not external bank reconciliation.

## Screenshots and documentation

Desktop/mobile role screenshots are captured in artifacts/staff-workspaces and copied to workspace outputs/staff-access. The active task and decision log describe capability boundaries and the private credential handoff.

## Stop condition

Only the requested staff roles, owner dashboard/access preparation and their verification are in scope. Payment accounts remain unconnected.
