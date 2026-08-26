CREATE TABLE `HomepageSection` (
  `id` VARCHAR(30) NOT NULL,
  `sectionKey` VARCHAR(80) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `itemLimit` INTEGER NOT NULL DEFAULT 4,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `HomepageSection_sectionKey_key`(`sectionKey`),
  INDEX `HomepageSection_enabled_displayOrder_idx`(`enabled`, `displayOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `HomepageItem` (
  `id` VARCHAR(30) NOT NULL,
  `placement` ENUM('MAIN_CATEGORY', 'MAIN_SERVICE', 'FEATURED_SERVICE') NOT NULL,
  `sourceType` ENUM('SERVICE', 'PRODUCT', 'ACCOUNT', 'GOLD', 'CUSTOM_BUILD', 'MANUAL_PROMO') NOT NULL,
  `linkedRecordId` VARCHAR(30) NULL,
  `titleOverride` VARCHAR(180) NULL,
  `descriptionOverride` VARCHAR(500) NULL,
  `badgeText` VARCHAR(80) NULL,
  `badgeStyle` VARCHAR(40) NULL,
  `bulletPoints` JSON NULL,
  `imagePath` VARCHAR(500) NULL,
  `imageAltText` VARCHAR(240) NULL,
  `ctaText` VARCHAR(80) NULL,
  `ctaUrl` VARCHAR(500) NULL,
  `priceMode` ENUM('AUTO', 'OVERRIDE', 'HIDE') NOT NULL DEFAULT 'AUTO',
  `promotionalPriceCents` INTEGER NULL,
  `oldPriceCents` INTEGER NULL,
  `categoryLabel` VARCHAR(120) NULL,
  `displayOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `isFeatured` BOOLEAN NOT NULL DEFAULT true,
  `startsAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `archivedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(30) NULL,
  `updatedById` VARCHAR(30) NULL,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `HomepageItem_placement_isActive_displayOrder_idx`(`placement`, `isActive`, `displayOrder`),
  INDEX `HomepageItem_sourceType_linkedRecordId_idx`(`sourceType`, `linkedRecordId`),
  INDEX `HomepageItem_startsAt_expiresAt_idx`(`startsAt`, `expiresAt`),
  INDEX `HomepageItem_archivedAt_idx`(`archivedAt`),
  INDEX `HomepageItem_createdById_createdAt_idx`(`createdById`, `createdAt`),
  INDEX `HomepageItem_updatedById_updatedAt_idx`(`updatedById`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `HomepageItem` ADD CONSTRAINT `HomepageItem_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `HomepageItem` ADD CONSTRAINT `HomepageItem_updatedById_fkey`
  FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `HomepageSection` (`id`, `sectionKey`, `title`, `enabled`, `itemLimit`, `displayOrder`, `updatedAt`) VALUES
  ('hp-section-categories', 'main-categories', 'What Can We Do For You?', true, 4, 10, CURRENT_TIMESTAMP(3)),
  ('hp-section-services', 'main-services', 'Our Main Services', true, 7, 20, CURRENT_TIMESTAMP(3)),
  ('hp-section-featured', 'featured-services', 'Featured Services', true, 4, 30, CURRENT_TIMESTAMP(3));

INSERT INTO `HomepageItem` (`id`, `placement`, `sourceType`, `titleOverride`, `descriptionOverride`, `badgeText`, `bulletPoints`, `imagePath`, `imageAltText`, `ctaText`, `ctaUrl`, `priceMode`, `categoryLabel`, `displayOrder`, `updatedAt`) VALUES
  ('hp-cat-accounts', 'MAIN_CATEGORY', 'MANUAL_PROMO', 'Accounts', 'Account marketplace and custom account builds.', NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Red-armoured account character artwork', 'View Accounts', '/accounts', 'HIDE', 'Marketplace', 10, CURRENT_TIMESTAMP(3)),
  ('hp-cat-gold', 'MAIN_CATEGORY', 'MANUAL_PROMO', 'Gold / Items', 'Get the gold or items you need quickly and safely.', NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Gold chest and coins artwork', 'View Items', '/products', 'HIDE', 'Marketplace', 20, CURRENT_TIMESTAMP(3)),
  ('hp-cat-power', 'MAIN_CATEGORY', 'MANUAL_PROMO', 'Powerleveling', 'Level your skills with fast, efficient methods.', NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Powerleveling fantasy character artwork', 'View Powerleveling', '/services/power-levelling', 'HIDE', 'Services', 30, CURRENT_TIMESTAMP(3)),
  ('hp-cat-pvm', 'MAIN_CATEGORY', 'MANUAL_PROMO', 'PVMing', 'Bossing, raids and more with experienced teams.', NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'PvM fantasy boss artwork', 'View PVM Services', '/services/bossing-pvm', 'HIDE', 'Services', 40, CURRENT_TIMESTAMP(3)),
  ('hp-svc-inferno', 'MAIN_SERVICE', 'MANUAL_PROMO', 'Inferno', NULL, NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Inferno cape artwork', 'View Inferno', '/services/bossing-pvm', 'HIDE', 'PvM', 10, CURRENT_TIMESTAMP(3)),
  ('hp-svc-quiver', 'MAIN_SERVICE', 'MANUAL_PROMO', 'Quiver', NULL, NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Quiver artwork', 'View Quiver', '/services', 'HIDE', 'PvM', 20, CURRENT_TIMESTAMP(3)),
  ('hp-svc-bossing', 'MAIN_SERVICE', 'MANUAL_PROMO', 'Bossing', NULL, NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Bossing artwork', 'View Bossing', '/services/bossing-pvm', 'HIDE', 'PvM', 30, CURRENT_TIMESTAMP(3)),
  ('hp-svc-raids', 'MAIN_SERVICE', 'MANUAL_PROMO', 'Raids', NULL, NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Raids artwork', 'View Raids', '/services/bossing-pvm', 'HIDE', 'PvM', 40, CURRENT_TIMESTAMP(3)),
  ('hp-svc-skills', 'MAIN_SERVICE', 'MANUAL_PROMO', 'Skills', NULL, NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Skilling campfire artwork', 'View Skills', '/services/power-levelling', 'HIDE', 'Skilling', 50, CURRENT_TIMESTAMP(3)),
  ('hp-svc-quests', 'MAIN_SERVICE', 'MANUAL_PROMO', 'Quests', NULL, NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Quest scroll artwork', 'View Quests', '/services/quests', 'HIDE', 'Questing', 60, CURRENT_TIMESTAMP(3)),
  ('hp-svc-diaries', 'MAIN_SERVICE', 'MANUAL_PROMO', 'Diaries', NULL, NULL, NULL, '/artwork/osrs-reference-board.jpeg', 'Achievement diary artwork', 'View Diaries', '/services/achievement-diaries', 'HIDE', 'Diaries', 70, CURRENT_TIMESTAMP(3)),
  ('hp-feat-inferno', 'FEATURED_SERVICE', 'MANUAL_PROMO', 'Inferno Cape Service', 'A tailored Inferno service with requirements reviewed before scheduling.', 'Best Seller', '["100% hand played","Requirements reviewed","Secure support"]', '/artwork/osrs-reference-board.jpeg', 'Inferno service artwork', 'Configure', '/services/bossing-pvm', 'HIDE', 'PvM', 10, CURRENT_TIMESTAMP(3)),
  ('hp-feat-gauntlet', 'FEATURED_SERVICE', 'MANUAL_PROMO', 'Corrupted Gauntlet', 'Configure a clear Gauntlet service scope for your account.', 'Hot', '["Hand played","Clear scope","Order tracking"]', '/artwork/osrs-reference-board.jpeg', 'Corrupted Gauntlet artwork', 'View Service', '/services/bossing-pvm', 'HIDE', 'PvM', 20, CURRENT_TIMESTAMP(3)),
  ('hp-feat-zulrah', 'FEATURED_SERVICE', 'MANUAL_PROMO', 'Zulrah Kills', 'Plan a Zulrah kill package with account requirements checked first.', NULL, '["Hand played","Loot terms confirmed","Secure communication"]', '/artwork/osrs-reference-board.jpeg', 'Zulrah boss artwork', 'Configure', '/services/bossing-pvm', 'HIDE', 'Bossing', 30, CURRENT_TIMESTAMP(3)),
  ('hp-feat-raids', 'FEATURED_SERVICE', 'MANUAL_PROMO', 'Raids Services', 'Explore raid support options and request a tailored configuration.', 'New', '["TOA, COX and TOB","Experienced teams","Fast and safe"]', '/artwork/osrs-reference-board.jpeg', 'Raid team artwork', 'View Raids', '/services/bossing-pvm', 'HIDE', 'Raids', 40, CURRENT_TIMESTAMP(3));
