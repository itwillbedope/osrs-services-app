import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

test("homepage exposes Minigames without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  const card = page
    .locator("#main-services")
    .getByRole("link", { name: /Minigames/ });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", "/minigames");
  expect(
    await card
      .getByRole("heading", { name: "Minigames", exact: true })
      .evaluate((heading) => heading.scrollWidth <= heading.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(
      "artifacts/minigames",
      test.info().project.name + "-homepage.png",
    ),
  });
  await card.click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Amount for Anglers Outfit Full Set",
      exact: true,
    }),
  ).toBeVisible();
});
test("quantity precedes selection and Minigames rates reach the cart", async ({
  page,
}) => {
  await page.goto("/minigames");
  await page.waitForLoadState("networkidle");
  const amount = page.getByRole("spinbutton", {
    name: "Amount for Anglers Outfit Full Set",
    exact: true,
  });
  await expect(amount).toBeVisible();
  await amount.fill("2");
  await expect(
    page.getByText("0 selected services", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Select Service", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".reference-order-side")).toContainText("$13.60");
  await page.screenshot({
    path: path.join(
      "artifacts/minigames",
      test.info().project.name + "-quantity.png",
    ),
  });
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page
    .getByRole("link", { name: "Added · View cart", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "OSRS Minigames", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("article").filter({
      has: page.getByRole("heading", { name: "OSRS Minigames", exact: true }),
    }),
  ).toContainText("$13.60");
  await page.getByRole("link", { name: "Checkout", exact: true }).click();
  for (const method of [
    "Stripe · Cards · Coming soon",
    "Payoneer · Coming soon",
    "Bitcoin (BTC) · Coming soon",
    "OSRS GP · Coming soon",
  ]) {
    await expect(page.getByText(method, { exact: true })).toBeVisible();
  }
});
test("mobile-safe grouped pricing and always-visible gathering amounts", async ({
  page,
}) => {
  await page.goto("/minigames");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("textbox", { name: "Search minigames", exact: true })
    .fill("Mastering Mixology");
  await expect(
    page.getByRole("heading", { name: "Anglers Outfit", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Stream option", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Under 60 Herblore +40%", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Select Service", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".reference-order-side")).toContainText("$28.56");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("spinbutton", {
      name: "Amount for Mastering Mixology Reagent pouch",
      exact: true,
    })
    .fill("0");
  await expect(
    page.getByRole("alert").filter({ hasText: "quantity must be" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeDisabled();
  await page.goto("/misc-gathering");
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator(".reference-gathering-card").first().getByRole("spinbutton"),
  ).toBeVisible();
  await expect(
    page
      .locator(".reference-gathering-card")
      .first()
      .getByRole("button", { name: "Select Service", exact: true }),
  ).toBeVisible();
});
test("premium stream removal and private dashboard protection", async ({
  page,
}) => {
  for (const route of ["/infernal", "/quiver"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("checkbox", { name: /stream/i })).toHaveCount(
      0,
    );
  }
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  const file = process.env.MINIGAMES_QA_CREDENTIAL_FILE;
  const credentials = file
    ? JSON.parse(readFileSync(file, "utf8"))
    : {
        email: process.env.ADMIN_SEED_EMAIL,
        password: process.env.ADMIN_SEED_PASSWORD,
      };
  test.skip(
    !credentials.email || !credentials.password,
    "No local/test staff fixture configured.",
  );
  await page
    .getByLabel("Email address or username", { exact: true })
    .fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page
    .getByRole("button", { name: "Sign in securely", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Users & roles", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create user", exact: true }),
  ).toBeVisible();
  await page.getByText("Define a new role", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create role", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(
      "artifacts/minigames",
      test.info().project.name + "-roles.png",
    ),
  });
  await page.goto("/admin/payments/setup");
  await expect(
    page.getByRole("heading", { name: "Payment setup", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Stripe hosted checkout", exact: true }),
  ).toBeVisible();
});
