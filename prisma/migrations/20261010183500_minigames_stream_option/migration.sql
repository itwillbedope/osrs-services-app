DELETE f FROM `CatalogueOfferingFacet` f
INNER JOIN `CatalogueOffering` o ON o.id = f.offeringId
INNER JOIN `CatalogueService` s ON s.id = o.serviceId
WHERE s.slug = 'minigames' AND f.facetKey = 'minigame-modifier' AND f.facetValue LIKE 'parsec-bps-%';

INSERT INTO `CatalogueOfferingFacet` (`id`, `offeringId`, `facetKey`, `facetValue`, `label`)
SELECT CONCAT('st', LEFT(SHA2(o.id, 256), 28)), o.id, 'minigame-modifier', 'stream-bps-plus-0', 'Stream'
FROM `CatalogueOffering` o INNER JOIN `CatalogueService` s ON s.id = o.serviceId
WHERE s.slug = 'minigames' AND NOT EXISTS (
 SELECT 1 FROM `CatalogueOfferingFacet` f WHERE f.offeringId = o.id AND f.facetKey = 'minigame-modifier' AND f.facetValue LIKE 'stream-bps-%'
);
