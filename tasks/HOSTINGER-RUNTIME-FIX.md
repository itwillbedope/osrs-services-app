# Hostinger runtime dependency repair

## Scope

Restore resolution of `@swc/helpers/_/_interop_require_default` in the deployed
Next.js application. Requirements: `docs/DECISIONS.md` and
`docs/PRODUCTION-DEPLOYMENT.md`.

## Implementation and verification

- Use pnpm's hoisted dependency layout for Hostinger packaging.
- Declare the exact helper version already required by Next.js as a production
  dependency, preserving other dependency versions.
- Check helper resolution from the application and Next.js, including Next.js
  environment initialization, before build/start.
- Verify frozen-lockfile installation, runtime checks, lint, type checks, tests,
  production build and HTTP health/homepage behavior where access permits.

No schema or seed changes are required. The user authorized fixing the live outage
on 2026-09-21. Production verification requires an authenticated hosting session.
Do not reset the database or change payment/authentication settings.
