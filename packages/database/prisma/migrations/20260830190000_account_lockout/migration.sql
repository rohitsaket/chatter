-- AlterTable: per-account brute-force lockout.
-- Rate limiting is per-IP and therefore cannot stop a distributed guessing
-- attack against one account; this counter is per-account and closes that gap.
ALTER TABLE `users` ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lockedUntil` DATETIME(3) NULL;
