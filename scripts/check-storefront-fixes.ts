import assert from "node:assert/strict";
import { seedQuiver } from "../prisma/quiver-seed";
import { prisma } from "../src/lib/db/prisma";
import { resolveCartSource } from "../src/lib/checkout/adapters";
import { calculateLevelProgress } from "../src/lib/skilling/xp";

// This check edits temporary configuration and restores it; never run remotely.
assert.equal(process.env.STOREFRONT_LOCAL_CHECK, "1");
assert.ok(["localhost", "127.0.0.1"].includes(process.env.DATABASE_HOST ?? ""));
assert.equal(process.env.DATABASE_NAME, "osrs_services");

async function main() {
  const service = await prisma.catalogueService.findUniqueOrThrow({
    where: { seededKey: "dizanas-quiver-premium" },
    include: { premiumConfig: true, premiumPackages: true },
  });
  assert.equal(service.premiumConfig?.configuratorType, "COLOSSEUM");
  const pkg = service.premiumPackages[0]!;
  const quiverSource = {
    serviceId: service.id,
    packageSlug: pkg.slug,
    optionSelections: [],
    gameMode: "NORMAL",
    customerGearConfirmed: true,
    includeDiscordStream: false,
    deliverySpeed: "STANDARD",
  };
  const quiver = await resolveCartSource({
    kind: "PREMIUM_ESTIMATE",
    source: quiverSource,
  });
  assert.equal(quiver.validationState, "VALID");
  assert.match(quiver.snapshot.publicTitle, /Quiver/);
  const sourceMethod = await prisma.bossingMethod.findFirstOrThrow({
    where: { boss: { bossKey: "reference-colosseum" }, slug: "standard-kills" },
  });
  assert.equal(pkg.basePriceCents, sourceMethod.basePriceCentsPerKill);
  assert.equal(
    quiver.finalTotalCents,
    Math.max(pkg.basePriceCents, pkg.minimumPriceCents) + pkg.setupFeeCents,
  );
  try {
    await prisma.premiumPackage.update({
      where: { id: pkg.id },
      data: { basePriceCents: 12345, name: "Locally edited Quiver package" },
    });
    await seedQuiver(prisma);
    const edited = await prisma.premiumPackage.findUniqueOrThrow({
      where: { id: pkg.id },
    });
    assert.equal(edited.basePriceCents, 12345);
    assert.equal(edited.name, "Locally edited Quiver package");
    assert.equal(
      await prisma.premiumPackage.count({ where: { serviceId: service.id } }),
      service.premiumPackages.length,
    );
    await prisma.catalogueService.update({
      where: { id: service.id },
      data: { publicationStatus: "DRAFT" },
    });
    await assert.rejects(
      () =>
        resolveCartSource({ kind: "PREMIUM_ESTIMATE", source: quiverSource }),
      /available premium/,
    );
  } finally {
    await prisma.premiumPackage.update({
      where: { id: pkg.id },
      data: { basePriceCents: pkg.basePriceCents, name: pkg.name },
    });
    await prisma.catalogueService.update({
      where: { id: service.id },
      data: { publicationStatus: service.publicationStatus },
    });
  }

  const method = await prisma.skillingTrainingMethod.findFirstOrThrow({
    where: {
      skillConfig: { skillKey: "ATTACK" },
      enabled: true,
      maximumLevel: 70,
    },
  });
  const skillSource = {
    serviceId: method.serviceId,
    skillKey: "ATTACK",
    methodSlug: method.slug,
    gameMode: "NORMAL",
    includeSupplies: false,
    includeDiscordStream: false,
    deliverySpeed: "STANDARD",
  };
  for (const input of [
    { inputMode: "LEVEL", currentLevel: 1, targetLevel: 90 },
    { inputMode: "XP", currentXp: 0, targetXp: 5_000_000 },
  ]) {
    const cart = await resolveCartSource({
      kind: "SKILLING_ESTIMATE",
      source: { ...skillSource, ...input },
    });
    const xp =
      input.inputMode === "XP"
        ? input.targetXp!
        : calculateLevelProgress({ currentLevel: 1, targetLevel: 90 })
            .xpRequired;
    assert.equal(
      cart.finalTotalCents,
      Math.max(
        method.minimumPriceCents,
        Math.ceil((xp * method.basePriceCentsPerMillionXp) / 1_000_000) +
          method.fixedFeeCents,
      ),
    );
    assert.equal(cart.validationState, "VALID");
    assert.match(
      cart.snapshot.publicConfigurationSummary,
      /confirmed before starting/,
    );
  }
  await assert.rejects(
    () =>
      resolveCartSource({
        kind: "SKILLING_ESTIMATE",
        source: {
          ...skillSource,
          inputMode: "LEVEL",
          currentLevel: 90,
          targetLevel: 70,
        },
      }),
    /higher than current/,
  );
  try {
    await prisma.skillingTrainingMethod.update({
      where: { id: method.id },
      data: { enabled: false },
    });
    await assert.rejects(
      () =>
        resolveCartSource({
          kind: "SKILLING_ESTIMATE",
          source: {
            ...skillSource,
            inputMode: "LEVEL",
            currentLevel: 1,
            targetLevel: 90,
          },
        }),
      /available skilling/,
    );
  } finally {
    await prisma.skillingTrainingMethod.update({
      where: { id: method.id },
      data: { enabled: true },
    });
  }
  console.log(
    "PASS: Quiver pricing/cart, seed preservation, unpublished-service protection, cross-range level/XP cart pricing, invalid progression, disabled-method protection.",
  );
}
main().finally(() => prisma.$disconnect());
