import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

// The production runner is intentionally plain ESM so Hostinger can execute it
// directly with Node, without a TypeScript loader.
// @ts-expect-error The native ESM deployment script has no declaration file.
const migrationRunner = await import("../../scripts/hostinger-sql-migrate.mjs");

describe("Hostinger SQL migration runner", () => {
  it("discovers every current migration in Prisma order", async () => {
    const migrations = await migrationRunner.discoverMigrations();
    const migrationDirectories = (
      await readdir("prisma/migrations", {
        withFileTypes: true,
      })
    ).filter((entry) => entry.isDirectory());

    expect(migrations).toHaveLength(migrationDirectories.length);
    expect(migrations.length).toBeGreaterThan(0);
    expect(
      migrations.map((migration: { name: string }) => migration.name),
    ).toEqual(
      [...migrations]
        .map((migration: { name: string }) => migration.name)
        .sort(),
    );
  });

  it("checksums the exact migration bytes", async () => {
    const [migration] = await migrationRunner.discoverMigrations();
    const bytes = await readFile(migration.path);
    const expected = createHash("sha256").update(bytes).digest("hex");

    expect(migration.checksum).toBe(expected);
    expect(
      migrationRunner.calculateMigrationChecksum(Buffer.from("x\r\n")),
    ).not.toBe(migrationRunner.calculateMigrationChecksum(Buffer.from("x\n")));
  });

  it("skips matching completed records", () => {
    const migration = { name: "20260101000000_test", checksum: "expected" };
    const result = migrationRunner.assessMigrationHistory(migration, [
      {
        id: "complete",
        checksum: "expected",
        finished_at: new Date(),
        rolled_back_at: null,
      },
    ]);

    expect(result).toBe("finished");
  });

  it("fails closed on changed or unresolved migrations", () => {
    const migration = { name: "20260101000000_test", checksum: "expected" };

    expect(() =>
      migrationRunner.assessMigrationHistory(migration, [
        {
          id: "changed",
          checksum: "different",
          finished_at: new Date(),
          rolled_back_at: null,
        },
      ]),
    ).toThrow(/checksum mismatch/i);
    expect(() =>
      migrationRunner.assessMigrationHistory(migration, [
        {
          id: "failed",
          checksum: "expected",
          finished_at: null,
          rolled_back_at: null,
        },
      ]),
    ).toThrow(/unresolved failed or incomplete/i);
  });

  it("uses Prisma 7.8-compatible migration history columns", () => {
    expect(migrationRunner.prismaMigrationTableSql).toContain(
      "`id` varchar(36)",
    );
    expect(migrationRunner.prismaMigrationTableSql).toContain(
      "`checksum` varchar(64)",
    );
    expect(migrationRunner.prismaMigrationTableSql).toContain(
      "`finished_at` datetime(3)",
    );
    expect(migrationRunner.prismaMigrationTableSql).toContain(
      "`applied_steps_count` int(10) unsigned",
    );
  });

  it("redacts secrets from recorded migration errors", () => {
    const message = migrationRunner.sanitizeMigrationError(
      new Error(
        "password=swordfish mysql://user:swordfish@localhost/example failed",
      ),
      ["swordfish", "mysql://user:swordfish@localhost/example"],
    );

    expect(message).not.toContain("swordfish");
    expect(message).not.toContain("mysql://user:");
    expect(message).toContain("[REDACTED]");
  });
});
