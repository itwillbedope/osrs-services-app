import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import mariadb, { type Connection } from "mariadb";

type Row = Record<string, unknown>;

type TableSnapshot = {
  tableName: string;
  keyFields: string[];
  columns: string[];
  identifiers: string[];
  fingerprint: string;
  count: number;
};

type MarkerFile = {
  version: 1;
  source: "task015";
  createdBy: "scripts/validate-task016-existing-db.ts";
  tables: Record<string, TableSnapshot>;
};

const artifactDirectory = path.join(process.cwd(), "artifacts", "task-016");
const markerPath = path.join(
  artifactDirectory,
  ".task015-preservation-markers.json",
);
const reportPath = path.join(
  artifactDirectory,
  "task015-to-task016-validation.txt",
);

const task016MigrationName = "20260810150000_task016_payments_launch_readiness";

const customerId = "task016upcustomer";
const profileId = "task016upprofile";
const contactId = "task016upcontact";
const orderId = "task016uporder";
const orderItemId = "task016upitem";
const orderLinkId = "task016uplink";
const notificationId = "task016upnotify";
const chatGuestId = "task016upguest";
const chatConversationId = "task016upchat";
const chatMessageId = "task016upmsg";
const chatEventId = "task016upevent";
const chatCursorId = "task016upcursor";
const transactionId = "task016uptxn";
const transactionEventId = "task016uptxnevent";
const emailDeliveryId = "task016upemail";

const task016Tables = [
  "PaymentProviderConfiguration",
  "PaymentEligibilityRule",
  "PaymentTransaction",
  "PaymentTransactionEvent",
  "PaymentWebhookEvent",
  "PaymentRefund",
  "EmailTemplate",
  "EmailDelivery",
  "ProductionReadinessSetting",
] as const;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function normalize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("hex");
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Row)
        .filter(([key]) => key !== "updatedAt")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalize(entry)]),
    );
  }
  return value;
}

