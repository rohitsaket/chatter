-- CreateTable
CREATE TABLE `password_resets` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `otpHash` CHAR(64) NOT NULL,
    `otpExpiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `resendCount` INTEGER NOT NULL DEFAULT 0,
    `lastSentAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `resetTokenHash` CHAR(64) NULL,
    `resetTokenExpiresAt` DATETIME(3) NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `password_resets_resetTokenHash_key`(`resetTokenHash`),
    INDEX `password_resets_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
