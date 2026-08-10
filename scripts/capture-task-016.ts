import "dotenv/config";

import { createHash, createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import mariadb, { type Connection } from "mariadb";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDirectory = path.join(process.cwd(), "artifacts", "task-016");
const cartToken = deriveToken("task016 screenshot cart token");
const customerSessionToken = deriveToken("task016 screenshot customer session");
const staffSessionToken = deriveToken("task016 screenshot staff session");

const customerId = "task016shotcustomer";
const profileId = "task016shotprofile";
const customerSessionId = "task016shotcussession";
const staffSessionId = "task016shotstaffsess";
const contactId = "task016shotcontact";
const paidOrderId = "task016shotpaidorder";
const pendingOrderId = "task016shotpendorder";
const paidOrderItemId = "task016shotpaiditem";
const pendingOrderItemId = "task016shotpenditem";
const paidTransactionId = "task016shotpaidtxn";
const pendingTransactionId = "task016shotpendtxn";
const paidWebhookId = "task016shotwebhook";
const customerOrderLinkId = "task016shotlink";
const emailDeliveryId = "task016shotemail";
const cartId = "task016shotcart";
const cartItemId = "task016shotcartitem";

const flagKeys = [
  "cart_enabled",
  "guest_checkout_enabled",
  "external_payments_enabled",
  "payment_webhooks_enabled",
  "payment_refunds_enabled",
  "customer_accounts_enabled",
  "customer_dashboard_enabled",
] as const;

type FlagSnapshot = Map<string, boolean>;

function deriveToken(label: string) {
  return createHash("sha256").update(label, "utf8").digest("base64url");
}

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(value: string) {
  return createHmac("sha256", requiredEnv("AUTH_SECRET"))
    .update(value, "utf8")
    .digest("hex");
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

async function connectDatabase() {
  return mariadb.createConnection({
    host: requiredEnv("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: requiredEnv("DATABASE_USER"),
    password: requiredEnv("DATABASE_PASSWORD"),
    database: requiredEnv("DATABASE_NAME"),
    allowPublicKeyRetrieval:
      process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === "true",
  });
}

async function rows<T>(
  connection: Connection,
  sql: string,
  values: unknown[] = [],
) {
  return (await connection.query(sql, values)) as T[];
}

function requiredRow<T>(result: T[], description: string) {
  const row = result[0];
  if (!row) throw new Error(`Expected ${description} for Task 016 setup.`);
  return row;
}

async function snapshotFlags(connection: Connection) {
  const result = await rows<{ key: string; enabled: boolean | number }>(
    connection,
    `SELECT \`key\`, enabled
     FROM FeatureFlag
     WHERE \`key\` IN (${flagKeys.map(() => "?").join(", ")})`,
    [...flagKeys],
  );
  return new Map(result.map((row) => [row.key, Boolean(row.enabled)]));
}

async function restoreFlags(snapshot: FlagSnapshot) {
  const connection = await connectDatabase();
  try {
    for (const [key, enabled] of snapshot) {
      await connection.query(
        "UPDATE FeatureFlag SET enabled = ? WHERE `key` = ?",
        [enabled ? 1 : 0, key],
      );
    }
  } finally {
    await connection.end();
  }
}

function itemSnapshot({
  title,
  totalCents,
}: {
  title: string;
  totalCents: number;
}) {
  return JSON.stringify({
    schemaVersion: 1,
    itemKind: "SKILLING_ESTIMATE",
    compatibilityGroup: "STANDARD_SERVICE",
    publicTitle: title,
    publicDescription: "Task 016 screenshot checkout item",
    publicConfigurationSummary:
      "Agility training preview with hosted checkout under review",
    quantity: "1",
    currency: "USD",
    authoritativeLineItems: [{ label: title, amountCents: totalCents }],
    subtotalCents: totalCents,
    customerSafeGlobalPricingLines: [],
    finalEstimatedTotalCents: totalCents,
    sourceRevision: { id: null, revisionNumber: null },
    generatedAt: "2026-08-10T15:00:00.000Z",
    repricingRequired: false,
    reservationRequired: false,
  });
}

async function cleanup(connection: Connection) {
  await connection.query("DELETE FROM EmailDelivery WHERE id = ?", [
    emailDeliveryId,
  ]);
  await connection.query("DELETE FROM PaymentWebhookEvent WHERE id = ?", [
    paidWebhookId,
  ]);
  await connection.query(
    "DELETE FROM PaymentTransactionEvent WHERE transactionId IN (?, ?)",
    [paidTransactionId, pendingTransactionId],
  );
  await connection.query(
    "DELETE FROM PaymentRefund WHERE transactionId IN (?, ?)",
    [paidTransactionId, pendingTransactionId],
  );
  await connection.query("DELETE FROM PaymentTransaction WHERE id IN (?, ?)", [
    paidTransactionId,
    pendingTransactionId,
  ]);
  await connection.query("DELETE FROM CustomerNotification WHERE userId = ?", [
    customerId,
  ]);
  await connection.query("DELETE FROM CustomerOrderLink WHERE id = ?", [
    customerOrderLinkId,
  ]);
  await connection.query(
    "DELETE FROM OrderPaymentEvent WHERE orderId IN (?, ?)",
    [paidOrderId, pendingOrderId],
  );
  await connection.query(
    "DELETE FROM OrderStatusEvent WHERE orderId IN (?, ?)",
    [paidOrderId, pendingOrderId],
  );
  await connection.query("DELETE FROM OrderItem WHERE id IN (?, ?)", [
    paidOrderItemId,
    pendingOrderItemId,
  ]);
  await connection.query("DELETE FROM `Order` WHERE id IN (?, ?)", [
    paidOrderId,
    pendingOrderId,
  ]);
  await connection.query("DELETE FROM GuestOrderContact WHERE id = ?", [
    contactId,
  ]);
  await connection.query("DELETE FROM CartItem WHERE id = ?", [cartItemId]);
  await connection.query("DELETE FROM Cart WHERE id = ?", [cartId]);
  await connection.query("DELETE FROM Session WHERE id IN (?, ?)", [
    customerSessionId,
    staffSessionId,
  ]);
  await connection.query("DELETE FROM CustomerProfile WHERE userId = ?", [
    customerId,
  ]);
  await connection.query("DELETE FROM UserRole WHERE userId = ?", [customerId]);
  await connection.query("DELETE FROM User WHERE id = ?", [customerId]);
}

async function prepareRows(connection: Connection) {
  await cleanup(connection);
  const settings = requiredRow(
    await rows<{
      id: string;
      termsVersion: string;
      privacyPolicyVersion: string;
    }>(
      connection,
      `SELECT id, termsVersion, privacyPolicyVersion
       FROM CheckoutSettings
       WHERE stableKey = 'checkout-default-settings'
       LIMIT 1`,
    ),
    "checkout settings",
  );
  const manualMethod = requiredRow(
    await rows<{ id: string }>(
      connection,
      "SELECT id FROM CheckoutPaymentMethod WHERE stableKey = 'manual-review' LIMIT 1",
    ),
    "manual review payment method",
  );
  const testHostedMethod = requiredRow(
    await rows<{ id: string }>(
      connection,
      "SELECT id FROM CheckoutPaymentMethod WHERE stableKey = 'test-hosted-checkout' LIMIT 1",
    ),
    "TEST_HOSTED payment method",
  );
  const staff = requiredRow(
    await rows<{ id: string }>(
      connection,
      "SELECT id FROM User WHERE accountType = 'STAFF' ORDER BY createdAt LIMIT 1",
    ),
    "seeded staff user",
  );
  const template = (
    await rows<{ id: string }>(
      connection,
      "SELECT id FROM EmailTemplate WHERE templateType = 'ORDER_CONFIRMATION' ORDER BY createdAt LIMIT 1",
    )
  )[0];

  await connection.query(
    `UPDATE FeatureFlag
     SET enabled = 1
     WHERE \`key\` IN (${flagKeys.map(() => "?").join(", ")})`,
    [...flagKeys],
  );
  await connection.query(
    `UPDATE CheckoutSettings
     SET guestCheckoutEnabled = 1, needsClientReview = 0
     WHERE id = ?`,
    [settings.id],
  );
  await connection.query(
    `UPDATE CheckoutPaymentMethod
     SET enabled = 1, needsClientReview = CASE stableKey
       WHEN 'manual-review' THEN 0
       ELSE needsClientReview
     END
     WHERE stableKey IN ('manual-review', 'test-hosted-checkout')`,
  );
  await connection.query(
    `UPDATE CustomerAccountSettings
     SET dashboardEnabled = 1, needsClientReview = 0
     WHERE stableKey = 'customer-accounts-default-settings'`,
  );

  const snapshot = itemSnapshot({
    title: "Task 016 hosted checkout preview",
    totalCents: 3200,
  });
  await connection.query(
    `INSERT INTO Cart
      (id, tokenHash, status, compatibilityGroup, currencyCode,
       subtotalCents, adjustmentTotalCents, finalTotalCents, itemCount,
       expiresAt, createdAt, updatedAt)
     VALUES (?, ?, 'ACTIVE', 'STANDARD_SERVICE', 'USD',
       3200, 0, 3200, 1, DATE_ADD(NOW(3), INTERVAL 2 HOUR), NOW(3), NOW(3))`,
    [cartId, hash(cartToken)],
  );
  await connection.query(
    `INSERT INTO CartItem
      (id, cartId, kind, compatibilityGroup, sourceReference, publicSourceSlug,
       quantity, currencyCode, customerSelections, customerSafeSnapshot,
       subtotalCents, adjustmentTotalCents, finalTotalCents, validationState,
       createdAt, updatedAt)
     VALUES (?, ?, 'SKILLING_ESTIMATE', 'STANDARD_SERVICE',
       'task016-screenshot-skilling', 'task016-hosted-checkout-preview',
       1, 'USD', JSON_OBJECT('screenshot', true), ?, 3200, 0, 3200,
       'VALID', NOW(3), NOW(3))`,
    [cartItemId, cartId, snapshot],
  );

  await connection.query(
    `INSERT INTO User
      (id, email, name, passwordHash, status, accountType, createdAt, updatedAt)
     VALUES (?, 'task016-screenshot-customer@example.test',
      'Task 016 Screenshot Customer', ?, 'ACTIVE', 'CUSTOMER', NOW(3), NOW(3))`,
    [customerId, hash("task016 screenshot customer password marker")],
  );
  await connection.query(
    `INSERT INTO CustomerProfile
      (id, userId, displayName, defaultRsn, timezone, locale,
       emailVerificationStatus, registrationSource, needsReview, termsVersion,
       privacyPolicyVersion, termsAcceptedAt, privacyAcceptedAt,
       createdAt, updatedAt)
     VALUES (?, ?, 'Task 016 Screenshot Customer', 'Task016', 'UTC', 'en-US',
      'VERIFIED', 'CI_SCREENSHOT', 1, ?, ?, NOW(3), NOW(3), NOW(3), NOW(3))`,
    [
      profileId,
      customerId,
      settings.termsVersion,
      settings.privacyPolicyVersion,
    ],
  );
  await connection.query(
    `INSERT INTO Session
      (id, sessionToken, userId, audience, expires, createdAt, lastSeenAt)
     VALUES (?, ?, ?, 'CUSTOMER', DATE_ADD(NOW(3), INTERVAL 1 DAY),
      NOW(3), NOW(3)),
      (?, ?, ?, 'STAFF', DATE_ADD(NOW(3), INTERVAL 1 DAY), NOW(3), NOW(3))`,
    [
      customerSessionId,
      hmac(customerSessionToken),
      customerId,
      staffSessionId,
      hmac(staffSessionToken),
      staff.id,
    ],
  );
  await connection.query(
    `INSERT INTO GuestOrderContact
      (id, displayName, email, discordUsername, rsn, consentAt,
       termsVersion, privacyPolicyVersion, createdAt)
     VALUES (?, 'Task 016 Screenshot Customer',
       'task016-screenshot-customer@example.test', 'task016.screenshot',
       'Task016', NOW(3), ?, ?, NOW(3))`,
    [contactId, settings.termsVersion, settings.privacyPolicyVersion],
  );
  await connection.query(
    `INSERT INTO \`Order\`
      (id, orderNumber, guestContactId, paymentMethodId, trackingTokenHash,
       checkoutIdempotencyKeyHash, status, paymentStatus, paymentMethodType,
       paymentProvider, currencyCode, subtotalCents, adjustmentTotalCents,
       finalTotalCents, termsVersion, privacyPolicyVersion, createdAt, updatedAt)
     VALUES (?, 'TASK016-SHOT', ?, ?, ?, ?, 'IN_PROGRESS', 'PAID',
       'EXTERNAL_HOSTED_CHECKOUT', 'TEST_HOSTED', 'USD', 6400, 0, 6400,
       ?, ?, NOW(3), NOW(3)),
       (?, 'TASK016-PENDING', ?, ?, ?, ?, 'AWAITING_PAYMENT',
       'AWAITING_PAYMENT', 'EXTERNAL_HOSTED_CHECKOUT', 'TEST_HOSTED',
       'USD', 3200, 0, 3200, ?, ?, NOW(3), NOW(3))`,
    [
      paidOrderId,
      contactId,
      testHostedMethod.id,
      hash("task016 screenshot paid tracking"),
      hash("task016 screenshot paid checkout"),
      settings.termsVersion,
      settings.privacyPolicyVersion,
      pendingOrderId,
      contactId,
      testHostedMethod.id,
      hash("task016 screenshot pending tracking"),
      hash("task016 screenshot pending checkout"),
      settings.termsVersion,
      settings.privacyPolicyVersion,
    ],
  );
  await connection.query(
    `INSERT INTO OrderItem
      (id, orderId, kind, publicTitle, publicConfigurationSummary, quantity,
       currencyCode, priceLines, subtotalCents, adjustmentTotalCents,
       finalTotalCents, sourceReference, publicSourceSlug,
       customerSafeSnapshot, resourceReservationState, createdAt)
     VALUES (?, ?, 'SKILLING_ESTIMATE', 'Task 016 launch package',
       'Customer-safe payment readiness order with no account credentials.',
       1, 'USD', JSON_ARRAY(JSON_OBJECT('label', 'Task 016 launch package',
       'amountCents', 6400)), 6400, 0, 6400, 'task016-shot-paid',
       'task016-launch-package', JSON_OBJECT('task', '016', 'safe', true),
       'NONE', NOW(3)),
       (?, ?, 'SKILLING_ESTIMATE', 'Task 016 hosted checkout preview',
       'Customer-safe pending hosted checkout preview.',
       1, 'USD', JSON_ARRAY(JSON_OBJECT('label', 'Task 016 preview',
       'amountCents', 3200)), 3200, 0, 3200, 'task016-shot-pending',
       'task016-hosted-checkout-preview', JSON_OBJECT('task', '016', 'safe', true),
       'NONE', NOW(3))`,
    [paidOrderItemId, paidOrderId, pendingOrderItemId, pendingOrderId],
  );
  await connection.query(
    `INSERT INTO OrderStatusEvent
      (orderId, eventType, previousStatus, newStatus, publicNote,
       reasonCode, sequence, createdAt)
     VALUES (?, 'CREATED', NULL, 'AWAITING_PAYMENT',
       'Order received for hosted payment verification.',
       'TASK016_SCREENSHOT', 1, NOW(3)),
       (?, 'STATUS_CHANGED', 'AWAITING_PAYMENT', 'IN_PROGRESS',
       'Payment is verified and fulfillment review has started.',
       'TASK016_SCREENSHOT', 2, NOW(3)),
       (?, 'CREATED', NULL, 'AWAITING_PAYMENT',
       'Order is waiting for hosted payment verification.',
       'TASK016_SCREENSHOT', 1, NOW(3))`,
    [paidOrderId, paidOrderId, pendingOrderId],
  );
  await connection.query(
    `INSERT INTO OrderPaymentEvent
      (orderId, previousPaymentStatus, newPaymentStatus, paymentMethodType,
       publicNote, reasonCode, sequence, createdAt)
     VALUES (?, NULL, 'AWAITING_PAYMENT', 'EXTERNAL_HOSTED_CHECKOUT',
       'Hosted checkout was selected.', 'TASK016_SCREENSHOT', 1, NOW(3)),
       (?, 'AWAITING_PAYMENT', 'PAID', 'EXTERNAL_HOSTED_CHECKOUT',
       'Payment was verified by the provider.', 'TASK016_SCREENSHOT', 2, NOW(3)),
       (?, NULL, 'AWAITING_PAYMENT', 'EXTERNAL_HOSTED_CHECKOUT',
       'Hosted checkout is pending provider verification.',
       'TASK016_SCREENSHOT', 1, NOW(3))`,
    [paidOrderId, paidOrderId, pendingOrderId],
  );
  await connection.query(
    `INSERT INTO PaymentTransaction
      (id, orderId, provider, providerPaymentId, providerCheckoutId,
       transactionType, status, currencyCode, amountMinor,
       idempotencyKeyHash, safeMetadata, paidAt, createdAt, updatedAt)
     VALUES (?, ?, 'TEST_HOSTED', 'test_py_task016shotpaid',
       'test_ch_task016shotpaid', 'PAYMENT', 'PAID', 'USD', 6400,
       ?, JSON_OBJECT('fixture', true, 'externalNetworkCalls', false),
       NOW(3), NOW(3), NOW(3)),
       (?, ?, 'TEST_HOSTED', NULL, 'test_ch_task016shotpending',
       'PAYMENT', 'REQUIRES_CUSTOMER_ACTION', 'USD', 3200,
       ?, JSON_OBJECT('fixture', true, 'externalNetworkCalls', false),
       NULL, NOW(3), NOW(3))`,
    [
      paidTransactionId,
      paidOrderId,
      hash("task016 screenshot paid payment"),
      pendingTransactionId,
      pendingOrderId,
      hash("task016 screenshot pending payment"),
    ],
  );
  await connection.query(
    `INSERT INTO PaymentTransactionEvent
      (transactionId, previousStatus, newStatus, eventType, sequence,
       source, safeMetadata, createdAt)
     VALUES (?, NULL, 'REQUIRES_CUSTOMER_ACTION',
       'HOSTED_CHECKOUT_SESSION_CREATED', 1, 'TASK016_SCREENSHOT',
       JSON_OBJECT('safe', true), NOW(3)),
       (?, 'REQUIRES_CUSTOMER_ACTION', 'PAID', 'PAYMENT_SUCCEEDED',
       2, 'WEBHOOK', JSON_OBJECT('safe', true), NOW(3)),
       (?, NULL, 'REQUIRES_CUSTOMER_ACTION',
       'HOSTED_CHECKOUT_SESSION_CREATED', 1, 'TASK016_SCREENSHOT',
       JSON_OBJECT('safe', true), NOW(3))`,
    [paidTransactionId, paidTransactionId, pendingTransactionId],
  );
  await connection.query(
    `INSERT INTO PaymentWebhookEvent
      (id, provider, eventIdHash, eventType, status, signatureHash,
       transactionId, orderId, safePayload, receivedAt, processedAt,
       createdAt, updatedAt)
     VALUES (?, 'TEST_HOSTED', ?, 'payment.succeeded', 'PROCESSED',
       ?, ?, ?, JSON_OBJECT('eventType', 'payment.succeeded',
       'amountMinor', 6400, 'currency', 'USD'), NOW(3), NOW(3),
       NOW(3), NOW(3))`,
    [
      paidWebhookId,
      hash("task016 screenshot webhook event"),
      hash("task016 screenshot webhook signature"),
      paidTransactionId,
      paidOrderId,
    ],
  );
  await connection.query(
    `INSERT INTO CustomerOrderLink
      (id, userId, orderId, source, safeCreatedByContext, createdAt, updatedAt)
     VALUES (?, ?, ?, 'AUTHENTICATED_CHECKOUT', 'ci-task016-screenshot',
      NOW(3), NOW(3))`,
    [customerOrderLinkId, customerId, paidOrderId],
  );
  await connection.query(
    `INSERT INTO EmailDelivery
      (id, templateId, templateType, transport, status, dedupeKey,
       recipientHash, orderId, userId, subject, safeMetadata,
       createdAt, updatedAt)
     VALUES (?, ?, 'ORDER_CONFIRMATION', 'TEST_EMAIL', 'SENT',
       'task016-screenshot-order-confirmation', ?, ?, ?,
       'Order TASK016-SHOT received',
       JSON_OBJECT('fixture', true, 'externalCallCount', 0),
       NOW(3), NOW(3))`,
    [
      emailDeliveryId,
      template?.id ?? null,
      hash("task016-screenshot-customer@example.test"),
      paidOrderId,
      customerId,
    ],
  );

  await connection.query(
    `UPDATE CheckoutPaymentMethod
     SET enabled = 1
     WHERE id IN (?, ?)`,
    [manualMethod.id, testHostedMethod.id],
  );
}

async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");
  await page.addStyleTag({
    content: [
      "* { cursor: none !important; }",
      "html { scroll-behavior: auto !important; }",
      "a[href='#main-content'] { display: none !important; }",
      ".screenshot-sensitive { color: transparent !important; text-shadow: none !important; }",
      "header[class*='sticky'] { position: static !important; inset: auto !important; transform: none !important; }",
    ].join(" "),
  });
}

async function screenshot(page: Page, name: string) {
  await settle(page);
  await page.screenshot({
    path: path.join(outputDirectory, name),
    fullPage: false,
  });
}

async function addCartCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "osrs_guest_cart",
      value: cartToken,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function addCustomerCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: process.env.CUSTOMER_SESSION_COOKIE ?? "osrs_customer_session",
      value: customerSessionToken,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function addStaffCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: process.env.AUTH_SESSION_COOKIE ?? "osrs_session",
      value: staffSessionToken,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function capturePublic(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await addCartCookie(context);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/checkout`);
  await page.getByRole("heading", { name: "Guest checkout" }).waitFor();
  await screenshot(page, "public-checkout-payment-method-1440.png");

  await page.goto(
    `${baseUrl}/checkout/payment/${pendingTransactionId}/pending`,
  );
  await page
    .getByRole("heading", { name: "Payment verification pending" })
    .waitFor();
  await screenshot(page, "public-payment-pending-1440.png");

  await page.goto(`${baseUrl}/checkout/payment/${paidTransactionId}/success`);
  await page
    .getByRole("heading", { name: "Payment return received" })
    .waitFor();
  await screenshot(page, "public-payment-success-1440.png");
  await context.close();
}

async function captureMobile(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  await addCartCookie(context);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/checkout`);
  await page.getByRole("heading", { name: "Guest checkout" }).waitFor();
  await screenshot(page, "public-checkout-mobile-390.png");
  await context.close();
}

async function captureCustomer(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await addCustomerCookie(context);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/account/orders/TASK016-SHOT`);
  await page.getByRole("heading", { name: "TASK016-SHOT" }).waitFor();
  await screenshot(page, "customer-order-payment-1440.png");
  await context.close();
}

async function captureAdmin(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await addStaffCookie(context);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/admin/payments`);
  await page.getByRole("heading", { name: "Payments" }).waitFor();
  await screenshot(page, "admin-payments-overview-1440.png");

  await page.goto(`${baseUrl}/admin/payments/${paidTransactionId}`);
  await page.getByRole("heading", { name: paidTransactionId }).waitFor();
  await screenshot(page, "admin-payment-detail-1440.png");

  await page.goto(`${baseUrl}/admin/checkout/payment-eligibility`);
  await page.getByRole("heading", { name: "Payment eligibility" }).waitFor();
  await screenshot(page, "admin-payment-eligibility-1440.png");

  await page.goto(`${baseUrl}/admin/launch-readiness`);
  await page.getByRole("heading", { name: "Launch readiness" }).waitFor();
  await screenshot(page, "admin-launch-readiness-1440.png");

  await page.goto(`${baseUrl}/admin/checkout/email`);
  await page.getByRole("heading", { name: "Email delivery" }).waitFor();
  await screenshot(page, "admin-email-settings-status-1440.png");
  await context.close();
}

async function main() {
  const connection = await connectDatabase();
  let flagSnapshot: FlagSnapshot | null = null;
  let browser: Browser | null = null;
  try {
    flagSnapshot = await snapshotFlags(connection);
    await prepareRows(connection);
    await mkdir(outputDirectory, { recursive: true });
    browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    });
    await capturePublic(browser);
    await captureCustomer(browser);
    await captureMobile(browser);
    await captureAdmin(browser);
  } finally {
    await browser?.close();
    await connection.end();
    if (flagSnapshot) await restoreFlags(flagSnapshot);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
