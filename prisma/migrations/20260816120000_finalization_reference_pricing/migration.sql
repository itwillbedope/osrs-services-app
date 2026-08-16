ALTER TABLE `CatalogueOffering`
  ADD COLUMN `basePriceCents` INTEGER NULL,
  ADD COLUMN `pricingUnit` VARCHAR(80) NULL,
  ADD COLUMN `referenceSourceKey` VARCHAR(160) NULL;

CREATE INDEX `CatalogueOffering_basePriceCents_idx` ON `CatalogueOffering`(`basePriceCents`);
CREATE INDEX `CatalogueOffering_referenceSourceKey_idx` ON `CatalogueOffering`(`referenceSourceKey`);
