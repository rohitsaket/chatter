-- Existing message.text rows are intentionally retained as legacy plaintext.
-- Every message created after this deployment uses message_encryption and a
-- NULL messages.text value. This migration does not pretend historical rows
-- were encrypted.

ALTER TABLE `devices`
  ADD COLUMN `deviceKeys` TEXT NULL,
  ADD COLUMN `protocolVersion` VARCHAR(64) NULL,
  ADD COLUMN `keyFingerprint` CHAR(64) NULL,
  ADD COLUMN `revokedAt` DATETIME(3) NULL,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `lastKeyChangeAt` DATETIME(3) NULL;

ALTER TABLE `files`
  ADD COLUMN `encrypted` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `one_time_keys` (
  `id` CHAR(36) NOT NULL,
  `deviceId` CHAR(36) NOT NULL,
  `keyId` VARCHAR(191) NOT NULL,
  `keyData` TEXT NOT NULL,
  `consumed` BOOLEAN NOT NULL DEFAULT false,
  `consumedAt` DATETIME(3) NULL,
  `fallback` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `one_time_keys_deviceId_keyId_key`(`deviceId`, `keyId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `one_time_keys_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `to_device_messages` (
  `id` CHAR(36) NOT NULL,
  `recipientUserId` CHAR(36) NOT NULL,
  `recipientDeviceId` CHAR(36) NOT NULL,
  `senderUserId` CHAR(36) NOT NULL,
  `senderDeviceId` CHAR(36) NOT NULL,
  `payload` TEXT NOT NULL,
  `eventType` VARCHAR(128) NOT NULL,
  `transactionId` VARCHAR(128) NOT NULL,
  `delivered` BOOLEAN NOT NULL DEFAULT false,
  `deliveredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `to_device_pending_idx`(`recipientUserId`, `recipientDeviceId`, `delivered`),
  UNIQUE INDEX `to_device_txn_key`(`senderDeviceId`, `recipientDeviceId`, `transactionId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `to_device_messages_recipientUserId_fkey` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `to_device_messages_recipientDeviceId_fkey` FOREIGN KEY (`recipientDeviceId`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `message_encryption` (
  `id` CHAR(36) NOT NULL,
  `messageId` CHAR(36) NOT NULL,
  `encryptedPayload` TEXT NOT NULL,
  `protocolVersion` VARCHAR(64) NOT NULL,
  `algorithm` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `senderDeviceId` CHAR(36) NOT NULL,
  `ciphertextHash` CHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `message_encryption_messageId_key`(`messageId`),
  UNIQUE INDEX `message_encryption_senderDeviceId_ciphertextHash_key`(`senderDeviceId`, `ciphertextHash`),
  PRIMARY KEY (`id`),
  CONSTRAINT `message_encryption_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
