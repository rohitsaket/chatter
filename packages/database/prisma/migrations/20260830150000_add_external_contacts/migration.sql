-- CreateTable
CREATE TABLE `external_contacts` (
    `id` CHAR(36) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `email` VARCHAR(254) NULL,
    `phone` VARCHAR(24) NULL,
    `company` VARCHAR(80) NULL,
    `title` VARCHAR(80) NULL,
    `notes` TEXT NULL,
    `tags` JSON NULL,
    `favorite` BOOLEAN NOT NULL DEFAULT false,
    `blocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `external_contacts_ownerId_idx`(`ownerId`),
    UNIQUE INDEX `external_contacts_ownerId_email_key`(`ownerId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `external_contacts` ADD CONSTRAINT `external_contacts_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
