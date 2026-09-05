-- Remove the Aadhaar OTP verification system.
--
-- The Aadhaar number itself is unaffected: `user_identities` (encrypted number,
-- HMAC fingerprint, last 4) is retained, so login by Aadhaar and the password
-- reset identifier match continue to work. Only the verification transaction
-- table and the per-user verification status it drove are dropped.

-- AlterTable
ALTER TABLE `users` DROP COLUMN `identityStatus`,
    DROP COLUMN `identityVerificationRef`,
    DROP COLUMN `identityVerifiedAt`;

-- DropTable
DROP TABLE `aadhaar_verifications`;
