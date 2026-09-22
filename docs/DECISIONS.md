# Decision Log

## Hostinger runtime dependency repair — 2026-09-21

- Production logs show Next.js cannot resolve `@swc/helpers/_/_interop_require_default`.
  The existing lockfile already contains the correct helper version (0.5.15).
  Mixed flat and virtual-store Next.js paths suggest deployment layout problems;
  the exact Hostinger packaging step has not been independently inspected.
- Use `nodeLinker: hoisted` and explicitly declare `@swc/helpers@0.5.15` as a
  production dependency. Preserve the other locked package versions.
- Check dependency resolution from both the application and Next.js before build
  and normal start. Hostinger-generated entrypoints may bypass `prestart`, so run
  `node scripts/check-runtime-dependencies.mjs` against the deployed artifact too.
- No migrations, seed changes, commercial settings, or authentication changes
  are part of this repair. A clean installation/build is necessary to replace the
  previously packaged dependency tree.

## Confirmed

- Product name: OSRS Services
- Domain: osrsservices.com
- Region: United States
- Currency: USD
- Delivery target: seven weeks
- Codex is the primary implementation agent
- No required Figma workflow
- Original UI using black, white, and green branding
- Guest checkout supported
- RSN/game ID collected
- Custom live chat
- Three staff roles at launch
- MySQL selected for initial Hostinger compatibility
- Payment interfaces and adapters now; live activation later
- Discord Stream default: +2%
- Secure 100+ Combat option default: +10%
- Standard, Priority, and Express delivery options
- Membership automatic renewal and cancellation deferred
- Client supplies final prices and real account inventory
- Competitor active account inventory will not be copied

## Task 001 package and implementation decisions — 2026-06-30

- Node.js 24 LTS is pinned in `package.json`; it is both an active LTS release and a Hostinger-supported managed runtime.
- pnpm 11.7.0 is pinned through the `packageManager` field.
- Next.js 16.2.9, React 19.2.7, Tailwind CSS 4.3.2, Prisma 7.8.0, TypeScript 6.0.3, Vitest 4.1.9, and Playwright 1.61.1 are pinned for reproducible installs.
- MySQL 8.4 is used in Docker Compose because it is the MySQL 8 LTS line.
- RSA public-key retrieval is an explicit environment opt-in for the local non-TLS MySQL account and remains disabled by default outside local configuration.
- Credentials authentication uses Auth.js-compatible `User` and `Session` fields with a custom credentials handler. Auth.js credentials providers require JWT session strategy, which conflicts with this task's database-session requirement.
- Raw session secrets are never stored in MySQL. The browser receives the opaque token in an HTTP-only cookie, while MySQL stores an HMAC-SHA256 digest.
- Route protection is layered: the Next.js proxy rejects missing cookies, while server layouts validate the live database session and capability.
- The in-memory login limiter is an initial single-instance defense. A shared limiter is required before multi-instance deployment.
- `assets/branding/osrs-services-logo.svg` is the repository-approved Task 001 development wordmark. It must be replaced with the final approved transparent asset before homepage approval.

## Pending client configuration

- Priority delivery fee and time
- Express delivery fee and time
- Final membership tiers and prices
- Final gold rates before launch
- Real prebuilt account listings
- Approved payment providers
- Final US business address

## Homepage redesign and content management decisions — 2026-08-26

- The client-supplied black, red and white storefront direction supersedes the earlier green development theme for public-facing routes; the protected admin workspace remains utility-led.
- Homepage curation is additive: `HomepageSection` controls section state and limits, while `HomepageItem` points to existing services, products, accounts, gold or custom-build records and also supports manual promotions.
- Promotional prices are hidden by default unless the client supplies a verified linked price or an explicit override. Unverified reference-screenshot prices and performance metrics are not presented as business facts.
- Homepage image uploads accept only safe raster formats and remain replaceable from the admin manager. The initial artwork uses the approved supplied reference and original derived hero artwork.
- The normal steady-state deployment prebuild should generate the Prisma client and apply pending migrations without repeatedly seeding. For the one-time Hostinger homepage initialization, `prebuild` temporarily generates the client, runs the pure Node/MariaDB `scripts/hostinger-sql-migrate.mjs`, and executes the seed directly through Node + `tsx`. Hostinger cannot execute Prisma's native schema engine, so production migrations must not call `prisma migrate deploy` or `PRISMA_SCHEMA_ENGINE_BINARY`. The custom runner preserves Prisma-compatible history, exact-file checksums, an advisory lock, and fail-closed incomplete-migration handling. Keep the temporary seed until the client confirms deployment succeeded; never use reset or other destructive database commands.

## Task 003 catalogue decisions — 2026-07-01

