#!/usr/bin/env node

import { chmod, copyFile, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const verifyOnly = process.argv.slice(2).includes("--verify-engine-only");
const unknownArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--verify-engine-only");

function mode(value) {
  return `0${(value & 0o777).toString(8)}`;
}

function run(command, arguments_, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      ...options,
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(
          new Error(`${path.basename(command)} exited after signal ${signal}.`),
        );
        return;
      }
      resolve(code ?? 1);
    });
  });
}

export async function locateInstalledSchemaEngine() {
  const prismaPackagePath = require.resolve("prisma/package.json");
  const prismaRequire = createRequire(prismaPackagePath);
  const enginesPackagePath = prismaRequire.resolve(
    "@prisma/engines/package.json",
  );
  const enginesDirectory = path.dirname(enginesPackagePath);
  const entries = await readdir(enginesDirectory, { withFileTypes: true });
  const candidates = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^schema-engine-/.test(entry.name) &&
        !entry.name.endsWith(".sha256"),
    )
    .map((entry) => path.join(enginesDirectory, entry.name))
    .filter((candidate) =>
      process.platform === "win32"
        ? candidate.toLowerCase().endsWith(".exe")
        : !candidate.toLowerCase().endsWith(".exe"),
    );

  if (candidates.length !== 1) {
    throw new Error(
      `Expected one Prisma schema engine for ${process.platform}, found ${candidates.length} under ${enginesDirectory}.`,
    );
  }

  return candidates[0];
}

export async function prepareExecutableSchemaEngine() {
  const sourcePath = await locateInstalledSchemaEngine();
  const sourceStats = await stat(sourcePath);
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "osrs-prisma-schema-engine-"),
  );
  const copiedPath = path.join(temporaryDirectory, path.basename(sourcePath));

  console.log(
    `[hostinger-prisma] Located schema engine: ${sourcePath} (mode ${mode(sourceStats.mode)})`,
  );
  await copyFile(sourcePath, copiedPath);
  await chmod(copiedPath, 0o755);
  const copiedStats = await stat(copiedPath);
  console.log(
    `[hostinger-prisma] Copied schema engine to: ${copiedPath} (requested mode 0755; observed ${mode(copiedStats.mode)})`,
  );

  return { copiedPath, temporaryDirectory };
}

export async function main() {
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArguments.join(", ")}`);
  }

  let temporaryDirectory;
  try {
    const prepared = await prepareExecutableSchemaEngine();
    temporaryDirectory = prepared.temporaryDirectory;

    console.log("[hostinger-prisma] Verifying copied schema engine...");
    const versionStatus = await run(prepared.copiedPath, ["--version"]);
    if (versionStatus !== 0) {
      throw new Error(
        `Copied Prisma schema engine failed its version check with exit code ${versionStatus}.`,
      );
    }
    console.log("[hostinger-prisma] Copied schema engine is executable.");

    if (verifyOnly) {
      console.log("[hostinger-prisma] Engine-only verification completed.");
      return;
    }

    const prismaCliPath = require.resolve("prisma/build/index.js");
    console.log("[hostinger-prisma] Running prisma migrate deploy...");
    const migrationStatus = await run(
      process.execPath,
      [prismaCliPath, "migrate", "deploy"],
      {
        env: {
          ...process.env,
          PRISMA_SCHEMA_ENGINE_BINARY: prepared.copiedPath,
        },
      },
    );
    if (migrationStatus !== 0) {
      throw new Error(
        `prisma migrate deploy failed with exit code ${migrationStatus}.`,
      );
    }
    console.log("[hostinger-prisma] Prisma migrations completed.");
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      console.log("[hostinger-prisma] Removed temporary schema engine.");
    }
  }
}

const isEntryPoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isEntryPoint) {
  main().catch((error) => {
    console.error(
      "[hostinger-prisma] Migration wrapper failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
