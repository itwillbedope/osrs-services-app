# Minigames Stream fee and live-chat button

Date: 2026-10-11. Task: STREAM-FEE-CHAT-LABEL.

The owner sets Minigames Stream to an additional 2% of the selected service price. Catalogue configuration now initializes Stream at 200 basis points, and a one-time migration updates existing offerings in the actual Minigames category. The migration also removes legacy Parsec facets and fills missing Stream facets. The earlier migration matched service slug minigames, while the active service uses minigames-services; category matching covers both without rewriting applied migrations. All other modifiers and historical order snapshots are preserved. Subsequent seeds preserve staff edits.

The existing server pricing engine multiplies the configured adjustment with quantity and other selected modifiers, rounds each service line to cents, and carries that quote into cart/checkout snapshots. The public checkbox derives its visible percentage from catalogue data. Stream adds no fee when unchecked. Infernal and Quiver remain excluded at UI and server levels. A $13.60 selection becomes $13.87; a $28.56 selection with an existing account requirement adjustment becomes $29.13.

The public launcher now reads Live Chat Support, with matching open/close accessible names and updated existing browser/screenshot selectors. Staff inbox headings and conversations remain unchanged.

Staff usernames/passwords remain exactly as requested in the private handover outside Git. The Hostinger dialog has no saved STAFF_SEED_ACCOUNTS_JSON and its Value field remains blank, so activation is incomplete. This is a private setup prerequisite, not a requested password replacement. The browser credential-entry handoff requires user entry and submission. Direct server access is unavailable. Do not claim the three production logins work until private setup is saved, deployed and each role login is verified.

Migration: 20261011190000_minigames_stream_fee. To adjust or roll back the fee, edit catalogue facets with owner approval; do not rewrite past order snapshots or historical migration files. No credential/authentication schema change, no payment activation.

Lint, typecheck, privacy/format checks and 301 unit tests passed. The production build and all 28 migrations succeeded locally. The local database integration verified all 105 canonical Minigames offerings have one 200-basis-point Stream facet and no Parsec, including upgrading a missing Stream facet, zero-rate facets and legacy Parsec. All 18 desktop/mobile browser flows passed, including toggle pricing, charged cart/checkout totals, combined adjustments, premium exclusions, chat opening/replies and role boundaries. Disposable local staff fixtures were disabled and sessions revoked. Deployment results are recorded in the workspace completion report.
