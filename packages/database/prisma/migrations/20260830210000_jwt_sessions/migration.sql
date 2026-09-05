ALTER TABLE `users`
  ADD COLUMN `status` ENUM('ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED') NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `sessions`
  MODIFY `tokenHash` VARCHAR(191) NULL,
  ADD COLUMN `deviceId` CHAR(36) NULL,
  ADD COLUMN `refreshFamilyId` CHAR(36) NULL,
  ADD COLUMN `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `reuseDetectedAt` DATETIME(3) NULL;

UPDATE `sessions`
SET `deviceId` = UUID(), `refreshFamilyId` = UUID()
WHERE `deviceId` IS NULL OR `refreshFamilyId` IS NULL;

ALTER TABLE `sessions`
  MODIFY `deviceId` CHAR(36) NOT NULL,
  MODIFY `refreshFamilyId` CHAR(36) NOT NULL,
  ADD UNIQUE INDEX `sessions_refreshFamilyId_key`(`refreshFamilyId`),
  ADD INDEX `sessions_userId_deviceId_idx`(`userId`, `deviceId`);

CREATE TABLE `refresh_tokens` (
  `id` CHAR(36) NOT NULL,
  `jti` CHAR(36) NOT NULL,
  `sessionId` CHAR(36) NOT NULL,
  `familyId` CHAR(36) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `parentJti` CHAR(36) NULL,
  `replacedByJti` CHAR(36) NULL,
  `issuedAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  UNIQUE INDEX `refresh_tokens_jti_key`(`jti`),
  UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
  INDEX `refresh_tokens_sessionId_expiresAt_idx`(`sessionId`, `expiresAt`),
  INDEX `refresh_tokens_familyId_issuedAt_idx`(`familyId`, `issuedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `refresh_tokens_sessionId_fkey`
  FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