- Categories and services use stable IDs plus unique URL slugs; services also retain a unique canonical-ready slug for later migration and SEO work.
- Game modes, requirements, media references and publication revisions are normalized rather than stored as editable JSON blobs.
- Engine type is stored as a typed selection only. Task 003 does not execute calculators, pricing, inventory, checkout or marketplace engines.
- Scheduled visibility is evaluated at request time. No worker or scheduler is introduced.
- Previously published services are archived rather than permanently deleted. Publication, republication and archive events create immutable content snapshots.
- Public queries use an allow-listed scalar projection that excludes internal notes, legacy metadata and actor relations.
- Media management accepts only internal paths and HTTP(S) references with alt text. Production upload/storage remains deferred.
- Seeded catalogue records use stable seed keys and empty update clauses so reruns add missing defaults without overwriting edited content or operational state.
- Category/service mutation inputs are explicitly allow-listed and Zod-validated. Optimistic service versions reject stale editor submissions.

## Task 004 catalogue-card and eligibility decisions — 2026-07-06

- Offerings are normalized children of `CatalogueService`; publication remains inherited from the parent.
- Task 003 stage snapshots upgrade from schema version 1 to version 2 on read. Existing stages/revisions remain readable; new revisions include offerings and eligibility rules.
- Published offering edits remain in the versioned service stage. Republish replaces the aggregate transactionally while retaining staged stable IDs.
- Empty offering game-mode rows mean inheritance; explicit rows may only narrow parent modes.
- Automatic eligibility accepts only allow-listed metrics and typed comparisons. Unknown or missing metrics require support review.
- Official OSRS Hiscores is the deployed provider. Deterministic fixture mode is an explicit local/test switch that also supports local production-build E2E; it must remain disabled in deployments.
- Cache and limiter keys are HMAC-derived. No RuneScape password, raw IP, provider URL, raw response, or lookup history is stored.
- Catalogue cards remain quote/review only. Pricing, cart, checkout and Task 005 remain outside scope.

## Final structural redesign and direct ordering decisions - 2026-09-07

- Primary service navigation now targets `/skills`, `/bossing`, `/infernal`, `/quests`, `/diaries`, `/gold`, `/products`, and `/misc-gathering`. Known legacy category and detail URLs issue server redirects to those useful destinations; catalogue records remain intact for Admin, foreign keys, and SEO continuity.
- Skills, bossing, premium, and gold continue to use their specialized server pricing engines. Quest, diary, and gathering selections use one small direct-order client with a deterministic shared calculation module and a server cart repricing adapter.
- `CATALOGUE_OFFERING_ESTIMATE` is a first-class immutable cart/order item kind. The browser sends stable service/offering selections only; the server reloads published data, validates account mode and quantity, calculates integer-cent totals, applies global pricing, and stores readable source and price snapshots.
- Existing catalogue offerings are the commercial source of truth. No new live quest, diary, gathering, boss, skill, item, ETA, or requirement values were invented. Missing ETAs render as `Confirmed after review` and are editable through the existing staged offering editor.
- Diary dependency policy is explicit offering metadata. `dependency-behavior=auto-include` adds earlier regional tiers; otherwise the public UI states that earlier tiers must already be complete. The seeded reference diary catalogue uses the conservative `require-complete` policy.
- Infernal is a dedicated premium configuration using the existing staged premium package/option architecture. Zero-value option modifiers preserve approved reference pricing while clearly remaining client-reviewable; disabled delivery methods are not displayed.
- Gold volume discounts are optional JSON-backed rate data, expressed as threshold GP plus integer basis points. The highest eligible published customer-buy tier applies. No discount percentages are seeded.
- Product estimates now refresh automatically after variant or quantity changes. Seeded product inventory remains in manual-review state, so cart submission stays disabled until staff approve availability, stock, and commercial data in the existing product Admin.
- The additive migration is compatible with the pure Node/MariaDB Hostinger runner. It extends cart/order enums, adds nullable offering ETA and gold discount columns, and updates/adds homepage merchandising rows without removing or resetting data. Hostinger scripts and `prebuild` remain unchanged.
- Skill and boss portraits reuse the client-supplied reference images as CSS sprites; an Admin-uploaded image overrides the fallback. Unknown bosses keep semantic icons until approved artwork is available. Misc Gathering uses a newly generated resource illustration; its provenance and prompt are recorded in the completion report.
- Published premium stat-price bands are optional, non-overlapping 1–99 level ranges for Ranged, Magic, Defence, and Prayer. The server applies the same bands to displayed quotes and cart repricing. No surcharge is seeded; normal pricing updates use staged, authorized Admin publishing.
- Direct catalogue quotes call the same cart resolver used for insertion, including published global adjustments. All automatic calculators invalidate stale cart sources immediately and preserve edited values during quote requests.
- Three additive migrations cover direct ordering, the allocation enum, and premium stat pricing. Local-only E2E fixtures opt in to a guarded loopback database, restore Gold/Product inventory, and remove only the newly inserted test product revision.

## Screenshot-led storefront refinement — 2026-09-10