function projectRow(row: Row, columns: string[]) {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

function identifier(row: Row, fields: string[]) {
  return fields.map((field) => String(row[field] ?? "")).join("\u001f");
}

function fingerprint(rowsToHash: Row[], fields: string[]) {
  const sortedRows = [...rowsToHash].sort((left, right) =>
    identifier(left, fields).localeCompare(identifier(right, fields)),
  );
  return createHash("sha256")
    .update(JSON.stringify(normalize(sortedRows)))
    .digest("hex");
}

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function connect() {
  return mariadb.createConnection({
    host: requiredEnv("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: requiredEnv("DATABASE_USER"),
    password: requiredEnv("DATABASE_PASSWORD"),
    database: requiredEnv("DATABASE_NAME"),
    bigIntAsNumber: true,
    allowPublicKeyRetrieval:
      process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === "true",
  });
}

async function rows<T extends Row>(
  connection: Connection,
  sql: string,
  values: unknown[] = [],
) {
  return (await connection.query(sql, values)) as T[];
}

async function count(
  connection: Connection,
  tableName: string,
  where = "",
  values: unknown[] = [],
) {
  const result = await rows<{ value: number }>(
    connection,
    `SELECT COUNT(*) AS value FROM \`${tableName}\` ${where}`,
    values,
  );
  return asNumber(result[0]?.value);
}

async function tableNames(connection: Connection) {
  const result = await rows<{ TABLE_NAME: string }>(
    connection,
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME <> '_prisma_migrations'
     ORDER BY TABLE_NAME`,
  );
  return result.map((row) => row.TABLE_NAME);
}

async function tableColumns(connection: Connection, tableName: string) {
  const result = await rows<{ COLUMN_NAME: string }>(
    connection,
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [tableName],
  );
  return result.map((row) => row.COLUMN_NAME);
}

async function primaryKeyFields(connection: Connection, tableName: string) {
  const result = await rows<{ COLUMN_NAME: string }>(
    connection,
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = 'PRIMARY'
     ORDER BY ORDINAL_POSITION`,
    [tableName],
  );
  if (result.length) return result.map((row) => row.COLUMN_NAME);
  return tableColumns(connection, tableName);
}

async function tableRows(
  connection: Connection,
  tableName: string,
  keyFields: string[],
) {
  const orderBy = keyFields.map((field) => `\`${field}\``).join(", ");
  return rows(connection, `SELECT * FROM \`${tableName}\` ORDER BY ${orderBy}`);
}

function createSnapshot(
  tableName: string,
  keyFields: string[],
  columns: string[],
  rowsToSnapshot: Row[],
) {
  const projectedRows = rowsToSnapshot.map((row) => projectRow(row, columns));
  return {
    tableName,
    keyFields,
    columns,
    identifiers: rowsToSnapshot.map((row) => identifier(row, keyFields)),
    fingerprint: fingerprint(projectedRows, keyFields),
    count: rowsToSnapshot.length,
  } satisfies TableSnapshot;
}

function preservedRows(currentRows: Row[], snapshot: TableSnapshot) {
  const byIdentifier = new Map(
    currentRows.map((row) => [identifier(row, snapshot.keyFields), row]),
  );
  return snapshot.identifiers.map((rowIdentifier) => {
    const row = byIdentifier.get(rowIdentifier);
    if (!row) {
      throw new Error(
        `Missing preserved row ${rowIdentifier} in ${snapshot.tableName}.`,
      );
    }
    return projectRow(row, snapshot.columns);
  });
}

async function cleanupTask015Fixtures(connection: Connection) {
  await connection.query("DELETE FROM ChatConversation WHERE id = ?", [
    chatConversationId,
  ]);
  await connection.query("DELETE FROM ChatGuestSession WHERE id = ?", [
    chatGuestId,
  ]);
  await connection.query("DELETE FROM CustomerNotification WHERE id = ?", [
    notificationId,
  ]);
  await connection.query("DELETE FROM CustomerOrderLink WHERE id = ?", [
    orderLinkId,
  ]);
  await connection.query("DELETE FROM OrderPaymentEvent WHERE orderId = ?", [
    orderId,
  ]);
  await connection.query("DELETE FROM OrderStatusEvent WHERE orderId = ?", [
    orderId,
  ]);
  await connection.query("DELETE FROM OrderItem WHERE id = ?", [orderItemId]);
  await connection.query("DELETE FROM `Order` WHERE id = ?", [orderId]);
  await connection.query("DELETE FROM GuestOrderContact WHERE id = ?", [
    contactId,
  ]);
  await connection.query("DELETE FROM CustomerProfile WHERE userId = ?", [
    customerId,
  ]);
  await connection.query("DELETE FROM Session WHERE userId = ?", [customerId]);
  await connection.query("DELETE FROM UserRole WHERE userId = ?", [customerId]);
  await connection.query("DELETE FROM User WHERE id = ?", [customerId]);
}

async function prepareTask015Fixtures() {
  const connection = await connect();
  try {
    await cleanupTask015Fixtures(connection);
    const settings = (
      await rows<{
        termsVersion: string;
        privacyPolicyVersion: string;
      }>(
        connection,
        `SELECT termsVersion, privacyPolicyVersion
         FROM CheckoutSettings
         WHERE stableKey = 'checkout-default-settings'
         LIMIT 1`,
      )
    )[0];
    const method = (
      await rows<{ id: string }>(
        connection,
        `SELECT id
         FROM CheckoutPaymentMethod
         WHERE stableKey = 'manual-review'
         LIMIT 1`,
      )
    )[0];
    if (!settings || !method) {
      throw new Error("Task 015 checkout seed rows are required.");
    }
    await connection.query(
      `INSERT INTO User
        (id, email, name, passwordHash, status, accountType, createdAt, updatedAt)
       VALUES (?, 'task016-upgrade-customer@example.test',
        'Task 016 Upgrade Customer', ?, 'ACTIVE', 'CUSTOMER', NOW(3), NOW(3))`,
      [customerId, hash("task016 upgrade customer password marker")],
    );
    await connection.query(
      `INSERT INTO CustomerProfile
        (id, userId, displayName, defaultRsn, emailVerificationStatus,
         registrationSource, needsReview, termsVersion, privacyPolicyVersion,
         termsAcceptedAt, privacyAcceptedAt, createdAt, updatedAt)
       VALUES (?, ?, 'Task 016 Upgrade Customer', 'Task016',
        'VERIFIED', 'CI_TASK016_UPGRADE', 1, ?, ?,
        NOW(3), NOW(3), NOW(3), NOW(3))`,
      [
        profileId,
        customerId,
        settings.termsVersion,
        settings.privacyPolicyVersion,
      ],
    );
    await connection.query(
      `INSERT INTO GuestOrderContact
        (id, displayName, email, rsn, consentAt, termsVersion,
         privacyPolicyVersion, createdAt)
       VALUES (?, 'Task 016 Upgrade Contact',
        'task016-upgrade-customer@example.test', 'Task016',
        NOW(3), ?, ?, NOW(3))`,
      [contactId, settings.termsVersion, settings.privacyPolicyVersion],
    );
    await connection.query(
      `INSERT INTO \`Order\`
        (id, orderNumber, guestContactId, paymentMethodId, trackingTokenHash,
         checkoutIdempotencyKeyHash, status, paymentStatus, paymentMethodType,
         currencyCode, subtotalCents, adjustmentTotalCents, finalTotalCents,
         termsVersion, privacyPolicyVersion, createdAt, updatedAt)
       VALUES (?, 'TASK016-UPGRADE', ?, ?, ?, ?, 'AWAITING_PAYMENT',
        'AWAITING_INSTRUCTIONS', 'MANUAL_REVIEW', 'USD', 2200, 0, 2200,
        ?, ?, NOW(3), NOW(3))`,
      [
        orderId,
        contactId,
        method.id,
        hash("task016 upgrade tracking marker"),
        hash("task016 upgrade checkout marker"),
        settings.termsVersion,
        settings.privacyPolicyVersion,
      ],
    );
    await connection.query(
      `INSERT INTO OrderItem
        (id, orderId, kind, publicTitle, publicConfigurationSummary, quantity,
         currencyCode, priceLines, subtotalCents, adjustmentTotalCents,
         finalTotalCents, sourceReference, customerSafeSnapshot,
         resourceReservationState, createdAt)
       VALUES (?, ?, 'PRODUCT_ESTIMATE', 'Task 016 upgrade item',
        'Task 016 safe upgrade item snapshot.', 1, 'USD',
        JSON_ARRAY(JSON_OBJECT('label', 'Task 016 upgrade item',
          'amountCents', 2200)),
        2200, 0, 2200, 'task016-upgrade-source',
        JSON_OBJECT('task', '016', 'safe', true), 'NONE', NOW(3))`,
      [orderItemId, orderId],
    );
    await connection.query(
      `INSERT INTO CustomerOrderLink
        (id, userId, orderId, source, safeCreatedByContext, createdAt, updatedAt)
       VALUES (?, ?, ?, 'AUTHENTICATED_CHECKOUT', 'ci-task016-upgrade',
        NOW(3), NOW(3))`,
      [orderLinkId, customerId, orderId],
    );
    await connection.query(
      `INSERT INTO CustomerNotification
        (id, userId, orderId, type, status, title, body, dedupeKey,
         safeMetadata, createdAt, updatedAt)
       VALUES (?, ?, ?, 'ORDER_STATUS_CHANGED', 'UNREAD',
        'Task 016 upgrade notification',
        'Task 015-era notification preserved into Task 016.',
        'task016-upgrade-notification', JSON_OBJECT('safe', true),
        NOW(3), NOW(3))`,
      [notificationId, customerId, orderId],
    );
    await connection.query(
      `INSERT INTO ChatGuestSession
        (id, tokenHash, displayName, supportCategory, status, expiresAt,
         lastSeenAt, createdAt, updatedAt)
       VALUES (?, ?, 'Task 016 Upgrade Guest', 'Upgrade support',
        'ACTIVE', DATE_ADD(NOW(3), INTERVAL 1 DAY), NOW(3), NOW(3), NOW(3))`,
      [chatGuestId, hash("task016 upgrade chat token marker")],
    );
    await connection.query(
      `INSERT INTO ChatConversation
        (id, reference, guestSessionId, customerUserId, status, priority,
         assignedStaffId, lastPublicMessageAt, concurrencyVersion,
         createdAt, updatedAt)
       VALUES (?, 'TASK016-UPGRADE-CHAT', ?, NULL, 'QUEUED', 'NORMAL',
        NULL, NOW(3), 1, NOW(3), NOW(3))`,
      [chatConversationId, chatGuestId],
    );
    await connection.query(
      `INSERT INTO ChatMessage
        (id, conversationId, sequence, participantType, messageType,
         guestSessionId, body, idempotencyKeyHash, concurrencyVersion, createdAt)
       VALUES (?, ?, 1, 'GUEST', 'PUBLIC', ?,
        'Task 016 upgrade chat preservation message.',
        ?, 1, NOW(3))`,
      [
        chatMessageId,
        chatConversationId,
        chatGuestId,
        hash("task016 upgrade message idempotency marker"),
      ],
    );
    await connection.query(
      `INSERT INTO ChatConversationEvent
        (id, conversationId, eventType, actorType, reasonCode, sequence,
         safeMetadata, createdAt)
       VALUES (?, ?, 'MESSAGE_CREATED', 'GUEST', 'TASK016_UPGRADE',
        1, JSON_OBJECT('safe', true), NOW(3))`,
      [chatEventId, chatConversationId],
    );
    await connection.query(
      `INSERT INTO ChatReadCursor
        (id, conversationId, participantType, guestSessionId,
         lastReadSequence, createdAt, updatedAt)
       VALUES (?, ?, 'GUEST', ?, 1, NOW(3), NOW(3))`,
      [chatCursorId, chatConversationId, chatGuestId],
    );
    console.log("Task 015 preservation fixtures prepared.");
  } finally {
    await connection.end();
  }
}

async function snapshot() {
  const connection = await connect();
  try {
    const tables: Record<string, TableSnapshot> = {};
    for (const tableName of await tableNames(connection)) {
      const keyFields = await primaryKeyFields(connection, tableName);
      const columns = await tableColumns(connection, tableName);
      tables[tableName] = createSnapshot(
        tableName,
        keyFields,
        columns,
        await tableRows(connection, tableName, keyFields),
      );
    }
    const markerFile: MarkerFile = {
      version: 1,
      source: "task015",
      createdBy: "scripts/validate-task016-existing-db.ts",
      tables,
    };
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(markerPath, JSON.stringify(markerFile, null, 2), "utf8");
    console.log(`Task 015 preservation markers written to ${markerPath}`);
  } finally {
    await connection.end();
  }
}

async function cleanupTask016Fixtures(connection: Connection) {
  await connection.query("DELETE FROM EmailDelivery WHERE id = ?", [
    emailDeliveryId,
  ]);
  await connection.query("DELETE FROM PaymentTransactionEvent WHERE id = ?", [
    transactionEventId,
  ]);
  await connection.query("DELETE FROM PaymentTransaction WHERE id = ?", [
    transactionId,
  ]);
}

async function prepareTask016Fixtures() {
  const connection = await connect();
  try {
    await cleanupTask016Fixtures(connection);
    const template = (
      await rows<{ id: string }>(
        connection,
        "SELECT id FROM EmailTemplate WHERE templateType = 'ORDER_CONFIRMATION' ORDER BY createdAt LIMIT 1",
      )
    )[0];
    await connection.query(
      `INSERT INTO PaymentTransaction
        (id, orderId, provider, transactionType, status, currencyCode,
         amountMinor, idempotencyKeyHash, safeMetadata, createdAt, updatedAt)
       VALUES (?, ?, 'MANUAL_REVIEW', 'MANUAL_CONFIRMATION', 'PENDING',
        'USD', 2200, ?, JSON_OBJECT('upgradeFixture', true),
        NOW(3), NOW(3))`,
      [transactionId, orderId, hash("task016 upgrade payment idem")],
    );
    await connection.query(
      `INSERT INTO PaymentTransactionEvent
        (id, transactionId, previousStatus, newStatus, eventType, sequence,
         source, safeMetadata, createdAt)
       VALUES (?, ?, NULL, 'PENDING', 'UPGRADE_FIXTURE_CREATED', 1,
        'TASK016_UPGRADE', JSON_OBJECT('safe', true), NOW(3))`,
      [transactionEventId, transactionId],
    );
    await connection.query(
      `INSERT INTO EmailDelivery
        (id, templateId, templateType, transport, status, dedupeKey,
         recipientHash, orderId, subject, safeMetadata, createdAt, updatedAt)
       VALUES (?, ?, 'ORDER_CONFIRMATION', 'SMTP', 'SUPPRESSED_DISABLED',
        'task016-upgrade-email', ?, ?, 'Order TASK016-UPGRADE received',
        JSON_OBJECT('upgradeFixture', true), NOW(3), NOW(3))`,
      [
        emailDeliveryId,
        template?.id ?? null,
        hash("task016-upgrade@example.test"),
        orderId,
      ],
    );
    console.log("Task 016 preservation fixtures prepared.");
  } finally {
    await connection.end();
  }
}

async function newTableCount(connection: Connection) {
  const placeholders = task016Tables.map(() => "?").join(", ");
  const result = await rows<{ value: number }>(
    connection,
    `SELECT COUNT(*) AS value
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    [...task016Tables],
  );
  return asNumber(result[0]?.value);
}

async function flagValue(connection: Connection, key: string) {
  const result = await rows<{ enabled: number | boolean }>(
    connection,
    "SELECT enabled FROM FeatureFlag WHERE `key` = ? LIMIT 1",
    [key],
  );
  return Boolean(result[0]?.enabled);
}

async function verify() {
  const markerFile = JSON.parse(
    await readFile(markerPath, "utf8"),
  ) as MarkerFile;
  const connection = await connect();
  try {
    const changed: string[] = [];
    for (const [tableName, snapshotRecord] of Object.entries(
      markerFile.tables,
    )) {
      const current = await tableRows(
        connection,
        tableName,
        snapshotRecord.keyFields,
      );
      const preserved = preservedRows(current, snapshotRecord);
      const currentFingerprint = fingerprint(
        preserved,
        snapshotRecord.keyFields,
      );
      if (currentFingerprint !== snapshotRecord.fingerprint) {
        changed.push(tableName);
      }
    }
    if (changed.length) {
      throw new Error(`Preserved Task 015 rows changed: ${changed.join(", ")}`);
    }

    const migration = (
      await rows<{ migration_name: string }>(
        connection,
        `SELECT migration_name
         FROM _prisma_migrations
         WHERE migration_name = ?
         LIMIT 1`,
        [task016MigrationName],
      )
    )[0];
    const tablesAdded = await newTableCount(connection);
    const enabledPaymentFlagCount = (
      await Promise.all([
        flagValue(connection, "external_payments_enabled"),
        flagValue(connection, "payment_webhooks_enabled"),
        flagValue(connection, "payment_refunds_enabled"),
      ])
    ).filter(Boolean).length;
    const manualMethodCount = await count(
      connection,
      "CheckoutPaymentMethod",
      "WHERE stableKey = 'manual-review' AND methodType = 'MANUAL_REVIEW' AND providerType = 'MANUAL_REVIEW' AND enabled = 1",
    );
    const testHostedEnabledCount = await count(
      connection,
      "CheckoutPaymentMethod",
      "WHERE providerType = 'TEST_HOSTED' AND enabled = 1",
    );
    const providerCount = await count(
      connection,
      "PaymentProviderConfiguration",
    );
    const eligibilityCount = await count(connection, "PaymentEligibilityRule");
    const emailTemplateCount = await count(connection, "EmailTemplate");
    const readinessCount = await count(
      connection,
      "ProductionReadinessSetting",
    );
    const preservedOrderCount = await count(
      connection,
      "Order",
      "WHERE id = ? AND orderNumber = 'TASK016-UPGRADE'",
      [orderId],
    );
    const preservedChatCount = await count(
      connection,
      "ChatConversation",
      "WHERE id = ? AND reference = 'TASK016-UPGRADE-CHAT'",
      [chatConversationId],
    );
    const paymentFixtureCount = await count(
      connection,
      "PaymentTransaction",
      "WHERE id = ? AND orderId = ? AND provider = 'MANUAL_REVIEW'",
      [transactionId, orderId],
    );
    const emailFixtureCount = await count(
      connection,
      "EmailDelivery",
      "WHERE id = ? AND dedupeKey = 'task016-upgrade-email'",
      [emailDeliveryId],
    );

    if (!migration) throw new Error("Task 016 migration is not applied.");
    if (
      tablesAdded !== task016Tables.length ||
      enabledPaymentFlagCount !== 0 ||
      manualMethodCount !== 1 ||
      testHostedEnabledCount !== 0 ||
      providerCount < 2 ||
      eligibilityCount < 1 ||
      emailTemplateCount < 6 ||
      readinessCount < 8 ||
      preservedOrderCount !== 1 ||
      preservedChatCount !== 1 ||
      paymentFixtureCount !== 1 ||
      emailFixtureCount !== 1
    ) {
      throw new Error("Task 015 to Task 016 upgrade checks failed.");
    }

    const report = [
      "Task 015 to Task 016 upgrade validation",
      "",
      `Preserved Task 015 table count: ${Object.keys(markerFile.tables).length}`,
      `Preserved Task 015 row count: ${Object.values(markerFile.tables).reduce(
        (total, snapshotRecord) => total + snapshotRecord.count,
        0,
      )}`,
      `Task 016 migration present: ${Boolean(migration)}`,
      `Task 016 new table count: ${tablesAdded}`,
      `Enabled Task 016 payment feature-flag count: ${enabledPaymentFlagCount}`,
      `Manual payment method preserved count: ${manualMethodCount}`,
      `TEST_HOSTED enabled method count: ${testHostedEnabledCount}`,
      `Provider configuration count: ${providerCount}`,
      `Payment eligibility rule count: ${eligibilityCount}`,
      `Email template count: ${emailTemplateCount}`,
      `Production readiness setting count: ${readinessCount}`,
      `Preserved Task 015 order fixture count: ${preservedOrderCount}`,
      `Preserved Task 015 chat fixture count: ${preservedChatCount}`,
      `Preserved Task 016 payment fixture count: ${paymentFixtureCount}`,
      `Preserved Task 016 email fixture count: ${emailFixtureCount}`,
      "",
      "Task 016 migration and seed are additive over a populated Task 015 database, while newly created payment and email records survive a seed rerun.",
      "No database URLs, passwords, hashes, raw tokens, emails beyond example.test fixtures, provider secrets, SMTP passwords, card fields or raw webhook payloads are included in this report.",
      "",
    ].join("\n");
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(reportPath, report, "utf8");
    console.log(report);
  } finally {
    await connection.end();
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === "prepare-task015") {
    await prepareTask015Fixtures();
  } else if (mode === "snapshot") {
    await snapshot();
  } else if (mode === "prepare-task016") {
    await prepareTask016Fixtures();
  } else if (mode === "verify") {
    await verify();
  } else {
    throw new Error(
      "Usage: tsx scripts/validate-task016-existing-db.ts prepare-task015|snapshot|prepare-task016|verify",
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
