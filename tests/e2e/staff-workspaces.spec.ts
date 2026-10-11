import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const fixtureFile = process.env.STAFF_QA_CREDENTIAL_FILE;
type Fixture = { email: string; password: string; id: string };
const fixtures: Record<string, Fixture> = fixtureFile
  ? JSON.parse(readFileSync(fixtureFile, "utf8"))
  : {};

for (const role of ["head", "chat", "editor"]) {
  test(`${role} receives only its authorized workspace`, async ({ page }) => {
    test.skip(!fixtures[role], "Local/test staff fixtures are required.");
    const fixture = fixtures[role]!;
    await page.goto("/admin");
    await page
      .getByLabel("Email address or username", { exact: true })
      .fill(fixture.email);
    await page.getByLabel("Password", { exact: true }).fill(fixture.password);
    await page
      .getByRole("button", { name: "Sign in securely", exact: true })
      .click();
    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav).toHaveCSS("font-family", /InterVariable/);
    if (role === "head") {
      await expect(
        page.getByRole("heading", { name: "Business dashboard", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Confirmed sales", exact: true }),
      ).toBeVisible();
      await expect(
        nav.getByRole("link", { name: "Orders", exact: true }),
      ).toHaveCount(1);
      await page.goto("/admin/users");
      const recommended = page.getByRole("region", {
        name: "Recommended staff roles",
      });
      for (const name of ["Head", "Chat Support", "Products & Data Editor"])
        await expect(
          recommended.getByRole("heading", { name, exact: true }),
        ).toBeVisible();
      await page.goto("/admin");
      await expect(
        page.getByRole("heading", { name: "Confirmed sales", exact: true }),
      ).toBeVisible();
    } else {
      await expect(page).toHaveURL(
        role === "chat" ? /\/admin\/chat$/ : /\/admin\/catalogue$/,
      );
      if (role === "chat") {
        await expect(
          page.getByRole("heading", { name: "Support chat", exact: true }),
        ).toBeVisible();
        await expect(nav.getByRole("link")).toHaveCount(1);
        await expect(
          nav.getByRole("link", { name: "Chat", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Chat settings", exact: true }),
        ).toHaveCount(0);
      } else {
        await expect(
          page.getByRole("heading", { name: "Catalogue", exact: true }),
        ).toBeVisible();
        await expect(
          nav.getByRole("link", { name: "Products", exact: true }),
        ).toHaveCount(1);
        await expect(
          nav.getByRole("link", { name: "Chat", exact: true }),
        ).toHaveCount(0);
      }
      await expect(
        nav.getByRole("link", { name: "Orders", exact: true }),
      ).toHaveCount(0);
      await expect(
        nav.getByRole("link", { name: "Users & roles", exact: true }),
      ).toHaveCount(0);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: path.join(
        "artifacts/staff-workspaces",
        `${test.info().project.name}-${role}.png`,
      ),
    });
    if (role !== "head") {
      for (const route of [
        "/admin/users",
        "/admin/orders",
        "/admin/payments/setup",
        ...(role === "chat" ? ["/admin/catalogue"] : ["/admin/chat"]),
      ]) {
        const response = await page.goto(route);
        // Next can commit a 200 streaming response before a child route's
        // forbidden() boundary renders. Verify actual denial, not only status.
        expect([200, 403]).toContain(response?.status());
        await expect(
          page.getByRole("heading", {
            name: "Capability required.",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", {
            name: "Business dashboard",
            exact: true,
          }),
        ).toHaveCount(0);
      }
      if (role === "editor") {
        const response = await page.request.get(
          "/api/admin/chat/conversations",
          {
            headers: {
              Cookie: (await page.context().cookies())
                .map((cookie) => `${cookie.name}=${cookie.value}`)
                .join("; "),
            },
          },
        );
        expect([401, 403]).toContain(response.status());
        expect((await response.json()).ok).toBe(false);
      }
    }
  });
}
