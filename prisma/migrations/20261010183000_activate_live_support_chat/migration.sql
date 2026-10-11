-- One-time activation explicitly requested by the owner. Later staff settings are preserved by seeding.
UPDATE `FeatureFlag` SET `enabled` = true, `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `key` IN ('live_chat_enabled', 'guest_live_chat_enabled', 'customer_live_chat_enabled');

UPDATE `ChatSettings` SET `availabilityMode` = 'ONLINE', `publicLauncherEnabled` = true,
`offlineIntakeEnabled` = true, `pollingFallbackIntervalSeconds` = 5,
`realtimeExpected` = false, `needsClientReview` = false,
`publicOnlineMessage` = 'Send a message and our support team will reply here. You can keep browsing while you wait.',
`publicOfflineMessage` = 'Our team is away. Leave a message and return to this chat for a reply.',
`concurrencyVersion` = `concurrencyVersion` + 1, `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `stableKey` = 'chat-default-settings';
