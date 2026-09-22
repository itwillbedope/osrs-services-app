# Codex Completion Report

## Task

- Task ID: HOMEPAGE-ARTWORK-FIXES
- Task title: Hero framing, mobile contrast, original service illustrations and header logo
- Branch: fix/homepage-artwork
- Date: 2026-09-22

## Summary

The homepage hero keeps the monster's head visible on desktop and separates artwork from headline/buttons on mobile and tablet. The official logo is fully visible and centered in a padded header; the boosting-partner tagline is removed.

Twelve new 1536×1024 illustrations replace all screenshot-derived artwork in Main Services, What Can We Do For You, Featured Services and More Services. The approved Misc Gathering illustration remains. Image selection follows service identity, with Admin-uploaded/custom imagery preserved. Same-resolution WebP delivery and responsive lazy loading keep downloads small; the existing hero is encoded to WebP and prioritized.

## Files changed

- `src/app/(public)/page.tsx`
- `src/app/globals.css`
- `src/app/reference-storefront.css`
- `src/components/public-header.tsx`
- `src/lib/homepage/artwork.ts`
- `public/artwork/inferno-hero.webp`
- `public/artwork/services/accounts.webp`
- `public/artwork/services/bossing.webp`
- `public/artwork/services/diaries.webp`
- `public/artwork/services/gauntlet.webp`
- `public/artwork/services/gathering.webp`
- `public/artwork/services/gold.webp`
- `public/artwork/services/infernal.webp`
- `public/artwork/services/items.webp`
- `public/artwork/services/quests.webp`
- `public/artwork/services/quiver.webp`
- `public/artwork/services/raids.webp`
- `public/artwork/services/skills.webp`
- `public/artwork/services/zulrah.webp`
- `tasks/HOMEPAGE-ARTWORK-FIXES.md`
- `docs/DECISIONS.md`
- `docs/HOMEPAGE-ARTWORK-PROMPTS.md`
- `docs/HOMEPAGE-ARTWORK-COMPLETION.md`

## Database

- Migration names: none; presentation/assets only.
- Seed changes: none.
- Rollback considerations: revert this source/assets change. Existing merchandising and order records are untouched.

## Commands run

- Built-in `image_gen` calls for all twelve illustrations, using the approved gathering art as a style reference.
- Local Sharp WebP encoding, preserving source dimensions/composition.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `git diff --check`.
- `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS="--max-old-space-size=3072 --max-semi-space-size=8" pnpm exec next build --webpack`.
- In-app Browser: desktop/tablet/phone visual checks, image loading, hero bounds, logo bounds, links and horizontal overflow.

## Test results

- Lint: passed.
- Typecheck: passed.
- Unit: all 276 tests in 47 files passed.
- Integration: existing calculators/routes remain unchanged; homepage custom image overrides remain supported.
- Browser: verified at 1440×1000, 1280×900, 768×1024, 390×844 and 320×740. No missing loaded images or horizontal overflow. All homepage screenshot-slice elements are gone. The 320px logo measures 150×50 with approximately 10px top/bottom clearance. Phone copy ends exactly where the separate artwork block begins.
- Build: passed, including TypeScript, static page generation and build tracing.

## Screenshots

`F:/Codex/2026-09-20/oka/outputs/homepage-artwork/`: desktop-hero.png, desktop-services.png, desktop-all-services-final.png, mobile-hero.png, mobile-services-final.png, tablet-hero.png and small-phone-hero-final.png. Full-resolution original artwork is in the `originals/` subdirectory.

## Assumptions

- Generated art is illustrative fantasy service artwork, not an inventory photograph.
- Reuse each service's new art consistently across homepage sections, preserving approved Misc Gathering art and custom Admin images.

## Known issues

- No pending illustrations remain; the initial generation limit was resolved after its reset.
- Historical task-specific CI jobs may retain earlier baseline failures; application validation status is recorded with the final release.

## Documentation updates

Task scope, decisions, prompt provenance and this report.

## Stop condition

Scope is limited to the requested homepage/header fixes, validation and live delivery.
