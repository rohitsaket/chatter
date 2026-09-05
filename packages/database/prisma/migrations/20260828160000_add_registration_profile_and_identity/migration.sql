-- AlterTable
ALTER TABLE `users` ADD COLUMN `country` CHAR(2) NULL,
    ADD COLUMN `firstName` VARCHAR(191) NULL,
    ADD COLUMN `lastName` VARCHAR(191) NULL,
    ADD COLUMN `pinCode` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `user_identities` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `aadhaarEnc` TEXT NOT NULL,
    `aadhaarHash` CHAR(64) NOT NULL,
    `aadhaarLast4` CHAR(4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_identities_userId_key`(`userId`),
    UNIQUE INDEX `user_identities_aadhaarHash_key`(`aadhaarHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_identities` ADD CONSTRAINT `user_identities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
