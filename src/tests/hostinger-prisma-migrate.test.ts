import { spawn } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

function verifyCopiedEngine() {
  return new Promise<{ code: number | null; output: string }>(
    (resolve, reject) => {
      const scriptPath = path.join(
        process.cwd(),
        "scripts",
        "hostinger-prisma-migrate.mjs",
      );
      const child = spawn(
        process.execPath,
        [scriptPath, "--verify-engine-only"],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.once("error", reject);
      child.once("exit", (code) => resolve({ code, output }));
    },
  );
}

describe("Hostinger Prisma migration wrapper", () => {
  it("discovers, copies, chmods and executes the installed schema engine", async () => {
    const result = await verifyCopiedEngine();

    expect(result.code, result.output).toBe(0);
    expect(result.output).toContain("Located schema engine:");
    expect(result.output).toContain("requested mode 0755");
    expect(result.output).toContain("Copied schema engine is executable.");
    expect(result.output).toContain("Engine-only verification completed.");
    expect(result.output).toContain("Removed temporary schema engine.");
  }, 30_000);
});
