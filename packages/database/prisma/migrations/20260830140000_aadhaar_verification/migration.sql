-- AlterTable
ALTER TABLE `users` ADD COLUMN `identityStatus` ENUM('PENDING', 'VERIFIED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `identityVerificationRef` CHAR(36) NULL,
    ADD COLUMN `identityVerifiedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `aadhaar_verifications` (
    `id` CHAR(36) NOT NULL,
    `reference` CHAR(36) NOT NULL,
    `regSessionId` CHAR(64) NOT NULL,
    `aadhaarHash` CHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'OTP_SENT', 'VERIFIED', 'FAILED', 'EXPIRED', 'CANCELLED', 'CONSUMED') NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(191) NOT NULL,
    `providerRef` TEXT NULL,
    `providerStatus` VARCHAR(191) NULL,
    `authReference` TEXT NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `resendCount` INTEGER NOT NULL DEFAULT 0,
    `lastSentAt` DATETIME(3) NULL,
    `consentVersion` VARCHAR(191) NOT NULL,
    `consentAt` DATETIME(3) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `correlationId` CHAR(36) NOT NULL,
    `failureCode` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `aadhaar_verifications_reference_key`(`reference`),
    INDEX `aadhaar_verifications_regSessionId_createdAt_idx`(`regSessionId`, `createdAt`),
    INDEX `aadhaar_verifications_aadhaarHash_createdAt_idx`(`aadhaarHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
