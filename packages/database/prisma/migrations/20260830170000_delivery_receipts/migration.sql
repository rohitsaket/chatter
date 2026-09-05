-- AlterTable: delivery becomes a first-class, separate acknowledgement.
ALTER TABLE `message_receipts` ADD COLUMN `deliveredAt` DATETIME(3) NULL;

-- readAt becomes nullable: a receipt row may now record delivery alone.
ALTER TABLE `message_receipts` MODIFY COLUMN `readAt` DATETIME(3) NULL;

-- Backfill: every existing row was created by markRead, so those messages were
-- necessarily delivered before they were read. Without this, historic messages
-- would appear to regress from read to undelivered.
UPDATE `message_receipts` SET `deliveredAt` = `readAt` WHERE `deliveredAt` IS NULL;

-- CreateIndex
CREATE INDEX `message_receipts_userId_readAt_idx` ON `message_receipts`(`userId`, `readAt`);
