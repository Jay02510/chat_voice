-- AlterTable
ALTER TABLE `Persona` ADD COLUMN `companyName` VARCHAR(191) NULL,
    ADD COLUMN `prohibitions` TEXT NULL;

-- AlterTable
ALTER TABLE `ScenarioType` ADD COLUMN `exampleSituation` TEXT NULL,
    ADD COLUMN `scenarioRules` TEXT NULL,
    ADD COLUMN `startingLine` TEXT NULL;

-- CreateTable
CREATE TABLE `ToneTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workType` VARCHAR(191) NOT NULL,
    `tierKey` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ToneTemplate_workType_tierKey_key`(`workType`, `tierKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
