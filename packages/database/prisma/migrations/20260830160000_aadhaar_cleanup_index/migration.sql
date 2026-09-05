-- CreateIndex
CREATE INDEX `aadhaar_verifications_status_expiresAt_idx` ON `aadhaar_verifications`(`status`, `expiresAt`);
