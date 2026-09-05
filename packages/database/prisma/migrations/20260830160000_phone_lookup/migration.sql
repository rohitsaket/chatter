-- AlterTable
ALTER TABLE `users` ADD COLUMN `phoneVerified` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user_settings` ADD COLUMN `phoneDiscoverable` VARCHAR(16) NOT NULL DEFAULT 'EVERYONE';

-- CreateIndex
-- Not UNIQUE: pre-existing rows hold non-E.164 values, so uniqueness stays
-- enforced in application code (as registration already does).
CREATE INDEX `users_phone_idx` ON `users`(`phone`);
