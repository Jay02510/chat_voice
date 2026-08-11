-- AlterTable
ALTER TABLE `CallSession` ADD COLUMN `scenarioTypeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Evaluation` ADD COLUMN `advancedSkillScore` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `coreSkillScore` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Persona` ADD COLUMN `scenarioTypeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ScoringCriteriaItem` ADD COLUMN `scenarioTypeId` INTEGER NULL;

-- CreateTable
CREATE TABLE `ScenarioType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `workType` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ScenarioType_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CallSession` ADD CONSTRAINT `CallSession_scenarioTypeId_fkey` FOREIGN KEY (`scenarioTypeId`) REFERENCES `ScenarioType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScoringCriteriaItem` ADD CONSTRAINT `ScoringCriteriaItem_scenarioTypeId_fkey` FOREIGN KEY (`scenarioTypeId`) REFERENCES `ScenarioType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_scenarioTypeId_fkey` FOREIGN KEY (`scenarioTypeId`) REFERENCES `ScenarioType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
