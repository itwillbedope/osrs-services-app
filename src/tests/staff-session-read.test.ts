import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  removeCookie: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { session: { findUnique: mocks.findUnique, update: mocks.update } },
}));
vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-session-secret-at-least-32-characters",
    AUTH_SESSION_COOKIE: "staff",
    CUSTOMER_SESSION_COOKIE: "customer",
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: "expired-test-token" }),
    delete: mocks.removeCookie,
  }),
}));
import { getCurrentSession } from "@/lib/auth/session";
describe("staff entry session reads", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns an expired session to login without mutating server-component cookies", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "expired",
      audience: "STAFF",
      revokedAt: null,
      expires: new Date(0),
      user: { status: "ACTIVE", accountType: "STAFF" },
    });
    await expect(getCurrentSession()).resolves.toBeNull();
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "expired" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.removeCookie).not.toHaveBeenCalled();
  });
});
