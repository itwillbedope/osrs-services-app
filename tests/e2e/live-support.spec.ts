import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

test("/admin is the visible sign-in entry, with safe legacy deep links", async ({
  page,
}) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to continue" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.load("600 16px InterVariable"));
  expect(
    await page.evaluate(() => document.fonts.check("600 16px InterVariable")),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Sign in to continue" }),
  ).toHaveCSS("font-family", /InterVariable/);
  await expect(
    page.getByRole("navigation", { name: "Admin navigation" }),
  ).toHaveCount(0);
  await page.getByLabel("Email address or username").fill("missing@staff");
  await page
    .getByLabel("Password", { exact: true })
    .fill("wrong-test-password");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByTestId("login-error")).toContainText(
    "Username or password is incorrect.",
  );
  await page.goto("/login?next=/admin/users");
  await expect(page).toHaveURL(/\/admin\?next=%2Fadmin%2Fusers$/);
  await expect(page.locator('input[name="next"]')).toHaveValue("/admin/users");
  await page.goto("/login?next=https://evil.test");
  await expect(page).toHaveURL(/\/admin$/);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/admin-live-support/${test.info().project.name}-login.png`,
    fullPage: true,
  });
});

test("customer message alerts support, replies arrive automatically, and conversation recovers", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const fixtureFile = process.env.STAFF_QA_CREDENTIAL_FILE;
  test.skip(!fixtureFile, "Local staff fixtures required.");
  const staff = JSON.parse(readFileSync(fixtureFile!, "utf8")).chat;
  const staffContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const support = await staffContext.newPage();
  try {
    await support.goto("http://127.0.0.1:3000/admin");
    await support.getByLabel("Email address or username").fill(staff.email);
    await support.getByLabel("Password", { exact: true }).fill(staff.password);
    const initialFeed = support.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/chat/conversations") &&
        response.request().method() === "GET",
    );
    await support.getByRole("button", { name: "Sign in securely" }).click();
    expect((await (await initialFeed).json()).ok).toBe(true);
    await expect(
      support.getByRole("heading", { name: "Support chat", exact: true }),
    ).toBeVisible();
    const message = `Hello, I need help choosing a minigame. QA ${randomUUID()}`;
    await page.goto("/");
    await page
      .getByRole("button", { name: "Open live chat support", exact: true })
      .click();
    await expect(
      page
        .getByRole("region", { name: "Support chat", exact: true })
        .getByRole("heading", { name: "Support chat" }),
    ).toHaveCSS("font-family", /InterVariable/);
    await expect(
      support.getByRole("heading", { name: "Support chat", exact: true }),
    ).toHaveCSS("font-family", /InterVariable/);
    await page.getByLabel("Display name", { exact: true }).fill("QA visitor");
    await page.getByLabel("Category", { exact: true }).fill("Minigames");
    await page.getByLabel("Initial message", { exact: true }).fill(message);
    await page.getByRole("checkbox", { name: /I understand chat/ }).check();
    await page.getByRole("button", { name: "Start chat", exact: true }).click();
    await expect(
      page.getByRole("log", { name: "Chat transcript" }),
    ).toContainText(message);
    await expect(
      support.getByText("New customer message", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    const row = support.locator("article").filter({ hasText: message });
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByRole("link", { name: "Open", exact: true }).click();
    await expect(
      support.getByRole("log", { name: "Staff chat transcript" }),
    ).toContainText(message);
    const reply = "Hello! I can help you choose the right minigame service.";
    await support.getByLabel("Staff reply", { exact: true }).fill(reply);
    await support
      .getByRole("button", { name: "Send reply", exact: true })
      .click();
    await expect(
      page.getByRole("log", { name: "Chat transcript" }),
    ).toContainText(reply, { timeout: 20000 });
    const id = new URL(support.url()).pathname.split("/").at(-1)!;
    // Keep app cookies secure; APIRequestContext needs the valid local fixture
    // session forwarded explicitly because this test runs over localhost HTTP.
    const staffApiHeaders = {
      Cookie: (await staffContext.cookies())
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; "),
    };
    const note = await support.request.post(
      `/api/admin/chat/conversations/${id}/internal-notes`,
      {
        headers: staffApiHeaders,
        data: {
          body: "Private QA note for the support team.",
          idempotencyKey: randomUUID(),
        },
      },
    );
    expect(note.ok(), JSON.stringify(await note.json())).toBe(true);
    const outsider = await browser.newContext();
    expect(
      (
        await outsider.request.get(
          `http://127.0.0.1:3000/api/chat/conversations/${id}`,
        )
      ).status(),
    ).toBe(401);
    await outsider.close();
    expect(
      (
        await support.request.get("/api/admin/chat/settings", {
          headers: staffApiHeaders,
        })
      ).status(),
    ).toBe(403);
    await page
      .getByRole("button", { name: "Close live chat support", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open live chat support", exact: true })
      .click();
    await expect(
      page.getByRole("log", { name: "Chat transcript" }),
    ).toContainText(reply);
    await page.reload();
    await page
      .getByRole("button", { name: "Open live chat support", exact: true })
      .click();
    await expect(
      page.getByRole("log", { name: "Chat transcript" }),
    ).toContainText(reply);
    await expect(
      page.getByRole("log", { name: "Chat transcript" }),
    ).not.toContainText("Private QA note");
    const retry = "Thanks, please explain the available rewards.";
    await page.route(
      `**/api/chat/conversations/${id}/messages`,
      (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            message: "Temporary connection issue. Please retry.",
          }),
        }),
      { times: 1 },
    );
    await page.getByLabel("Message", { exact: true }).fill(retry);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
      retry,
    );
    await expect(
      page
        .getByRole("region", { name: "Support chat", exact: true })
        .getByRole("alert"),
    ).toContainText("Temporary connection");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      support.getByRole("log", { name: "Staff chat transcript" }),
    ).toContainText(retry, { timeout: 20000 });
    const viewport = page.viewportSize()!;
    const closeBounds = await page
      .getByRole("button", { name: "Close live chat support", exact: true })
      .boundingBox();
    const composerBounds = await page
      .getByLabel("Message", { exact: true })
      .boundingBox();
    expect(closeBounds?.y).toBeGreaterThanOrEqual(0);
    expect(
      (composerBounds?.y ?? viewport.height) + (composerBounds?.height ?? 1),
    ).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/admin-live-support/${test.info().project.name}-customer-chat.png`,
      fullPage: false,
    });
    await support.evaluate(() => window.scrollTo(0, 0));
    await support.screenshot({
      path: `artifacts/admin-live-support/${test.info().project.name}-support-reply.png`,
      fullPage: true,
    });
    const closed = await support.request.patch(
      `/api/admin/chat/conversations/${id}/status`,
      {
        headers: staffApiHeaders,
        data: {
          nextStatus: "RESOLVED",
          expectedVersion: (
            await (
              await support.request.get(`/api/admin/chat/conversations/${id}`, {
                headers: staffApiHeaders,
              })
            ).json()
          ).conversation.concurrencyVersion,
          reasonCode: "QA_COMPLETE",
        },
      },
    );
    expect(closed.ok()).toBe(true);
    if (test.info().project.name === "mobile-chromium") {
      await page.goto("/misc-gathering");
      await page
        .locator(".reference-gathering-card")
        .first()
        .getByRole("button", { name: "Select Service", exact: true })
        .click();
      const checkout = page.locator(".service-mobile-checkout-bar");
      await expect(checkout).toBeVisible();
      const chatButton = page.getByRole("button", {
        name: "Open live chat support",
        exact: true,
      });
      await expect(chatButton).toBeVisible();
      const chatBounds = await chatButton.boundingBox();
      const checkoutBounds = await checkout.boundingBox();
      expect(chatBounds!.y + chatBounds!.height).toBeLessThanOrEqual(
        checkoutBounds!.y,
      );
      await chatButton.click();
      expect(
        (await page
          .getByRole("button", { name: "Close live chat support", exact: true })
          .boundingBox())!.y,
      ).toBeGreaterThanOrEqual(0);
    }
  } finally {
    await staffContext.close();
  }
});
