import "server-only";

import { hash, verify } from "@node-rs/argon2";

const ARGON2ID = 2;

export function hashPassword(password: string) {
  return hash(password, {
    algorithm: ARGON2ID,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export function verifyPassword(passwordHash: string, candidate: string) {
  return verify(passwordHash, candidate);
}
