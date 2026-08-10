-- TASK 016: additive payments, email delivery and production launch readiness foundation.

ALTER TABLE `CheckoutPaymentMethod`
  MODIFY `methodType` ENUM('MANUAL_REVIEW', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL DEFAULT 'MANUAL_REVIEW',
  ADD COLUMN `providerType` ENUM('MANUAL_REVIEW', 'TEST_HOSTED', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL DEFAULT 'MANUAL_REVIEW',
  ADD COLUMN `providerConfigId` VARCHAR(30) NULL,
  ADD INDEX `CheckoutPaymentMethod_providerType_enabled_idx` (`providerType`, `enabled`),
  ADD INDEX `CheckoutPaymentMethod_providerConfigId_idx` (`providerConfigId`);

ALTER TABLE `Order`
  MODIFY `paymentMethodType` ENUM('MANUAL_REVIEW', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL DEFAULT 'MANUAL_REVIEW',
  ADD COLUMN `paymentProvider` ENUM('MANUAL_REVIEW', 'TEST_HOSTED', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL DEFAULT 'MANUAL_REVIEW',
  ADD INDEX `Order_paymentProvider_createdAt_idx` (`paymentProvider`, `createdAt`);

ALTER TABLE `OrderPaymentEvent`
  MODIFY `paymentMethodType` ENUM('MANUAL_REVIEW', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL DEFAULT 'MANUAL_REVIEW';

CREATE TABLE `PaymentProviderConfiguration` (
  `id` VARCHAR(30) NOT NULL,
  `stableKey` VARCHAR(120) NOT NULL,
  `provider` ENUM('MANUAL_REVIEW', 'TEST_HOSTED', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL,
  `displayName` VARCHAR(120) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `productionAllowed` BOOLEAN NOT NULL DEFAULT false,
  `webhookEnabled` BOOLEAN NOT NULL DEFAULT false,
  `publicMode` VARCHAR(80) NOT NULL DEFAULT 'needs-client-review',
  `safeConfiguration` JSON NULL,
  `healthStatus` ENUM('READY', 'NOT_READY', 'DISABLED', 'NEEDS_CLIENT_REVIEW') NOT NULL DEFAULT 'NEEDS_CLIENT_REVIEW',
  `lastValidatedAt` DATETIME(3) NULL,
  `needsClientReview` BOOLEAN NOT NULL DEFAULT true,
  `reviewedById` VARCHAR(30) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PaymentProviderConfiguration_stableKey_key` (`stableKey`),
  INDEX `PaymentProviderConfiguration_provider_enabled_idx` (`provider`, `enabled`),
  INDEX `PaymentProviderConfiguration_healthStatus_idx` (`healthStatus`),
  INDEX `PaymentProviderConfiguration_needsClientReview_idx` (`needsClientReview`),
  INDEX `PaymentProviderConfiguration_reviewedById_idx` (`reviewedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentEligibilityRule` (
  `id` VARCHAR(30) NOT NULL,
  `stableKey` VARCHAR(191) NOT NULL,
  `sourceType` VARCHAR(80) NOT NULL,
  `sourceKey` VARCHAR(191) NOT NULL,
  `sourceLabel` VARCHAR(191) NOT NULL,
  `mode` ENUM('MANUAL_ONLY', 'PROVIDER_ALLOWED', 'PROVIDER_REVIEW_REQUIRED', 'DISABLED') NOT NULL DEFAULT 'PROVIDER_REVIEW_REQUIRED',
  `safeReason` VARCHAR(500) NOT NULL,
  `merchantConfirmed` BOOLEAN NOT NULL DEFAULT false,
  `confirmedAt` DATETIME(3) NULL,
  `reviewedById` VARCHAR(30) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `needsClientReview` BOOLEAN NOT NULL DEFAULT true,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PaymentEligibilityRule_stableKey_key` (`stableKey`),
  INDEX `PaymentEligibilityRule_source_idx` (`sourceType`, `sourceKey`),
  INDEX `PaymentEligibilityRule_mode_review_idx` (`mode`, `needsClientReview`),
  INDEX `PaymentEligibilityRule_reviewedById_idx` (`reviewedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentTransaction` (
  `id` VARCHAR(30) NOT NULL,
  `orderId` VARCHAR(30) NOT NULL,
  `provider` ENUM('MANUAL_REVIEW', 'TEST_HOSTED', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL,
  `providerPaymentId` VARCHAR(191) NULL,
  `providerCheckoutId` VARCHAR(191) NULL,
  `transactionType` ENUM('PAYMENT', 'AUTHORIZATION', 'REFUND', 'MANUAL_CONFIRMATION') NOT NULL DEFAULT 'PAYMENT',
  `status` ENUM('CREATED', 'PENDING', 'REQUIRES_CUSTOMER_ACTION', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'EXPIRED') NOT NULL DEFAULT 'CREATED',
  `currencyCode` CHAR(3) NOT NULL,
  `amountMinor` INTEGER NOT NULL,
  `idempotencyKeyHash` CHAR(64) NULL,
  `failureCategory` VARCHAR(80) NULL,
  `failureReasonCode` VARCHAR(120) NULL,
  `safeMetadata` JSON NULL,
  `authorizedAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `refundedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  UNIQUE INDEX `PaymentTransaction_order_idempotency_key` (`orderId`, `idempotencyKeyHash`),
  UNIQUE INDEX `PaymentTransaction_provider_payment_key` (`provider`, `providerPaymentId`),
  UNIQUE INDEX `PaymentTransaction_provider_checkout_key` (`provider`, `providerCheckoutId`),
  INDEX `PaymentTransaction_order_created_idx` (`orderId`, `createdAt`),
  INDEX `PaymentTransaction_provider_status_created_idx` (`provider`, `status`, `createdAt`),
  INDEX `PaymentTransaction_status_created_idx` (`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentWebhookEvent` (
  `id` VARCHAR(30) NOT NULL,
  `provider` ENUM('MANUAL_REVIEW', 'TEST_HOSTED', 'EXTERNAL_HOSTED_CHECKOUT') NOT NULL,
  `eventIdHash` CHAR(64) NOT NULL,
  `eventType` VARCHAR(120) NOT NULL,
  `status` ENUM('RECEIVED', 'VERIFIED', 'PROCESSED', 'DUPLICATE', 'REJECTED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'RECEIVED',
  `signatureHash` CHAR(64) NULL,
  `transactionId` VARCHAR(30) NULL,
  `orderId` VARCHAR(30) NULL,
  `failureCode` VARCHAR(120) NULL,
  `safePayload` JSON NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PaymentWebhookEvent_provider_event_key` (`provider`, `eventIdHash`),
  INDEX `PaymentWebhookEvent_provider_status_received_idx` (`provider`, `status`, `receivedAt`),
  INDEX `PaymentWebhookEvent_transactionId_idx` (`transactionId`),
  INDEX `PaymentWebhookEvent_orderId_idx` (`orderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentRefund` (
  `id` VARCHAR(30) NOT NULL,
  `transactionId` VARCHAR(30) NOT NULL,
  `orderId` VARCHAR(30) NOT NULL,
  `amountMinor` INTEGER NOT NULL,
  `currencyCode` CHAR(3) NOT NULL,
  `status` ENUM('REQUESTED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  `providerRefundId` VARCHAR(191) NULL,
  `idempotencyKeyHash` CHAR(64) NULL,
  `reasonCode` VARCHAR(80) NOT NULL,
  `safeNote` VARCHAR(500) NULL,
  `requestedById` VARCHAR(30) NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  UNIQUE INDEX `PaymentRefund_transaction_idempotency_key` (`transactionId`, `idempotencyKeyHash`),
  UNIQUE INDEX `PaymentRefund_transaction_provider_key` (`transactionId`, `providerRefundId`),
  INDEX `PaymentRefund_order_created_idx` (`orderId`, `createdAt`),
  INDEX `PaymentRefund_status_created_idx` (`status`, `createdAt`),
  INDEX `PaymentRefund_requestedBy_created_idx` (`requestedById`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentTransactionEvent` (
  `id` VARCHAR(30) NOT NULL,
  `transactionId` VARCHAR(30) NOT NULL,
  `previousStatus` ENUM('CREATED', 'PENDING', 'REQUIRES_CUSTOMER_ACTION', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'EXPIRED') NULL,
  `newStatus` ENUM('CREATED', 'PENDING', 'REQUIRES_CUSTOMER_ACTION', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'EXPIRED') NOT NULL,
  `eventType` VARCHAR(80) NOT NULL,
  `sequence` INTEGER NOT NULL,
  `source` VARCHAR(80) NOT NULL,
  `actorId` VARCHAR(30) NULL,
  `webhookEventId` VARCHAR(30) NULL,
  `refundId` VARCHAR(30) NULL,
  `safeMetadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PaymentTransactionEvent_sequence_key` (`transactionId`, `sequence`),
  INDEX `PaymentTransactionEvent_transaction_created_idx` (`transactionId`, `createdAt`),
  INDEX `PaymentTransactionEvent_status_created_idx` (`newStatus`, `createdAt`),
  INDEX `PaymentTransactionEvent_actor_created_idx` (`actorId`, `createdAt`),
  INDEX `PaymentTransactionEvent_webhookEventId_idx` (`webhookEventId`),
  INDEX `PaymentTransactionEvent_refundId_idx` (`refundId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmailTemplate` (
  `id` VARCHAR(30) NOT NULL,
  `stableKey` VARCHAR(120) NOT NULL,
  `templateType` ENUM('VERIFY_EMAIL', 'PASSWORD_RESET', 'ORDER_CONFIRMATION', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'ORDER_STATUS_UPDATE', 'SUPPORT_NOTIFICATION') NOT NULL,
  `version` VARCHAR(80) NOT NULL,
  `subject` VARCHAR(240) NOT NULL,
  `htmlBody` TEXT NOT NULL,
  `textBody` TEXT NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `needsClientReview` BOOLEAN NOT NULL DEFAULT true,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EmailTemplate_stableKey_key` (`stableKey`),
  UNIQUE INDEX `EmailTemplate_type_version_key` (`templateType`, `version`),
  INDEX `EmailTemplate_type_enabled_idx` (`templateType`, `enabled`),
  INDEX `EmailTemplate_needsClientReview_idx` (`needsClientReview`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EmailDelivery` (
  `id` VARCHAR(30) NOT NULL,
  `templateId` VARCHAR(30) NULL,
  `templateType` ENUM('VERIFY_EMAIL', 'PASSWORD_RESET', 'ORDER_CONFIRMATION', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'ORDER_STATUS_UPDATE', 'SUPPORT_NOTIFICATION') NOT NULL,
  `transport` ENUM('SMTP', 'TEST_EMAIL') NOT NULL DEFAULT 'SMTP',
  `status` ENUM('PENDING', 'SUPPRESSED_DISABLED', 'SUPPRESSED_NOT_CONFIGURED', 'SENT', 'FAILED', 'RETRY_SCHEDULED') NOT NULL DEFAULT 'PENDING',
  `dedupeKey` VARCHAR(191) NOT NULL,
  `recipientHash` CHAR(64) NOT NULL,
  `orderId` VARCHAR(30) NULL,
  `userId` VARCHAR(30) NULL,
  `customerNotificationId` VARCHAR(30) NULL,
  `orderOutboxId` VARCHAR(30) NULL,
  `subject` VARCHAR(240) NOT NULL,
  `safeMetadata` JSON NULL,
  `externalMessageId` VARCHAR(191) NULL,
  `deliveryAttemptCount` INTEGER NOT NULL DEFAULT 0,
  `lastAttemptAt` DATETIME(3) NULL,
  `nextAttemptAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `lastFailureCode` VARCHAR(120) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `EmailDelivery_dedupeKey_key` (`dedupeKey`),
  INDEX `EmailDelivery_template_status_idx` (`templateType`, `status`),
  INDEX `EmailDelivery_order_created_idx` (`orderId`, `createdAt`),
  INDEX `EmailDelivery_user_created_idx` (`userId`, `createdAt`),
  INDEX `EmailDelivery_customerNotificationId_idx` (`customerNotificationId`),
  INDEX `EmailDelivery_orderOutboxId_idx` (`orderOutboxId`),
  INDEX `EmailDelivery_nextAttemptAt_idx` (`nextAttemptAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductionReadinessSetting` (
  `id` VARCHAR(30) NOT NULL,
  `stableKey` VARCHAR(120) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `label` VARCHAR(160) NOT NULL,
  `status` ENUM('READY', 'NOT_READY', 'DISABLED', 'NEEDS_CLIENT_REVIEW') NOT NULL DEFAULT 'NEEDS_CLIENT_REVIEW',
  `safeSummary` VARCHAR(500) NOT NULL,
  `needsClientReview` BOOLEAN NOT NULL DEFAULT true,
  `concurrencyVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ProductionReadinessSetting_stableKey_key` (`stableKey`),
  INDEX `ProductionReadinessSetting_category_status_idx` (`category`, `status`),
  INDEX `ProductionReadinessSetting_needsClientReview_idx` (`needsClientReview`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PaymentProviderConfiguration`
  ADD CONSTRAINT `PaymentProviderConfiguration_reviewedById_fkey`
  FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `CheckoutPaymentMethod`
  ADD CONSTRAINT `CheckoutPaymentMethod_providerConfigId_fkey`
  FOREIGN KEY (`providerConfigId`) REFERENCES `PaymentProviderConfiguration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PaymentEligibilityRule`
  ADD CONSTRAINT `PaymentEligibilityRule_reviewedById_fkey`
  FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PaymentTransaction`
  ADD CONSTRAINT `PaymentTransaction_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PaymentWebhookEvent`
  ADD CONSTRAINT `PaymentWebhookEvent_transactionId_fkey`
  FOREIGN KEY (`transactionId`) REFERENCES `PaymentTransaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentWebhookEvent_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PaymentRefund`
  ADD CONSTRAINT `PaymentRefund_transactionId_fkey`
  FOREIGN KEY (`transactionId`) REFERENCES `PaymentTransaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentRefund_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentRefund_requestedById_fkey`
  FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PaymentTransactionEvent`
  ADD CONSTRAINT `PaymentTransactionEvent_transactionId_fkey`
  FOREIGN KEY (`transactionId`) REFERENCES `PaymentTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentTransactionEvent_actorId_fkey`
  FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentTransactionEvent_webhookEventId_fkey`
  FOREIGN KEY (`webhookEventId`) REFERENCES `PaymentWebhookEvent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PaymentTransactionEvent_refundId_fkey`
  FOREIGN KEY (`refundId`) REFERENCES `PaymentRefund`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmailDelivery`
  ADD CONSTRAINT `EmailDelivery_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `EmailTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EmailDelivery_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EmailDelivery_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `EmailDelivery_customerNotificationId_fkey`
  FOREIGN KEY (`customerNotificationId`) REFERENCES `CustomerNotification`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `EmailDelivery_orderOutboxId_fkey`
  FOREIGN KEY (`orderOutboxId`) REFERENCES `OrderNotificationOutbox`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
