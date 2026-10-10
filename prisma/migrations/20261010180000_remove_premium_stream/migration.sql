UPDATE `PremiumServiceConfig`
SET `discordStreamEnabled` = false
WHERE `configuratorType` IN ('INFERNAL_CAPE', 'COLOSSEUM');

UPDATE `CatalogueService`
SET `content` = REPLACE(`content`, 'gear review, delivery and available stream option.', 'gear review and delivery.')
WHERE `seededKey` = 'dizanas-quiver-premium'
  AND `content` LIKE '%gear review, delivery and available stream option.%';
