-- AlterTable: widen Candidate.name/phone to TEXT to fit AES-GCM ciphertext
-- (iv:authTag:encrypted hex, longer than the plaintext). Existing plaintext
-- rows are unaffected — decrypt() passes through anything without the
-- iv:authTag:data delimiter format unchanged.
ALTER TABLE `Candidate` MODIFY COLUMN `name` TEXT NOT NULL;
ALTER TABLE `Candidate` MODIFY COLUMN `phone` TEXT NULL;
