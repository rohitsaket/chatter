-- AlterTable
ALTER TABLE `conversation_participants` ADD COLUMN `clearedAt` DATETIME(3) NULL,
    ADD COLUMN `hiddenAt` DATETIME(3) NULL,
    ADD COLUMN `mutedUntil` DATETIME(3) NULL;
