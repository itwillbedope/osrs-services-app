# Minigames and storefront update — 2026-10-10

## Catalogue and ordering

The customer expressly authorized Minigames products/rates from https://bald.gg/services/minigames. The public UI was inspected on 2026-10-10: 26 non-empty groups and 105 options. The empty Clues From Scratch group is omitted because its products are already inside Clues. Outfits appeared in a crawler snapshot but was absent from the live interactive catalogue, so no missing product or price was invented.

`data/reference/minigames-2026-10-10.json` records names, USD cents, quantity units and modifiers. `seedMinigames` creates an independent published service transactionally, only once. Staff can edit prices, quantities, requirements and modifier facets through Catalogue. A modifier facet uses `minigame-modifier` and a slug such as `parsec-bps-plus-5000` or `hard-combat-achievements-bps-minus-1500`; its label is customer-facing. Percentages are server-authoritative and use the observed multiplicative calculation, rounded once to cents. Incompatible level/achievement tiers cannot combine.

No competitor artwork, reviews, marketing guarantees or account listings were reused. Original AI art is recorded in MINIGAMES-ASSETS-PROMPTS.md. The new route is `/minigames`; legacy category/service routes redirect there. Homepage main services, navigation and footer include it.

Gathering quantities are independent drafts, visible before selecting a service. Changing a draft does not add a service. Selecting preserves the entered amount; changes to selected quantities refresh the server quote. Invalid quantities block ordering with an explanation.

Infernal and Colosseum configurations reject Stream in the shared estimator used by both quotes and cart repricing. The UI hides it. A migration disables older rules and removes the generated Quiver content's stream sentence. Other service engines retain Stream. Standard/Express settings remain unchanged.

## Dashboard access

- Staff sign-in: `/login?next=/admin`
- Dashboard: `/admin`
- User creation and custom roles: `/admin/users`
- Payment configuration: `/admin/payments/setup`
- Catalogue: `/admin/catalogue/services`

Sign in using the existing Super Admin credentials configured privately in Hostinger. If no owner has been initialized, set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD privately before deploying; use a unique password of at least 12 characters and ADMIN_SEED_RESET_PASSWORD=false. No default password or public registration can grant staff access.

Users & roles requires `users.manage`. New passwords are Argon2id hashed. The manager can grant only held capabilities and cannot edit a more privileged user or their own role/status. Access edits revoke existing staff sessions. Creation, role definition and access changes are audited; passwords and hashes never enter audit metadata or action responses.

## Payment setup

The customer confirmed existing accounts will be connected later. Four options are initialized disabled, preserve subsequent edits, and appear as Coming soon at checkout until configured:

- **Stripe:** real hosted Checkout adapter through the existing EXTERNAL_HOSTED_CHECKOUT provider mode. Secret keys live only in environment variables. Configure STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL, EXTERNAL_PAYMENTS_ENABLED=true and PAYMENT_WEBHOOKS_ENABLED=true privately, then redeploy. Use `/api/payments/webhooks/stripe` for Checkout completed, async success, async failure and expiry events. SDK verification uses the unmodified request body and Stripe-Signature with replay-age validation. Verified events use durable event deduplication, order amount/currency checks and existing payment transitions. Unpaid completion and unrelated events never mark orders paid. Stable payment-transaction idempotency keys prevent duplicate session creation after a retry. Test the actual merchant account's permitted categories before enabling it in Payment setup and publishing eligibility rules. Card/payment method availability is managed in Stripe.
- **Payoneer:** support-reviewed order payment option. An automatic Payoneer gateway is not activated; the merchant must later supply its approved Checkout API integration details or payment-request process. Configure customer instructions before enabling.
- **Bitcoin:** support-reviewed invoice/trade option. Supply invoice/wallet receiving instructions, network, expiry and confirmation policy later. Staff must verify actual receipt; no fabricated BTC exchange rate or wallet address is shown.
- **OSRS GP:** support-reviewed in-game payment. Staff confirms the current GP amount/rate and trade instructions per order, then verifies receipt. No invented exchange rate is seeded.

Private keys, bank details, addresses, SMTP credentials and production payment tests are not supplied or enabled by this task. Pending Stripe refunds require follow-up in Stripe/admin; only immediate API-confirmed refunds transition immediately. Existing manual payment review remains available. Unknown or disabled requested payment methods are rejected rather than silently switched to another method.

Provider sources: https://docs.stripe.com/api/checkout/sessions, https://docs.stripe.com/events/manage-webhook-endpoints and https://www.payoneer.com/checkout/.

## Discovery, performance and trust

Public pages override the former inherited noindex default. Metadata uses absolute production URLs, canonical destinations, social previews, sitemap.xml, robots.txt, Organization/WebSite markup, and Service/Breadcrumb/FAQ/OfferCatalog data matching visible Minigames content. Private routes stay noindex and excluded from crawling. Rendering assets are not blocked. `/llms.txt` provides a concise factual service index; it is supplementary and does not guarantee AI inclusion. Google and Bing verification tokens can be supplied privately as GOOGLE_SITE_VERIFICATION and BING_SITE_VERIFICATION.

Google's guidance says normal crawlability, content quality and matching structured data also apply to AI search: https://developers.google.com/search/docs/appearance/ai-features. No fabricated reviews, traffic, location or ratings are used.

New portraits are 384px WebP (26 files total approximately 1.18 MB); the homepage scene is 960px WebP. Images load lazily at card-sized resolutions. Disabled chat avoids loading its client entirely; enabled optional chat loads after the critical page. Public homepage merchandising has a 30-second data cache, invalidated by normal homepage updates; scheduled homepage changes can appear up to 30 seconds after their scheduled time.

PageSpeed API returned 429 during the audit. The public Lighthouse mobile run returned 403; no actual PageSpeed/GTmetrix score is claimed. Scamadviser's retrieved report was last updated 2024-03-03 and references a previous Namecheap-hosted "Index of /" site. The owner should claim and update the business profile and request reassessment; code changes cannot guarantee a third-party trust rating. Source: https://www.scamadviser.com/check-website/osrsservices.com.

Actual public business/contact information and Search Console/Bing ownership verification remain owner inputs. No business identity is invented.

A local Lighthouse 13.5.0 simulated-mobile production homepage audit after logo compression/high-priority hero loading measured 95 performance, 100 SEO and 100 best practices. This is a single localhost lab run, not a live PageSpeed/GTmetrix score. The official logo is served as a 15 KB WebP instead of the 1.29 MB PNG, preserving composition. Audit summary: artifacts/minigames/performance-summary.json.
