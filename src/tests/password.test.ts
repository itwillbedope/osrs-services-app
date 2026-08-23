import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

const nativeArgon2PhcHash =
  "$argon2id$v=19$m=19456,t=2,p=1$Y29tcGF0aWJpbGl0eXNhbHQ$G+QQcLjpAbPnV5Pesv7dwZS+10px1xhrdY86N5Mnsgk";

describe("password hashing", () => {
  it("hashes new passwords as Argon2id with the configured cost parameters", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    await expect(
      verifyPassword(hash, "correct horse battery staple"),
    ).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });

  it("verifies standard Argon2id PHC hashes created by the previous native package", async () => {
    await expect(
      verifyPassword(nativeArgon2PhcHash, "correct horse battery staple"),
    ).resolves.toBe(true);
    await expect(
      verifyPassword(nativeArgon2PhcHash, "wrong password"),
    ).resolves.toBe(false);
  });
});
