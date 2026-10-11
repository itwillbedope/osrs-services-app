import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("admin entry request guard", () => {
  it("allows the anonymous entry while redirecting private deep links to canonical login", () => {
    expect(
      proxy(new NextRequest("https://example.test/admin")).headers.get(
        "x-middleware-next",
      ),
    ).toBe("1");
    const response = proxy(
      new NextRequest("https://example.test/admin/users?filter=active"),
    );
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe("/admin");
    expect(target.searchParams.get("next")).toBe("/admin/users?filter=active");
  });
  it("keeps customer access separate from the staff cookie", () => {
    const response = proxy(
      new NextRequest("https://example.test/admin/chat", {
        headers: {
          cookie: `${process.env.CUSTOMER_SESSION_COOKIE ?? "osrs_customer_session"}=test-customer-token`,
        },
      }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe("/admin");
  });
});
