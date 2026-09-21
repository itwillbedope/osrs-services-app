-- Repair only the original Quiver shortcut; preserve customized destinations.
UPDATE `HomepageItem`
SET `ctaUrl` = '/quiver', `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `id` = 'hp-svc-quiver' AND `ctaUrl` = '/services';
