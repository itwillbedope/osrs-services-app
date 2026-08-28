import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mariadb from "mariadb";

const lockName = "osrs_services_production_migrations";
const lockTimeoutSeconds = 60;
const historyTable = "_prisma_migrations";

export const prismaMigrationTableSql = `CREATE TABLE \`_prisma_migrations\` (
  \`id\` varchar(36) NOT NULL,
  \`checksum\` varchar(64) NOT NULL,
  \`finished_at\` datetime(3) DEFAULT NULL,
  \`migration_name\` varchar(255) NOT NULL,
  \`logs\` text DEFAULT NULL,
  \`rolled_back_at\` datetime(3) DEFAULT NULL,
  \`started_at\` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  \`applied_steps_count\` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be configured.`);
  }
  return value;
}

function booleanEnvironment(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  throw new Error(`${name} must be a boolean value.`);
}

export function readDatabaseConfiguration() {
  const port = Number(process.env.DATABASE_PORT ?? "3306");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("DATABASE_PORT must be a valid TCP port.");
  }

  return {
    host: requiredEnvironment("DATABASE_HOST"),
    port,
    user: requiredEnvironment("DATABASE_USER"),
    password: requiredEnvironment("DATABASE_PASSWORD"),
    database: requiredEnvironment("DATABASE_NAME"),
    allowPublicKeyRetrieval: booleanEnvironment(
      "DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL",
    ),
  };
}

