-- AlterTable
ALTER TABLE `Candidate` ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `CallSession` ADD COLUMN `expiresAt` DATETIME(3) NULL;
