# Hostinger WASM compatibility — 2026-10-10

## Task

- Task ID: MINIGAMES-CHECKOUT-SEO compatibility follow-up
- Branch: fix/hostinger-swc-compatibility
- Date: 2026-10-10

## Summary

Hostinger deployment 01a12570-a14e-70af-8aa7-3834b128391d failed after PR 27 because its Linux libraries lack GLIBC_2.29, required by the patched native Next.js compiler. The previously completed Minigames deployment remained live. This change keeps all dependency security patches and supplies official WASM fallbacks for SWC and sharp.

The plain MJS configuration loads without compiler bootstrapping and retains its security headers and bounded build workers. A separate strict TypeScript checkJs project validates its NextConfig type. The runtime dependency check verifies matching Next/SWC versions and places the locked WASM compiler in Next's automatic fallback directory, avoiding an opportunistic network download. Production uses normal fallback detection. Internal Next test flags are used only in isolated validation processes and CI.

## Files changed

- next.config.ts renamed to next.config.mjs
- tsconfig.next-config.json
- package.json and pnpm-lock.yaml
- scripts/check-runtime-dependencies.mjs
- scripts/check-wasm-compatibility.mjs
- scripts/build-task016-review-pack.ts
- .github/workflows/finalization-validation.yml
- tasks/MINIGAMES-CHECKOUT-SEO.md
- docs/DECISIONS.md and this report

## Database

- Migrations: none added; existing migrations and seed are validated by the build.
- Seed changes: none.
- Rollback: revert this compatibility commit if the hosting platform supplies supported native libraries; preserve the security patches. Existing orders and catalogue edits are unaffected.

## Commands and validation

Install with the locked pnpm graph, then run pnpm runtime:check, pnpm compatibility:check, pnpm lint, pnpm typecheck, pnpm test, pnpm format:check and the privacy source scanner. The compatibility check deliberately makes native SWC/sharp unavailable, verifies WASM TypeScript transformation and a WebP resize. Run the full production build with NEXT_TEST_NATIVE_DIR pointing to a nonexistent local directory, then verify release CI and Hostinger deployment.

Runtime audit on 2026-10-10: zero known production advisories. This is a time-specific dependency result, not a guarantee of future safety or a third-party rating.

## Screenshots and delivery

Original live Minigames desktop/mobile screenshots are in workspace outputs/minigames. Final delivery status, live optimized-image response and dashboard handoff are recorded in the workspace final completion report after deployment succeeds.

## Assumptions and known issues

The shared Hostinger OS cannot be upgraded through this application checkout. WASM is the vendor-supported compatibility path. It may process images/builds slower than native code. The server-side image optimizer is explicitly checked after release. Merchant credentials and initial owner credentials remain private configuration steps; they are not invented or embedded here.

Sources: [Next.js SWC loading guidance](https://nextjs.org/docs/messages/failed-loading-swc), [sharp installation and WebAssembly support](https://sharp.pixelplumbing.com/install/).

## Stop condition

This follow-up only resolves hosting compatibility for the requested security release. No unrelated feature was started.
