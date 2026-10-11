-- Apply the owner's 2% Stream fee to the actual Minigames category offerings.
-- Category matching covers the canonical minigames-services slug and legacy variants.
DELETE f FROM `CatalogueOfferingFacet` f
INNER JOIN `CatalogueOffering` o ON o.id = f.offeringId
INNER JOIN `CatalogueService` s ON s.id = o.serviceId
INNER JOIN `CatalogueCategory` c ON c.id = s.categoryId
WHERE c.slug = 'minigames' AND f.facetKey = 'minigame-modifier' AND f.facetValue LIKE 'parsec-bps-%';

UPDATE `CatalogueOfferingFacet` f
INNER JOIN `CatalogueOffering` o ON o.id = f.offeringId
INNER JOIN `CatalogueService` s ON s.id = o.serviceId
INNER JOIN `CatalogueCategory` c ON c.id = s.categoryId
SET f.facetValue = 'stream-bps-plus-200', f.label = 'Stream (+2%)'
WHERE c.slug = 'minigames' AND f.facetKey = 'minigame-modifier' AND f.facetValue LIKE 'stream-bps-%';

INSERT INTO `CatalogueOfferingFacet` (`id`, `offeringId`, `facetKey`, `facetValue`, `label`)
SELECT CONCAT('st', LEFT(SHA2(o.id, 256), 28)), o.id, 'minigame-modifier', 'stream-bps-plus-200', 'Stream (+2%)'
FROM `CatalogueOffering` o
INNER JOIN `CatalogueService` s ON s.id = o.serviceId
INNER JOIN `CatalogueCategory` c ON c.id = s.categoryId
WHERE c.slug = 'minigames' AND NOT EXISTS (
 SELECT 1 FROM `CatalogueOfferingFacet` f WHERE f.offeringId = o.id AND f.facetKey = 'minigame-modifier' AND f.facetValue LIKE 'stream-bps-%'
);
