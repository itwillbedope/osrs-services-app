import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  // Resolve from both the application and Next.js, matching the two locations
  // in the Hostinger MODULE_NOT_FOUND stack.
  const nextRequire = createRequire(require.resolve("next/package.json"));
  require("@swc/helpers/_/_interop_require_default");
  nextRequire("@swc/helpers/_/_interop_require_default");
  nextRequire("next/dist/server/node-environment");
  console.log(
    "[runtime:check] Next.js runtime dependencies loaded successfully.",
  );
} catch (error) {
  console.error(
    "[runtime:check] Runtime dependencies are incomplete. Reinstall with the committed pnpm lockfile and hoisted node linker, then rebuild the deployment.",
  );
  console.error(error);
  process.exitCode = 1;
}
