import { createHash } from "node:crypto";

import { expect, test, type BrowserContext } from "@playwright/test";
import mariadb from "mariadb";

async function databaseRows<T extends Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
) {
  const connection = await mariadb.createConnection({
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    allowPublicKeyRetrieval:
      process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === "true",
  });
  try {
    return (await connection.query(sql, values)) as T[];
  } finally {
    await connection.end();
  }
}

function suffixForProject(projectName: string) {
  return projectName.includes("mobile") ? "mob" : "desk";
}

function deriveToken(label: string) {
  return createHash("sha256").update(label, "utf8").digest("base64url");
}

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function itemSnapshot(title: string, totalCents: number) {
  return JSON.stringify({
    schemaVersion: 1,
    itemKind: "SKILLING_ESTIMATE",
    compatibilityGroup: "STANDARD_SERVICE",
    publicTitle: title,
    publicDescription: "Task 016 E2E checkout item",
    publicConfigurationSummary: "Hosted checkout preview without card fields",
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

async function addCartCookie(context: BrowserContext, token: string) {
  await context.addCookies([
    {
      name: "osrs_guest_cart",
      value: token,
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function prepareCheckoutFixture(tag: string) {
  const cartId = `t016e2e${tag}cart`;
  const itemId = `t016e2e${tag}item`;
  const token = deriveToken(`task016 ${tag} checkout cart`);
  await databaseRows("DELETE FROM CartItem WHERE id = ?", [itemId]);
  await databaseRows("DELETE FROM Cart WHERE id = ?", [cartId]);
  await databaseRows(
    "UPDATE FeatureFlag SET enabled = 1 WHERE `key` IN ('cart_enabled', 'guest_checkout_enabled', 'external_payments_enabled')",
  );
  await databaseRows(
    `UPDATE CheckoutSettings
     SET guestCheckoutEnabled = 1, needsClientReview = 0
     WHERE stableKey = 'checkout-default-settings'`,
  );
  await databaseRows(
    "UPDATE CheckoutPaymentMethod SET enabled = 1 WHERE stableKey IN ('manual-review', 'test-hosted-checkout')",
  );
  await databaseRows(
    `INSERT INTO Cart
      (id, tokenHash, status, compatibilityGroup, currencyCode,
       subtotalCents, adjustmentTotalCents, finalTotalCents, itemCount,
       expiresAt, createdAt, updatedAt)
     VALUES (?, ?, 'ACTIVE', 'STANDARD_SERVICE', 'USD',
       2800, 0, 2800, 1, DATE_ADD(NOW(3), INTERVAL 2 HOUR), NOW(3), NOW(3))`,
    [cartId, hash(token)],
  );
  await databaseRows(
    `INSERT INTO CartItem
      (id, cartId, kind, compatibilityGroup, sourceReference, publicSourceSlug,
       quantity, currencyCode, customerSelections, customerSafeSnapshot,
       subtotalCents, adjustmentTotalCents, finalTotalCents, validationState,
       createdAt, updatedAt)
     VALUES (?, ?, 'SKILLING_ESTIMATE', 'STANDARD_SERVICE',
       'task016-e2e-skilling', 'task016-e2e-checkout', 1, 'USD',
       JSON_OBJECT('e2e', true), ?, 2800, 0, 2800, 'VALID', NOW(3), NOW(3))`,
    [itemId, cartId, itemSnapshot("Task 016 E2E checkout", 2800)],
  );
  return token;
}

async function preparePaymentFixture(tag: string) {
  const contactId = `t016e2e${tag}contact`;
  const orderId = `t016e2e${tag}order`;
  const itemId = `t016e2e${tag}orderitem`;
  const transactionId = `t016e2e${tag}txn`;
  await databaseRows(
    "DELETE FROM PaymentWebhookEvent WHERE transactionId = ? OR orderId = ?",
    [transactionId, orderId],
  );
  await databaseRows(
    "DELETE FROM PaymentTransactionEvent WHERE transactionId = ?",
    [transactionId],
  );
  await databaseRows("DELETE FROM PaymentTransaction WHERE id = ?", [
    transactionId,
  ]);
  await databaseRows("DELETE FROM OrderPaymentEvent WHERE orderId = ?", [
    orderId,
  ]);
  await databaseRows("DELETE FROM OrderStatusEvent WHERE orderId = ?", [
    orderId,
  ]);
  await databaseRows("DELETE FROM OrderItem WHERE id = ?", [itemId]);
  await databaseRows("DELETE FROM `Order` WHERE id = ?", [orderId]);
  await databaseRows("DELETE FROM GuestOrderContact WHERE id = ?", [contactId]);

  const settings = (
    await databaseRows<{
      termsVersion: string;
      privacyPolicyVersion: string;
    }>(
      "SELECT termsVersion, privacyPolicyVersion FROM CheckoutSettings WHERE stableKey = 'checkout-default-settings' LIMIT 1",
    )
  )[0];
  const method = (
    await databaseRows<{ id: string }>(
      "SELECT id FROM CheckoutPaymentMethod WHERE stableKey = 'test-hosted-checkout' LIMIT 1",
    )
  )[0];
  if (!settings || !method) {
    throw new Error("Task 016 E2E payment fixture seed rows are missing.");
  }
  await databaseRows(
    `INSERT INTO GuestOrderContact
      (id, displayName, email, consentAt, termsVersion,
       privacyPolicyVersion, createdAt)
     VALUES (?, 'Task 016 E2E Customer',
       'task016-e2e@example.test', NOW(3), ?, ?, NOW(3))`,
    [contactId, settings.termsVersion, settings.privacyPolicyVersion],
  );
  await databaseRows(
    `INSERT INTO \`Order\`
      (id, orderNumber, guestContactId, paymentMethodId, trackingTokenHash,
       checkoutIdempotencyKeyHash, status, paymentStatus, paymentMethodType,
       paymentProvider, currencyCode, subtotalCents, adjustmentTotalCents,
       finalTotalCents, termsVersion, privacyPolicyVersion, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'AWAITING_PAYMENT', 'AWAITING_PAYMENT',
       'EXTERNAL_HOSTED_CHECKOUT', 'TEST_HOSTED', 'USD', 2800, 0, 2800,
       ?, ?, NOW(3), NOW(3))`,
    [
      orderId,
      `T016-E2E-${tag.toUpperCase()}`,
      contactId,
      method.id,
      hash(`task016 ${tag} tracking`),
      hash(`task016 ${tag} checkout`),
      settings.termsVersion,
      settings.privacyPolicyVersion,
    ],
  );
  await databaseRows(
    `INSERT INTO OrderItem
      (id, orderId, kind, publicTitle, publicConfigurationSummary, quantity,
       currencyCode, priceLines, subtotalCents, adjustmentTotalCents,
       finalTotalCents, sourceReference, customerSafeSnapshot,
       resourceReservationState, createdAt)
     VALUES (?, ?, 'SKILLING_ESTIMATE', 'Task 016 E2E payment',
       'Hosted checkout webhook validation fixture.', 1, 'USD',
       JSON_ARRAY(JSON_OBJECT('label', 'Task 016 E2E payment',
       'amountCents', 2800)), 2800, 0, 2800, 'task016-e2e-payment',
       JSON_OBJECT('safe', true), 'NONE', NOW(3))`,
    [itemId, orderId],
  );
  await databaseRows(
    `INSERT INTO OrderPaymentEvent
      (orderId, previousPaymentStatus, newPaymentStatus, paymentMethodType,
       publicNote, reasonCode, sequence, createdAt)
     VALUES (?, NULL, 'AWAITING_PAYMENT', 'EXTERNAL_HOSTED_CHECKOUT',
       'Hosted checkout is pending provider verification.',
       'TASK016_E2E', 1, NOW(3))`,
    [orderId],
  );
  await databaseRows(
    `INSERT INTO PaymentTransaction
      (id, orderId, provider, providerCheckoutId, transactionType, status,
       currencyCode, amountMinor, idempotencyKeyHash, safeMetadata,
       createdAt, updatedAt)
     VALUES (?, ?, 'TEST_HOSTED', ?, 'PAYMENT', 'REQUIRES_CUSTOMER_ACTION',
       'USD', 2800, ?, JSON_OBJECT('e2e', true), NOW(3), NOW(3))`,
    [
      transactionId,
      orderId,
      `test_ch_task016_${tag}`,
      hash(`task016 ${tag} payment idempotency`),
    ],
  );
  await databaseRows(
    `INSERT INTO PaymentTransactionEvent
      (transactionId, previousStatus, newStatus, eventType, sequence,
       source, safeMetadata, createdAt)
     VALUES (?, NULL, 'REQUIRES_CUSTOMER_ACTION',
       'HOSTED_CHECKOUT_SESSION_CREATED', 1, 'TASK016_E2E',
       JSON_OBJECT('safe', true), NOW(3))`,
    [transactionId],
  );
  return { transactionId, orderId };
}

test.describe("Task 016 payment launch readiness", () => {
  test("checkout shows hosted option, legal links, and no card fields", async ({
    context,
    page,
  }, testInfo) => {
    const tag = suffixForProject(testInfo.project.name);
    const token = await prepareCheckoutFixture(tag);
    await addCartCookie(context, token);

    await page.goto("/checkout");

    await expect(
      page.getByRole("heading", { name: "Guest checkout" }),
    ).toBeVisible();
    await expect(page.getByText("Manual review")).toBeVisible();
    await expect(page.getByText("Hosted checkout test mode")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Terms of Service" }),
    ).toHaveAttribute("href", "/terms");
    await expect(
      page.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    await expect(
      page.getByRole("link", { name: "Refund Policy" }),
    ).toHaveAttribute("href", "/refund-policy");
    await expect(page.getByLabel(/card number/i)).toHaveCount(0);
    await expect(page.getByLabel(/cvv|cvc/i)).toHaveCount(0);
  });

  test("TEST_HOSTED webhook fixture is flag-gated and server verified", async ({
    request,
  }, testInfo) => {
    const tag = suffixForProject(testInfo.project.name);
    const { transactionId, orderId } = await preparePaymentFixture(tag);
    await databaseRows(
      "UPDATE FeatureFlag SET enabled = 0 WHERE `key` = 'payment_webhooks_enabled'",
    );

    const ignored = await request.post("/api/payments/test-hosted/fixtures", {
      data: { transactionId, eventType: "payment.succeeded" },
    });
    expect(ignored.ok()).toBe(true);
    expect(await ignored.json()).toMatchObject({
      ok: true,
      webhook: { status: "IGNORED" },
    });
    expect(
      (
        await databaseRows<{ paymentStatus: string }>(
          "SELECT paymentStatus FROM `Order` WHERE id = ?",
          [orderId],
        )
      )[0]?.paymentStatus,
    ).toBe("AWAITING_PAYMENT");

    await databaseRows(
      "UPDATE FeatureFlag SET enabled = 1 WHERE `key` = 'payment_webhooks_enabled'",
    );
    const processed = await request.post("/api/payments/test-hosted/fixtures", {
      data: { transactionId, eventType: "payment.succeeded" },
    });
    expect(processed.ok()).toBe(true);
    expect(await processed.json()).toMatchObject({
      ok: true,
      webhook: { status: "PROCESSED" },
    });

    const order = (
      await databaseRows<{ paymentStatus: string }>(
        "SELECT paymentStatus FROM `Order` WHERE id = ?",
        [orderId],
      )
    )[0];
    const paidEvents = (
      await databaseRows<{ value: number }>(
        "SELECT COUNT(*) AS value FROM OrderPaymentEvent WHERE orderId = ? AND newPaymentStatus = 'PAID'",
        [orderId],
      )
    )[0];
    expect(order?.paymentStatus).toBe("PAID");
    expect(Number(paidEvents?.value ?? 0)).toBe(1);
  });
});
