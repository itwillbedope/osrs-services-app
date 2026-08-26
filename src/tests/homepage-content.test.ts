import { describe, expect, it } from "vitest";

import { permissions } from "@/lib/auth/permissions";
import {
  homepageItemInputSchema,
  homepageViewAllLinks,
  isHomepageItemActive,
  safeHomepageHref,
  selectHomepageItems,
} from "@/lib/homepage/core";

const commonInput = {
  placement: "FEATURED_SERVICE" as const,
  titleOverride: "Launch promotion",
  descriptionOverride: "A homepage promotion.",
  bulletPoints: "Hand played\nSecure support",
  priceMode: "HIDE" as const,
  displayOrder: 20,
  isActive: true,
  isFeatured: true,
};

describe("homepage content management", () => {
  it("exposes a dedicated homepage management capability", () => {
    expect(permissions.homepageManage).toBe("homepage.manage");
  });

  it("accepts a linked catalogue service", () => {
    const parsed = homepageItemInputSchema.parse({
      ...commonInput,
      sourceType: "SERVICE",
      linkedRecordId: "service123",
    });
    expect(parsed.linkedRecordId).toBe("service123");
  });

  it("accepts a linked marketplace product", () => {
    const parsed = homepageItemInputSchema.parse({
      ...commonInput,
      sourceType: "PRODUCT",
      linkedRecordId: "product123",
    });
    expect(parsed.sourceType).toBe("PRODUCT");
  });

  it("accepts a custom manual promotion without a linked record", () => {
    const parsed = homepageItemInputSchema.parse({
      ...commonInput,
      sourceType: "MANUAL_PROMO",
    });
    expect(parsed.titleOverride).toBe("Launch promotion");
  });

  it("excludes disabled, expired, future and archived cards", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    expect(
      isHomepageItemActive(
        { isActive: false, startsAt: null, expiresAt: null, archivedAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      isHomepageItemActive(
        {
          isActive: true,
          startsAt: new Date("2026-08-27T00:00:00Z"),
          expiresAt: null,
          archivedAt: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isHomepageItemActive(
        {
          isActive: true,
          startsAt: null,
          expiresAt: new Date("2026-08-25T00:00:00Z"),
          archivedAt: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isHomepageItemActive(
        { isActive: true, startsAt: null, expiresAt: null, archivedAt: now },
        now,
      ),
    ).toBe(false);
  });

  it("orders cards and respects the configured limit", () => {
    const base = {
      placement: "FEATURED_SERVICE" as const,
      isActive: true,
      startsAt: null,
      expiresAt: null,
      archivedAt: null,
    };
    const selected = selectHomepageItems(
      [
        { ...base, id: "third", displayOrder: 30 },
        { ...base, id: "first", displayOrder: 10 },
        { ...base, id: "second", displayOrder: 20 },
      ],
      "FEATURED_SERVICE",
      2,
    );
    expect(selected.map((item) => item.id)).toEqual(["first", "second"]);
  });

  it("keeps internal card routes safe", () => {
    expect(safeHomepageHref("/services/bossing-pvm")).toBe(
      "/services/bossing-pvm",
    );
    expect(safeHomepageHref("javascript:alert(1)")).toBe("/services");
  });

  it("keeps View All destinations available", () => {
    expect(homepageViewAllLinks).toEqual({
      services: "/services",
      accounts: "/accounts",
      products: "/products",
      gold: "/gold",
    });
  });
});
