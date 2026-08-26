# Codex Completion Report

## Task

- Task ID: OSRS-REDESIGN-CMS
- Task title: Full OSRS Services red/black storefront redesign and database-backed homepage manager
- Branch: `main`
- Date: 2026-08-26

## Summary

Rebuilt the public storefront around the supplied black, red, and inferno reference while preserving the existing catalogue, account, checkout, cart, order, chat, pricing, and administration architecture. The new homepage includes the hero, trust strip, four main categories, seven-service rail, featured services, reasons-to-buy, illustrative metrics disclaimer, and expanded footer. The supplied logo is used throughout, and an original inferno hero was generated for the redesign.

Added a database-backed homepage content manager at `/admin/homepage`. Authorized staff can enable, title, order, and limit homepage sections; link cards to services, products, accounts, gold markets, or custom builds; create manual promotions; upload raster artwork; edit copy, badges, bullets, CTAs, and price presentation; feature, schedule, reorder, deactivate, and archive items; and use optimistic concurrency and audit logging. Public card data resolves from linked live records when possible and has safe seeded fallbacks before the migration is deployed.

Added category aliases for `/services/pvm`, `/services/bossing`, `/services/raids`, `/services/skills`, and `/services/diaries`, plus `featured=1` filtering for the featured-services view. Changed production `prebuild` from migration-and-seed mutation to Prisma client generation only.

## Files changed

Created:

- `prisma/migrations/20260826130000_homepage_content_management/migration.sql`
- `public/artwork/osrs-reference-board.jpeg`
- `public/artwork/zuk-inferno-hero.png`
- `public/branding/osrs-services-logo-red.png`
- `src/app/(admin)/admin/homepage/actions.ts`
- `src/app/(admin)/admin/homepage/page.tsx`
- `src/lib/homepage/core.ts`
- `src/lib/homepage/server.ts`
- `src/lib/homepage/upload.ts`
- `reports/CODEX-OSRS-REDESIGN-COMPLETION.md`

Changed:

- `docs/DECISIONS.md`
- `next.config.ts`
- `package.json`
- `prisma/schema.prisma`
- `prisma/seed-core.ts`
- `src/app/(public)/layout.tsx`
- `src/app/(public)/page.tsx`
- `src/app/(public)/services/[categorySlug]/page.tsx`
- `src/app/(public)/services/page.tsx`
- `src/app/globals.css`
- `src/components/admin-nav.tsx`
- `src/components/brand-logo.tsx`
- `src/components/public-footer.tsx`
- `src/components/public-header.tsx`
- `src/components/ui/button.tsx`
- `src/config/public-navigation.ts`
- `src/lib/auth/permissions.ts`
- `src/tests/homepage-content.test.ts`

Deleted: none.

## Database

- Migration names: `20260826130000_homepage_content_management`
- Seed changes: added `homepage.manage` to the Editor permission set; the additive SQL migration creates the three homepage sections and conservative manual fallback cards. Unverified prices are hidden.
- Rollback considerations: no database reset or destructive operation was run. The migration is additive. A rollback would require explicitly removing the new foreign keys, indexes, `HomepageItem` and `HomepageSection` tables, and the two homepage enums after verifying no client-authored content must be retained.

## Commands run

- `pnpm install`
- `prisma generate`
- `prisma validate`
- `eslint . --max-warnings=0`
- `tsc --noEmit`
- `vitest run`
- `vitest run src/tests/seed-idempotence.test.ts`
- `pnpm build`
- `pnpm start`
- Playwright CLI screenshots at 1440 x 900 and 390 x 844
- HTTP production smoke requests for `/`, `/login`, `/terms`, `/privacy`, `/support`, and `/health`
- `git diff --check`

The first local build attempt exhausted the workstation's remaining space while writing Webpack's disposable persistent cache. Production Webpack caching was disabled for fresh-checkout Hostinger builds. A second configuration-only attempt identified the intentionally missing local `AUTH_SECRET`; the final build with validation-only environment values passed.

## Test results

- Lint: passed, zero warnings
- Typecheck: passed
- Unit: passed, 42 files and 229 tests
- Integration: homepage resolver, ordering, scheduling, permission, routing, and seed-idempotence coverage passed
- Browser: responsive homepage inspected at 1440 x 900 and 390 x 844; production smoke routes all returned HTTP 200
- Build: passed with Next.js 16.2.9 and Node.js 24 runtime

## Screenshots

- `outputs/osrs-home-desktop.png` — 1440 x 900 viewport
- `outputs/osrs-home-mobile.png` — 390 x 844 viewport, full page
- `outputs/osrs-home-full.png` — 1440 x 900 viewport, full page

The screenshots live in the Codex task output directory, outside the repository.

## Assumptions

- The supplied screenshot is visual direction, not a source of verified product prices, sales counts, customer-satisfaction percentages, or other business claims.
- Existing catalogue and transactional tables remain the source of truth; homepage records provide merchandising and presentation overrides only.
- Hostinger receives the required Node 24, pnpm 11.22, MySQL, URL, authentication, and other existing production environment values.
- Deployment runs `prisma migrate deploy` as an explicit release step before staff use `/admin/homepage`.
- Uploaded homepage images are written to `public/uploads/homepage`; production must preserve or externalize this directory according to the hosting release strategy.
- Existing users retain their current permissions until the normal core seed or equivalent role-permission update is applied.

## Known issues

- The migration was validated and included but not applied to production because production deployment and direct production database changes are outside repository authorization.
- No local MySQL credentials were supplied, so database-backed routes were validated through the production build and automated resolver tests rather than destructive local migration or live-data browser testing.
- Business owners still need to replace the clearly marked illustrative metrics with verified values and may replace reference-derived card crops through the homepage manager.

## Documentation updates

- Updated `docs/DECISIONS.md` with the new red design direction, homepage merchandising architecture, claim-safety policy, upload handling, migration procedure, and safe prebuild behavior.
- Added this completion report.

## Stop condition

No work beyond the active redesign, homepage management, validation, documentation, and requested source-control handoff was started. No production deployment or database reset was performed.
