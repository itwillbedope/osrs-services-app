# Minigames, ordering, discovery and payments — 2026-10-10

## Authorized scope

The customer requests a Minigames service and homepage entry, products/rates from https://bald.gg/services/minigames, original AI artwork, quantity inputs before service selection, removal of Stream for Infernal and Quiver, performance/SEO/AI discovery improvements, Stripe/Payoneer/Bitcoin/OSRS GP payment options and owner dashboard access. Existing live-site GitHub/Hostinger delivery authorization continues.

## Plan

1. Capture the public reference product names, USD rates, units and optional modifiers. Use the existing published catalogue and server-authoritative cart resolver. Record source date; seed once without overwriting staff edits.
2. Build a responsive grouped Minigames catalogue with search, sorting, quantities, requirements and order summary, preserving the site's black/red identity and original copy/artwork.
3. Separate draft quantities from selections. Enforce the Infernal/Quiver stream removal in UI, estimates and cart repricing.
4. Fix indexability, canonical URLs, sitemap/robots, truthful structured data and AI discovery; optimize images and deferred client code. Measure where possible; do not promise rankings or third-party ratings.
5. Extend payment configuration and provider adapters. Never pretend payments are active without merchant configuration; keep confirmed manual payments and server-verified state transitions. Credentials remain outside source control.
6. Verify protected dashboard access and provide self-managed staff creation and role assignment, as requested in the customer's follow-up.

## Risks and migrations

Reference prices are expressly authorized by the customer, overriding the earlier reference-inventory prohibition for this Minigames catalogue only. Competitor artwork, reviews and marketing claims are excluded. Catalogue initialization is additive and preserves customizations. Real payment activation requires actual account details privately configured, not guessed secrets. The customer will connect accounts later and requested user/role controls instead of a new production account provisioned in chat.

## Verification

Lint, typecheck, formatting, unit tests, seed/migration checks, production build, desktop/mobile ordering and metadata checks, webhook/idempotency/amount validation, anonymous admin denial. Document any external configuration still required.

## Security follow-up

PR 26 is deployed and its live ordering/discovery/admin-protection checks pass. Hostinger reported dependency advisories; patch the affected runtime and compatible transitive libraries within the customer's security request. Preserve authentication document redirects, verify npm/pnpm runtime audit parity, generation/migrations/seeds, full tests, build and release CI, then deploy the patch. See docs/MINIGAMES-SECURITY-FOLLOWUP.md.

## Hostinger compatibility follow-up

PR 27's release validation passed, but Hostinger's older GLIBC cannot load the patched native SWC compiler. Preserve the patched versions, use a strictly checked plain MJS Next configuration, package Next's official WASM fallback without a build-time download, and include sharp's official WASM image fallback. Validate compiler and WebP image processing with native bindings unavailable, a full WASM production build, release CI and the live image optimizer. No schema or merchant configuration change is authorized by this compatibility fix.
