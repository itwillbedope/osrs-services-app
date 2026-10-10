import { createRequire } from "node:module";
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
  // Resolve from both the application and Next.js, matching the two locations
  // in the Hostinger MODULE_NOT_FOUND stack.
  const nextRequire = createRequire(require.resolve("next/package.json"));
  require("@swc/helpers/_/_interop_require_default");
  nextRequire("@swc/helpers/_/_interop_require_default");
  nextRequire("next/dist/server/node-environment");
  // Next's fallback loader expects an absolute package directory. Install the
  // locked WASM compiler there so old-GLIBC hosts do not download it at build time.
  const nextPackage = require("next/package.json");
  const wasmPackage = require("@next/swc-wasm-nodejs/package.json");
  if (wasmPackage.version !== nextPackage.version) {
    throw new Error("The Next.js and SWC WASM versions must match.");
  }
  const wasmSource = dirname(
    require.resolve("@next/swc-wasm-nodejs/package.json"),
  );
  const wasmTarget = join(
    dirname(require.resolve("next/package.json")),
    "wasm",
    "@next",
    "swc-wasm-nodejs",
  );
  await mkdir(wasmTarget, { recursive: true });
  await cp(wasmSource, wasmTarget, { recursive: true });
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
