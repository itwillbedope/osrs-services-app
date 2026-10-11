# Admin entry, client staff setup and live support

## Task

- Task ID: ADMIN-LOGIN-ENTRY
- Branch: feat/admin-login-entry
- Final verification date: 2026-10-11

## Summary

Anonymous visitors now sign in directly at /admin. Signed-in Head sees the business dashboard, support staff enter their chat queue, and editors enter the catalogue. The existing protected /admin subtree keeps its server capability guard. /login redirects safely to /admin; explicit admin return links are preserved, external/escaped destinations are rejected, and sign-out returns to /admin. The request proxy allows only the entry page without a staff cookie. Expired session reads do not attempt cookie mutation during server rendering.

Staff identifiers accept normalized usernames and existing email identifiers. Customer email validation and session lanes are unchanged. At the owner's explicit insistence, staff passwords accept 8–128 characters for the requested logins; Argon2id, role checks and login rate limits remain. Real usernames/passwords are only in the private workspace handover, never source. STAFF_SEED_ACCOUNTS_JSON privately initializes up to three recognized roles in one transaction, creates audit records without passwords, preserves existing passwords, and refuses customer promotion or conflicting staff assignments.

Public live support is activated for guests and customers. The floating widget retains its conversation when closed, resumes it from the authenticated guest cookie on reload, and polls for replies every five seconds on the current Next.js host. Optional sockets remain disabled until a socket host is configured. A shared staff queue feed updates the inbox, shows waiting counts and new-message toasts, and opens the relevant conversation. Staff transcripts refresh automatically. Failed sends retain the draft. Private notes, message ownership, role boundaries, message limits and rate limits remain server enforced. Head controls availability; Chat Support cannot edit settings. No bot or fabricated staff-online count is shown.

Minigames replaces Parsec remote access with Stream. The data migration removes Parsec's modifier so old/fabricated selections fail server validation, and adds an editable zero-surcharge Stream facet. No new fee was supplied, so Parsec's 50% is not reused. Base prices and other minigame adjustments are preserved. Stream stays excluded on Infernal and Quiver in UI and server estimates.

The live release review found obsolete Parsec/50% wording in the Minigames FAQ after the control had been replaced. A copy follow-up updates the shared visible FAQ and FAQ structured data to explain Stream and the premium-service exclusions, without hardcoding a future fee.

Staff sign-in, all admin workspaces and customer/staff chat use Inter v4.1, served from the site with its original SIL Open Font License. Headings use a readable sans-serif, buttons use semibold mixed case, transcripts have comfortable line spacing, and dashboard numbers align with tabular numerals. The font loads only when used, with swap behavior and system fallbacks; no external font request or global preload. Public storefront typography remains unchanged. Official source and license provenance are retained in public/fonts/inter/README.md.

## Database and rollback

- 20261010183000_activate_live_support_chat: one-time activation of existing flags/settings. Fresh database defaults match the requested behavior; subsequent seeding preserves owner settings.
- 20261010183500_minigames_stream_option: removes obsolete Minigames Parsec facets and initializes Stream, without changing order snapshots.
- No credential column or role schema change. The existing unique identifier field stores staff usernames; no email mailbox is created.
- To roll back availability, Head can disable the launcher/change availability; preserve transcripts. Restore pricing modifiers only with explicit owner approval. Do not remove staff roles or accounts during rollback without first reviewing their assignments.
- SQL is checked out with LF for stable migration byte checksums. Existing local QA history had mixed LF/CRLF; statements and stored checksums were preserved. A failed local-only new migration used an incorrect service table name, was marked rolled back, corrected to CatalogueService, then applied successfully. No failed version was pushed or deployed.

## Verification

Lint/typecheck, formatting/privacy scans and 301 unit tests passed. The final production build and all 27 migrations succeeded locally. Tests cover admin proxy routing, safe return destinations, staff/customer credential separation, expired-session rendering, staff initialization validation and takeover rejection, and Stream pricing without Parsec. A local database integration check created all three roles with verified Argon2id hashes and audit records, then verified reseeding preserves passwords and disabled those disposable accounts. All eighteen desktop/mobile staff, chat and Minigames browser checks passed after the final Inter changes, including actual font loading, scoped font styles and phone checkout/chat coexistence. Release CI and deployment are recorded in the workspace completion report. Local production-mode HTTP API assertions forward only disposable fixture cookies explicitly, because APIRequestContext does not apply Chromium's localhost Secure-cookie allowance. App cookies remain Secure in production.

## Files and documentation

Changes cover the auth entry/shared sign-in screen, guards/proxy/actions/session reads, staff identifiers/private seed helper, chat settings/seeding and the two data migrations, staff feed and customer/admin chat components, Minigames selection/seeding, auth/chat/order browser tests and related unit tests. The active task and DECISIONS record the user's requested roles/password policy, one-time chat activation and Stream fee assumption. Screenshots are captured under artifacts/admin-live-support, artifacts/staff-workspaces and existing Minigames artifact paths.

## Client handover and remaining private step

The exact client logins and one environment entry are in workspace outputs/staff-access/CLIENT-STAFF-LOGINS.txt, outside Git. OWNER-LOGIN.txt now contains the same requested credentials rather than the superseded random owner setup. Enter STAFF_SEED_ACCOUNTS_JSON privately in Hostinger and save, then redeploy to initialize the three accounts. Browser credential-entry policy requires user entry and submission; no credential was typed through automation. Existing ADMIN_SEED_* initialization remains backward compatible. After verifying the accounts, the owner may remove the bootstrap JSON setting so later role changes do not conflict with its original assignments. Do not claim production staff accounts are active until configuration/deployment and actual login checks succeed.

## Stop condition

Only requested admin URL, staff account preparation, human support chat, Minigames Stream and admin/chat typography changes are included. Merchant accounts remain unconnected as planned.