- This pass replaces the previous oversized catalogue/form presentation with the client's compact header, illustrated service navigation, left-hand selectors, right-hand summaries, quest/item tables, and regional diary cards. Public styling is scoped in `reference-storefront.css`; staff screens and deployment scripts are unchanged.
- The existing official wordmark is preserved and displayed in red in the public header/footer, regardless of an older green-logo environment override. Its original raster is cropped through CSS rather than edited. Client reference boards supply artwork-only CSS crops; missing boss portraits retain a clearly generic fallback rather than another boss's image.
- Commercial content still comes from existing published records, not prices, ETAs, difficulty labels, or stock shown in design mockups. Gold cards label their calculated pre-adjustment amounts as base prices; the order summary uses the server-confirmed quote including discounts/global adjustments.
- Items now reuse the existing product quote/cart component inside a real marketplace table, including variant selection, quantities, validation and manual-review/stock states. Product-detail ordering remains available.
- Homepage service shortcuts are navigation, not invented products. Existing Admin-managed categories, featured cards and service promotions still render with their schedules, item limits, overrides and section switches. The homepage is dynamic so published merchandising updates do not require rebuilding.
- No new schema, seed, rate, payment, authorization, or inventory rules are introduced. This delivery is a GitHub source update; no production deployment or production database mutation is performed.

## Customer storefront fixes — 2026-09-21

- `/quiver` is the dedicated Dizana's Quiver / Fortis Colosseum premium service. Homepage, footer, primary navigation and legacy detail redirects point to it. Its package covers one full Colosseum completion through Sol Heredit. Charging/blessing with sunfire splinters is explicitly outside this package. Game facts were checked against the [OSRS Wiki Colosseum overview](https://oldschool.runescape.wiki/w/Fortis_Colosseum).
- No new commercial rate is invented: one-time Quiver initialization copies the site's enabled, published Colosseum one-kill rate, minimum, setup/gear adjustments, account modes and delivery/stream rules. The current public rate was verified as $25 per completion. It then becomes independent Admin-managed premium configuration. Initialization runs atomically and never changes an existing Quiver service, including edited prices, disabled options or game modes. If no eligible source exists, the page provides a support quote destination rather than a zero-price checkout.
- The only SQL migration repairs the original `hp-svc-quiver` homepage destination when it is still `/services`. Customized links and other merchandising records are preserved. Existing Hostinger prebuild performs additive seed initialization; deployment mechanics are unchanged.
- Skilling minimum/maximum method levels are recommendations. The shared estimator used by the quote endpoint and cart prices all requested XP at the selected method's published rate. The customer and immutable cart summary receive a requirements/preparatory-training review note. Invalid level/XP progression, disabled methods, unsupported modes and unavailable paid options remain validation errors.
- Quest membership labels retain text and use green F2P and gold Members badges; difficulty colors remain unchanged. Infernal artwork is capped at 205px wide and 480px/65vh tall, with a specific mobile/tablet hiding rule that cannot be overridden by the shared artwork display rule. Quiver reuses only the Quiver illustration from the supplied reference board.
- The user requested these changes on the existing live website and authorized continuing the repair. Delivery includes the GitHub change and the existing Hostinger deployment, without altering payments or authentication.

## Homepage artwork and hero refinement — 2026-09-22

- The homepage uses twelve original, individually generated service illustrations matching the approved Misc Gathering visual style. All four merchandising sections use responsive image assets rather than enlarged screenshot slices. The existing gathering artwork remains. Prompt provenance is recorded in `HOMEPAGE-ARTWORK-PROMPTS.md`; full-resolution originals are saved in workspace outputs and same-resolution WebP assets are in `public/artwork/services/`.
- Artwork defaults resolve by destination and named service, not display position. Admin-provided image overrides remain authoritative. No merchandising data, routes, prices or order logic changes.
- The existing hero composition is retained. Desktop displays the image at its natural ratio with the complete monster's head visible. Phone/tablet copy and artwork occupy separate blocks; the red headline cannot overlap the fire. The image is prioritized and service cards use responsive lazy-loaded images.
- The official red wordmark remains unchanged. A corrected CSS region/aspect ratio displays its complete lettering, header padding centers it vertically, and the customer-requested tagline is removed. The document's old 320px minimum width was removed because a vertical scrollbar caused horizontal overflow on a 320px viewport.
- No database migration or seed changes are needed. Existing live-site repair authorization applies to the GitHub/Hostinger delivery.

## Footer credit and color refinement — 2026-09-23

- Replace the footer trademark line at the customer's request with the exact Conceptive credit, linking the brand name to https://conceptive.online. Existing copyright text and policy links remain.
- Footer headings use a muted gray sans-serif style at medium weight. A footer-only contrast and screen-blend treatment makes the official logo's navy backdrop match the near-black footer while preserving red/white branding; the source logo and header remain unchanged.
- The homepage LEVEL UP emphasis uses red (#ff2020), retaining the approved responsive layout. No data or ordering changes; deliver through the existing authorized GitHub/Hostinger workflow.
