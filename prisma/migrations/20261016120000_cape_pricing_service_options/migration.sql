ALTER TABLE `PremiumServiceConfig` ADD COLUMN `capePricingRules` JSON NULL;

-- Explicit owner-approved pricing change. Historical cart/order snapshots remain intact.
UPDATE `SkillingCalculatorRule` SET `discordStreamPercentBps` = 1000;
UPDATE `BossingCalculatorRule` SET `discordStreamPercentBps` = 1000;
UPDATE `PremiumServiceConfig` SET `discordStreamPercentBps` = 1000;
UPDATE `CatalogueOfferingFacet`
SET `facetValue` = 'stream-bps-plus-1000', `label` = 'Stream (+10%)'
WHERE `facetKey` = 'minigame-modifier' AND `facetValue` LIKE 'stream-bps-%';

UPDATE `BossingMethod` SET `customerGearRequired` = 0, `gearAdjustmentCents` = 0,
  `suppliesEnabled` = 0, `suppliesFeeCents` = 0,
  `supplyNotes` = 'Customers must provide all required gear, equipment, and supplies for the selected service.';
UPDATE `SkillingTrainingMethod` SET `suppliesEnabled` = 0, `suppliesFeeCents` = 0;
UPDATE `PremiumPackage` SET `customerGearRequired` = 0, `gearUnconfirmedAdjustmentCents` = 0;
UPDATE `PremiumOption` SET `enabled` = 0 WHERE `optionType` IN ('SUPPLIES', 'GEAR_SUPPORT');
UPDATE `HomepageItem` SET `ctaUrl` = '/corrupted-gauntlet', `concurrencyVersion` = `concurrencyVersion` + 1
WHERE `titleOverride` LIKE '%Corrupted Gauntlet%';