export function calculateMigrationChecksum(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareMigrationNames(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export async function discoverMigrations(
  migrationsDirectory = path.join(process.cwd(), "prisma", "migrations"),
) {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareMigrationNames);

  const migrations = [];
  for (const migrationName of directories) {
    const migrationPath = path.join(
      migrationsDirectory,
      migrationName,
      "migration.sql",
    );
    let bytes;
    try {
      bytes = await readFile(migrationPath);
    } catch (error) {
      throw new Error(
        `Migration directory ${migrationName} does not contain a readable migration.sql.`,
        { cause: error },
      );
    }
    migrations.push({
      name: migrationName,
      path: migrationPath,
      bytes,
      checksum: calculateMigrationChecksum(bytes),
      sql: bytes.toString("utf8"),
    });
  }

  if (migrations.length === 0) {
    throw new Error(
      `No migration directories found under ${migrationsDirectory}.`,
    );
  }
  return migrations;
}

export function assessMigrationHistory(migration, records) {
  const unresolved = records.find(
    (record) => record.finished_at == null && record.rolled_back_at == null,
  );
  if (unresolved) {
    throw new Error(
      `Migration ${migration.name} has an unresolved failed or incomplete record (${unresolved.id}). Resolve it manually before deploying.`,
    );
  }

  const finishedRecords = records.filter(
    (record) => record.finished_at != null && record.rolled_back_at == null,
  );
  for (const record of finishedRecords) {
    if (record.checksum !== migration.checksum) {
      throw new Error(
        `Checksum mismatch for completed migration ${migration.name}. Refusing to run modified migration history.`,
      );
    }
  }

  return finishedRecords.length > 0 ? "finished" : "pending";
}

export function sanitizeMigrationError(error, secrets = []) {
  let message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : `Migration error: ${String(error)}`;
  for (const secret of secrets) {
    if (secret) message = message.split(secret).join("[REDACTED]");
  }
  message = message.replace(
    /(?:mysql|mariadb):\/\/[^\s@]+@/gi,
    "mysql://[REDACTED]@",
  );
  return message.slice(0, 60_000);
}

async function ensureMigrationHistoryTable(connection, databaseName) {
  const rows = await connection.query(
    `SELECT COUNT(*) AS table_count
       FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?`,
    [databaseName, historyTable],
  );
  if (Number(rows[0]?.table_count ?? 0) === 0) {
    await connection.query(prismaMigrationTableSql);
    console.log(
      "[hostinger-sql-migrate] Created Prisma migration history table.",
    );
  }
}

async function readMigrationHistory(connection) {
  return connection.query(
    `SELECT id, checksum, finished_at, migration_name, logs,
            rolled_back_at, started_at, applied_steps_count
       FROM \`_prisma_migrations\`
      ORDER BY started_at ASC, id ASC`,
  );
}

function assertNoUnknownFinishedMigrations(migrations, history) {
  const knownNames = new Set(migrations.map((migration) => migration.name));
  const unknown = history.find(
    (record) =>
      record.finished_at != null &&
      record.rolled_back_at == null &&
      !knownNames.has(record.migration_name),
  );
  if (unknown) {
    throw new Error(
      `Database contains completed migration ${unknown.migration_name}, but its migration directory is missing.`,
    );
  }
}

function assertNoUnresolvedMigrations(history) {
  const unresolved = history.find(
    (record) => record.finished_at == null && record.rolled_back_at == null,
  );
  if (unresolved) {
    throw new Error(
      `Migration ${unresolved.migration_name} has an unresolved failed or incomplete record (${unresolved.id}). Resolve it manually before deploying.`,
    );
  }
}

async function applyMigration(connection, migration, configuration) {
  const id = randomUUID();
  await connection.query(
    `INSERT INTO \`_prisma_migrations\`
       (id, checksum, migration_name, started_at, applied_steps_count)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(3), 0)`,
    [id, migration.checksum, migration.name],
  );

  try {
    // These are trusted, repository-owned Prisma migrations. The MariaDB driver
    // parses multiple statements, including comments and quoted semicolons,
    // without altering or naively splitting the exact migration file.
    await connection.query(migration.sql);
    await connection.query(
      `UPDATE \`_prisma_migrations\`
          SET finished_at = CURRENT_TIMESTAMP(3), applied_steps_count = 1
        WHERE id = ? AND finished_at IS NULL`,
      [id],
    );
  } catch (error) {
    const log = sanitizeMigrationError(error, [
      configuration.password,
      process.env.DATABASE_URL,
    ]);
    try {
      await connection.query(
        `UPDATE \`_prisma_migrations\` SET logs = ? WHERE id = ?`,
        [log, id],
      );
    } catch {
      console.error(
        `[hostinger-sql-migrate] Could not record sanitized failure details for ${migration.name}.`,
      );
    }
    throw new Error(`Migration ${migration.name} failed.`, { cause: error });
  }
}

export async function runMigrations({
  configuration = readDatabaseConfiguration(),
  migrationsDirectory,
} = {}) {
  const migrations = await discoverMigrations(migrationsDirectory);
  console.log(
    `[hostinger-sql-migrate] Discovered ${migrations.length} migration files.`,
  );

  let connection;
  let lockAcquired = false;
  try {
    connection = await mariadb.createConnection({
      ...configuration,
      multipleStatements: true,
      connectTimeout: 15_000,
    });
    const lockRows = await connection.query(
      "SELECT GET_LOCK(?, ?) AS acquired",
      [lockName, lockTimeoutSeconds],
    );
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) {
      throw new Error(
        `Could not acquire the database migration lock within ${lockTimeoutSeconds} seconds.`,
      );
    }
    console.log("[hostinger-sql-migrate] Acquired database migration lock.");

    await ensureMigrationHistoryTable(connection, configuration.database);
    const history = await readMigrationHistory(connection);
    assertNoUnresolvedMigrations(history);
    assertNoUnknownFinishedMigrations(migrations, history);

    let appliedCount = 0;
    for (const migration of migrations) {
      const records = history.filter(
        (record) => record.migration_name === migration.name,
      );
      const state = assessMigrationHistory(migration, records);
      if (state === "finished") {
        console.log(`[hostinger-sql-migrate] Skipping ${migration.name}.`);
        continue;
      }

      console.log(`[hostinger-sql-migrate] Applying ${migration.name}...`);
      await applyMigration(connection, migration, configuration);
      appliedCount += 1;
      console.log(`[hostinger-sql-migrate] Applied ${migration.name}.`);
    }

    if (appliedCount === 0) {
      console.log("[hostinger-sql-migrate] No pending migrations.");
    } else {
      console.log(
        `[hostinger-sql-migrate] Applied ${appliedCount} migration${appliedCount === 1 ? "" : "s"}.`,
      );
    }
    return { appliedCount, migrationCount: migrations.length };
  } finally {
    if (connection && lockAcquired) {
      try {
        await connection.query("SELECT RELEASE_LOCK(?) AS released", [
          lockName,
        ]);
        console.log(
          "[hostinger-sql-migrate] Released database migration lock.",
        );
      } catch {
        console.error(
          "[hostinger-sql-migrate] Failed to explicitly release the migration lock; closing the connection will release it.",
        );
      }
    }
    if (connection) await connection.end().catch(() => undefined);
  }
}

const isEntryPoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isEntryPoint) {
  runMigrations().catch((error) => {
    const sanitized = sanitizeMigrationError(error, [
      process.env.DATABASE_PASSWORD,
      process.env.DATABASE_URL,
    ]);
    console.error(`[hostinger-sql-migrate] ${sanitized}`);
    process.exitCode = 1;
  });
}
