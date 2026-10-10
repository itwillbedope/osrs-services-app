import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));

// Test-only fault injection: simulate native SWC being unavailable. These flags
// are confined to this process; production keeps Next's automatic fallback.
process.env.NEXT_TEST_NATIVE_DIR = join(tmpdir(), "osrs-missing-native-swc");
const bindings = await nextRequire("next/dist/build/swc").loadBindings();
assert.equal(bindings.isWasm, true);
const transformed = await bindings.transform("const answer: number = 42;", {
  jsc: { parser: { syntax: "typescript" }, target: "es2022" },
  module: { type: "commonjs" },
});
assert.match(transformed.code, /42/);

// Simulate native sharp failing to load and exercise its official WASM fallback,
// including the WebP resize path used by Next's image optimizer.
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (
    (request.startsWith("@img/sharp-") && !request.includes("wasm32")) ||
    request.includes("/src/build/Release/sharp-")
  ) {
    throw new Error("Native image bindings unavailable in compatibility test.");
  }
  return originalLoad.call(this, request, ...args);
};
let sharp;
try {
  sharp = nextRequire("sharp");
} finally {
  Module._load = originalLoad;
}
const image = await sharp({
  create: { width: 16, height: 16, channels: 3, background: "#ff0000" },
})
  .resize(8, 8)
  .webp()
  .toBuffer();
const metadata = await sharp(image).metadata();
assert.equal(metadata.format, "webp");
assert.equal(metadata.width, 8);
assert.equal(metadata.height, 8);
console.log(
  "[compatibility:check] SWC WASM compilation and sharp WASM WebP resize passed.",
);
