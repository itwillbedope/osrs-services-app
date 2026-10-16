# Cape pricing, custom orders and support presentation

Owner request: 16 October 2026. Written requirements override inconsistent numbers in the reference mockups. Task: `tasks/CAPE-PRICING-CUSTOM-ORDERS.md`.

## Pricing and catalogue

- Infernal weapon bases: Twisted Bow $65, Bowfa $75, Armadyl Crossbow $85.
- Quiver gear bases: Top Tier $50, Mid Tier $65. Low Tier is not offered.
- Both: Main +0%, Pure +30%, 1 Defence +30%, Zerker +20%. Restricted builds need a custom quote and cannot enter the automatic cart.
- Infernal recommendations: Ranged 95, Magic 94, Defence/Prayer/HP 90. Quiver: 90/85/70/77/85 respectively. Lower Ranged OR Magic adds 20% exactly once; the other three stats have no charge. All five must be entered for automatic checkout. Skipping displays an indicative estimate and a review notice but cannot produce a cart source.
- Infernal: missing Rigour +5%, missing Blowpipe +5%, active Inferno Slayer task −10%.
- All cape percentages add against the selected package base, without compounding. Round the final total once to cents; allocate any fractional-cent difference so displayed lines sum exactly. Separately configured delivery charges use the base and are shown explicitly. Existing delivery availability/rates remain unchanged. Game mode is separate from build and adds no cape fee under the requested formula.
- Quiver excludes Hardcore Ironman in both UI and server. Existing supported Normal/Ironman modes remain. Group Ironman is not a catalogue enum in the existing application; custom requests can specify it for review rather than silently treating it as a normal account.
- `PremiumServiceConfig.capePricingRules` contains validated, editable recommendations/modifiers. Package prices remain in `PremiumPackage`. Existing permission, staged publishing, concurrency and audit paths cover edits and copying. The one-time `seedCapePricing` initialization checks for this JSON before changing anything; subsequent builds preserve staff pricing edits. No staff login is modified.
- Stream is 10% across supported services. Existing minigames modifiers are updated and direct quest/diary/gathering offerings gain a database-backed Stream facet. Future default rules also use 1000 basis points. Infernal/Quiver continue to reject Stream server-side.
- Customer gear confirmation and supply-support upsells/charges are retired from Bossing (including raids), Skilling and generic premium ordering. Forged or stale paid-supply selections are rejected; unconfirmed gear incurs no fee. Customer-provided gear/supplies are stated explicitly. Infernal's specifically requested missing-gear adjustments are part of the separate cape calculator.
- Old order snapshots remain unchanged. Existing carts reprice through the authoritative engines and reject obsolete selections.

## Navigation and customer experience

`/corrupted-gauntlet` renders the existing canonical Corrupted Gauntlet encounter/rates directly, without defaulting to Zulrah. Homepage fallbacks, resolved CG promotions and the existing database promotion point there. Infernal navigation is unchanged.

The cape pages share a responsive three-column desktop configuration, bounded left artwork, readable stat fields, illustrated weapon choices, independent game mode/build controls, an always-visible desktop summary, mobile cart bar and bottom price guide. Artwork uses existing approved assets; equipment symbols are original lightweight SVG illustrations. Mobile hides the tall artwork to prioritize the order controls.

The public chat launcher has a compact headset treatment and secondary caption. The panel has a matching header, accessible close button, clearer availability message, readable fields and transcript styling. It retains polling, drafts, recovery, staff notifications, ownership checks and private notes. It does not invent online staffing numbers. The blue tint around the official wordmark is removed with a shared contrast treatment on a black header/footer; the logo lettering is preserved.

## Custom order workflow

`/custom-order` is linked from the homepage promotion, service navigation and footer. It collects service category, goal, current progress/gear, account mode/build, preferred timing, optional budget/contact and consent. It submits a clearly marked custom request into the existing protected support inbox. Staff can review and reply there; customers receive a reference and return to the conversation in the same browser. No paid order or payment is created on submission.

The existing chat service supplies rate limits, text sanitization/redaction, idempotency, guest cookies, per-conversation ownership, audit events and staff notifications. Network failure preserves the form. Repeat submission with the same request key returns the same conversation. Conversation contents and contact details are excluded from search indexing and page structured data. No new public tracking token or email delivery promise is introduced.

Research used general request/quote patterns from [Manscape's custom-request result](https://www.manscapeosrs.com/osrs-services/custom-request) (search preview; page unavailable) and [Moatmanservice](https://www.moatmanservice.com/): describe goals, confirm scope/setup, agree timing/price before payment. No competitor copy, account inventory or artwork is imported.

## Search visibility, trust and performance

- New pages have descriptive titles, canonical URLs, internal links and sitemap entries. Cape and custom-order answers are server-rendered and carry matching FAQ/Service structured data. Published prices and rule values populate the cape answers, avoiding invented review/rating markup.
- Existing private-route noindex/robots exclusions and response security headers stay in place. The public custom request landing page is indexable; private messages remain API-protected.
- The already deferred chat launcher now loads `socket.io-client` only if a configured realtime conversation actually needs it, preserving lightweight polling on the current deployment. Original vector equipment icons add no raster requests. Existing WebP art, lazy service images and high-priority hero remain.
- Cape forms use system UI fonts, retaining Inter for admin/chat only. A small shared numeric validator and money formatter keep the admin validation/legacy calculator dependencies out of the cape client bundle; tests verify validation bounds agree with the admin schema.
- [Google's official AI guidance](https://developers.google.com/search/docs/appearance/ai-features) states standard SEO/indexing practices also apply to AI features; there is no special AI schema or guaranteed inclusion. Owner actions still include verifying Search Console/Bing using the existing environment settings, submitting the sitemap and building useful original content/reputation over time.
- [ScamAdviser's FAQ](https://www.scamadviser.com/FAQ) describes external technical, contact/reputation and feedback inputs. A direct score lookup timed out during this work, so no current score or green status is claimed. Verified business identity/contact details, authentic independent reviews and a claimed/reviewed owner profile must come from the actual business. No fake badges, reviews, addresses or ranking guarantees are added.
- Record measured Lighthouse results separately in the completion report; local lab results are not a guarantee of production field performance or GTmetrix scores.

Local production mobile Lighthouse runs on 16 October 2026:

| Page                       | Performance | Accessibility | Best Practices | SEO |
| -------------------------- | ----------: | ------------: | -------------: | --: |
| Homepage                   |          92 |            97 |            100 | 100 |
| Quiver, after optimization |          89 |            97 |            100 | 100 |

Quiver improved from 78 to 89 during this task; simulated LCP improved from 4.5s to 3.2s and layout shift from 0.015 to 0. Measurements are lab snapshots, not field guarantees. Raw reports are retained in the task's private performance output folder. The public-site Lighthouse run returned 403 and is not reported as a live score.
