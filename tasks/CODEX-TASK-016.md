# CODEX TASK 016 - Payments, Email and Production Launch Readiness

## Starting State

- Repository: `Faizan279/osrs-services-app`
- Worktree: `E:\Codex\osrs-services-task-016`
- Branch: `codex/task-016-payments-launch-readiness`
- Starting main SHA: `8433e1ec30ad06cdd5f28e14203a653b26051a8a`
- Task 015 merge commit: `8433e1ec30ad06cdd5f28e14203a653b26051a8a`
- PR #16 state at start: Task 015 was merged before Task 016 work began

Task 016 starts from latest `origin/main` containing the Task 015 merge commit. It does not continue from a prior task branch and does not modify prior task worktrees.

## Delivered Scope

- Additive Prisma migration `20260810150000_task016_payments_launch_readiness`.
- Provider-neutral payment configuration, eligibility, transaction, event, webhook and refund schema.
- Manual-review payment preservation with TEST_HOSTED CI/local fixture mode and production blocking.
- Hosted checkout redirect support and verified webhook order-paid transitions.
- Admin payment overview/detail, payment eligibility, email delivery status and launch-readiness pages.
- Transactional email templates, delivery rows, SMTP/TEST_EMAIL transport boundary and safe recipient hashing.
- `/ready` production-readiness endpoint and `pnpm production:check` script.
- Terms, privacy and refund-policy placeholder pages marked for client review.
- Security headers in Next.js config.
- Task 016 validation scripts, E2E tests, screenshots and review-pack workflow.

## Boundaries

Task 016 does not activate Stripe, PayPal, Apple Pay, Google Pay, Payoneer, cryptocurrency, OSRS GP automation, bank transfer, live card capture, live wallet capture, live SMTP delivery, SMS, OAuth, Membership, Loyalty, Reviews, deployment, PR creation or Task 017.

No production credentials, provider secrets, SMTP passwords, raw webhook payloads, raw email tokens, card data or real customer PII are committed.

## Feature Flags

Seed adds these disabled by default and preserves live edits:

- `external_payments_enabled`
- `payment_webhooks_enabled`
- `payment_refunds_enabled`

Email delivery is environment-driven and remains disabled by default through `.env.example`.

## Validation

Local non-database validation covers Prisma format/generate, lint, typecheck, unit tests, seed tests, format check, production readiness dry-run, build and whitespace checks.

Database-backed migration, seed, payment transaction, upgrade, E2E, screenshot and review-pack validation is configured in `.github/workflows/task016-validation.yml` with temporary MySQL 8.4 service containers and CI-only credentials.
