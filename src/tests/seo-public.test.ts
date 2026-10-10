import { describe, expect, it } from "vitest";
import { serializeJsonLd, publicPageMetadata } from "@/lib/seo/public";
import robots from "@/app/robots";
describe("public discovery", () => {
  it("allows assets and listings while excluding private flows", () => {
    const rules = robots().rules as { disallow: string[] };
    expect(rules.disallow).toContain("/account/");
    expect(rules.disallow).not.toContain("/account");
    expect(rules.disallow).not.toContain("/_next/");
    expect(
      publicPageMetadata("Minigames", "Rewards", "/minigames").robots,
    ).toEqual({ index: true, follow: true });
  });
  it("escapes script-closing tags", () => {
    expect(
      serializeJsonLd({ name: "</script><script>alert(1)</script>" }),
    ).not.toContain("<");
  });
});
