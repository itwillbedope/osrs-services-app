import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
test("featured CG opens the correct dedicated encounter", async ({ page }) => {
  await page.goto("/");
  const cg = page.getByRole("link", { name: /Corrupted Gauntlet/ }).first();
  await expect(cg).toHaveAttribute("href", "/corrupted-gauntlet");
  await cg.click();
  await expect(page).toHaveURL(/\/corrupted-gauntlet$/);
  await expect(
    page.getByRole("heading", { name: "Corrupted Gauntlet Service" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Zulrah/ })).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/corrupted-gauntlet$/,
  );
  await noOverflow(page);
});
test("Infernal uses additive rates and authoritative cart prices", async ({
  page,
}) => {
  await page.goto("/infernal");
  const total = page.getByTestId("cape-final-price");
  await expect(total).toHaveText("$65.00");
  const gear = page.getByRole("group", { name: "Rigour available?" });
  await gear.getByRole("button", { name: "No", exact: true }).click();
  await page
    .getByRole("group", { name: "Blowpipe available?" })
    .getByRole("button", { name: "No", exact: true })
    .click();
  await expect(total).toHaveText("$71.50");
  await gear.getByRole("button", { name: "Yes", exact: true }).click();
  await page
    .getByRole("group", { name: "Blowpipe available?" })
    .getByRole("button", { name: "Yes", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Inferno Slayer task?" })
    .getByRole("button", { name: "Yes", exact: true })
    .click();
  await expect(total).toHaveText("$58.50");
  await page
    .getByRole("group", { name: "Inferno Slayer task?" })
    .getByRole("button", { name: "No", exact: true })
    .click();
  await page.getByRole("radio", { name: /Bowfa setup/ }).check();
  await page.getByRole("radio", { name: /Pure account/ }).check();
  await page
    .getByRole("spinbutton", { name: "Ranged level", exact: true })
    .fill("90");
  await page
    .getByRole("spinbutton", { name: "Magic level", exact: true })
    .fill("90");
  await expect(total).toHaveText("$112.50");
  await expect(page.getByRole("checkbox", { name: /Stream/ })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({
    path: `artifacts/cape-custom-orders/${test.info().project.name}-infernal.png`,
    fullPage: true,
  });
  const add = page
    .locator(".cape-summary")
    .getByRole("button", { name: "Add to cart", exact: true });
  await expect(add).toBeEnabled();
  await add.click();
  await expect(
    page.locator(".cape-summary").getByRole("link", { name: /View cart/ }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toContainText("$112.50");
  await page.getByRole("link", { name: "Checkout", exact: true }).click();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toContainText("$112.50");
});
test("Quiver tiers, stats and custom quote safeguards", async ({ page }) => {
  await page.goto("/quiver");
  const total = page.getByTestId("cape-final-price");
  await expect(total).toHaveText("$50.00");
  await page.getByRole("radio", { name: /Mid Tier Gear/ }).check();
  await expect(total).toHaveText("$65.00");
  await page.getByRole("radio", { name: /Pure account/ }).check();
  await expect(total).toHaveText("$84.50");
  await page
    .getByRole("spinbutton", { name: "Ranged level", exact: true })
    .fill("89");
  await page
    .getByRole("spinbutton", { name: "Magic level", exact: true })
    .fill("84");
  await expect(total).toHaveText("$97.50");
  await expect(
    page
      .locator(".cape-summary")
      .getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeEnabled();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/Low Tier|Hardcore Ironman/);
  await expect(page.getByRole("checkbox", { name: /Stream/ })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({
    path: `artifacts/cape-custom-orders/${test.info().project.name}-quiver.png`,
    fullPage: true,
  });
  await page.getByRole("radio", { name: /Restricted build/ }).check();
  await expect(
    page
      .locator(".cape-summary")
      .getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".cape-config")).toContainText(
    "personalized quote",
  );
  await page.getByRole("radio", { name: /Main account/ }).check();
  await page
    .getByRole("radio", { name: "Continue without a stat check" })
    .check();
  await expect(
    page
      .locator(".cape-summary")
      .getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".cape-config")).toContainText(
    "must be confirmed before checkout",
  );
});
test("cape endpoints reject quote bypass and unsupported premium stream", async ({
  page,
  request,
}) => {
  await page.goto("/infernal");
  const quoteRequest = await page.waitForRequest((req) =>
    req.url().includes("/api/premium/estimate"),
  );
  const body = quoteRequest.postDataJSON();
  for (const tampered of [
    { ...body, includeDiscordStream: true },
    { ...body, optionSelections: [{ slug: "restricted-build" }] },
    { ...body, statCheckMode: "NONE", manualStats: [] },
    {
      ...body,
      optionSelections: [{ slug: "pure-build" }, { slug: "zerker-build" }],
    },
  ]) {
    const response = await request.post("/api/premium/estimate", {
      data: tampered,
    });
    expect(response.status()).toBe(400);
  }
});
test("custom requests persist safely, recover and prevent duplicate submissions", async ({
  page,
  request,
}) => {
  await page.goto("/custom-order");
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Local QA visitor");
  await page
    .getByRole("textbox", { name: "Account build", exact: true })
    .fill("Main account");
  const goal = `Mixed OSRS goals for local QA ${randomUUID()}`;
  await page
    .getByRole("textbox", { name: "Your goal and requested service" })
    .fill(goal);
  await page
    .getByRole("textbox", {
      name: "Current progress, unlocks and available equipment",
    })
    .fill("Ready to discuss gear and quest progress.");
  await page.getByRole("checkbox").check();
  // A connection failure must preserve the customer's unsent details.
  await page.route("**/api/chat/conversations", (route) => route.abort(), {
    times: 1,
  });
  await page.getByRole("button", { name: "Request my custom quote" }).click();
  await expect(
    page.locator(".custom-order-form").getByRole("alert"),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your goal and requested service" }),
  ).toHaveValue(goal);
  await noOverflow(page);
  await page.screenshot({
    path: `artifacts/cape-custom-orders/${test.info().project.name}-custom-order.png`,
    fullPage: true,
  });
  const submitted = page.waitForResponse(
    (res) =>
      res.url().endsWith("/api/chat/conversations") &&
      res.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Request my custom quote" }).click();
  const response = await submitted;
  const submittedBody = response.request().postDataJSON();
  const received = await response.json();
  const repeated = await page.request.post("/api/chat/conversations", {
    data: submittedBody,
    // The production build uses Secure cookies. The API testing jar does not
    // attach these on loopback HTTP, while Chromium correctly accepts the
    // trusted loopback origin; carry this disposable test session explicitly.
    headers: {
      Cookie: (await page.context().cookies())
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; "),
    },
  });
  expect((await repeated.json()).conversation.id).toBe(
    received.conversation.id,
  );
  const outsider = await request.get(
    `/api/chat/conversations/${received.conversation.id}`,
  );
  expect([401, 403, 404]).toContain(outsider.status());
  await expect(
    page.getByRole("heading", { name: "Request received" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open your conversation" }).click();
  await expect(page.getByRole("log")).toContainText(goal);
});
test("chat launcher and new panel fit screen and keep readable controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open live chat support" }).click();
  await expect(
    page.getByRole("heading", { name: "Live Chat Support", exact: true }),
  ).toBeVisible();
  const panel = page.locator(".support-chat-panel");
  const bounds = await panel.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await noOverflow(page);
  await page.screenshot({
    path: `artifacts/cape-custom-orders/${test.info().project.name}-chat.png`,
  });
  await page.getByRole("button", { name: "Close live chat support" }).click();
  await expect(panel).toBeHidden();
});

test("direct diary Stream is 10% and gear/supply upsells stay removed", async ({
  page,
}) => {
  await page.goto("/diaries");
  const baseResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/catalogue/estimate") &&
      r.request().method() === "POST",
  );
  await page.locator(".direct-order-card-main").first().click();
  const base = (await (await baseResponse).json()).totalCents;
  const streamResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/catalogue/estimate") &&
      r.request().method() === "POST",
  );
  await page.getByRole("checkbox", { name: "Stream add-on (+10%)" }).check();
  const stream = await streamResponse;
  expect((await stream.json()).totalCents).toBe(Math.round(base * 1.1));
  expect(stream.request().postDataJSON().selections[0].modifierSlugs).toEqual([
    "stream",
  ]);
  for (const route of ["/skills", "/bossing"]) {
    await page.goto(route);
    await expect(
      page.getByRole("checkbox", { name: /suppl|provides|ready gear/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "Stream add-on (+10%)" }),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText(
      "Customers must provide all required gear, equipment, and supplies",
    );
  }
});
