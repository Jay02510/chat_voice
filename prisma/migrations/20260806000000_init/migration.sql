
-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'MANAGER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Candidate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `level` VARCHAR(191) NULL DEFAULT '미지정',
    `status` VARCHAR(191) NOT NULL DEFAULT '진행중',
    `magicToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Candidate_email_key`(`email`),
    UNIQUE INDEX `Candidate_magicToken_key`(`magicToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidateId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `tierId` INTEGER NULL,
    `personaId` INTEGER NULL,
    `magicToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    UNIQUE INDEX `CallSession_magicToken_key`(`magicToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `callSessionId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evaluation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `callSessionId` INTEGER NOT NULL,
    `overallScore` DOUBLE NOT NULL,
    `grade` VARCHAR(191) NOT NULL DEFAULT 'Grade D',
    `verdictSummary` TEXT NOT NULL,
    `basicScore` DOUBLE NOT NULL DEFAULT 0,
    `essentialScore` DOUBLE NOT NULL DEFAULT 0,
    `commScore` DOUBLE NOT NULL DEFAULT 0,
    `rubricResults` TEXT NOT NULL,
    `hiringSummary` TEXT NOT NULL,
    `riskAndCoaching` TEXT NOT NULL,
    `bantcq` TEXT NOT NULL,
    `talkRatio` VARCHAR(191) NOT NULL DEFAULT '50%:50%',
    `wpm` INTEGER NOT NULL DEFAULT 150,
    `listeningNotes` TEXT NOT NULL,
    `clarityNotes` TEXT NOT NULL,
    `callFlowPhases` TEXT NOT NULL,
    `keyQuotes` TEXT NOT NULL,
    `onboardingPlan` TEXT NOT NULL,
    `openingScore` INTEGER NOT NULL DEFAULT 0,
    `discoveryScore` INTEGER NOT NULL DEFAULT 0,
    `pitchScore` INTEGER NOT NULL DEFAULT 0,
    `objectionScore` INTEGER NOT NULL DEFAULT 0,
    `closingScore` INTEGER NOT NULL DEFAULT 0,
    `strengths` TEXT NOT NULL,
    `improvements` TEXT NOT NULL,
    `summary` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Evaluation_callSessionId_key`(`callSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `productName` VARCHAR(191) NOT NULL,
    `productPrice` VARCHAR(191) NOT NULL,
    `productPriceUnit` VARCHAR(191) NULL,
    `productBenefits` TEXT NOT NULL,
    `productCondition` TEXT NOT NULL,
    `evaluationPrompt` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DifficultyTier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `fixedBasePrompt` TEXT NOT NULL,
    `additionalInstructions` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 1,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DifficultyTier_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScoringCriteriaItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tierId` INTEGER NULL,
    `category` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `weight` DOUBLE NOT NULL DEFAULT 1.0,
    `maxScore` DOUBLE NOT NULL DEFAULT 1.0,
    `scoreSteps` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Persona` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `tierId` INTEGER NULL,
    `industry` VARCHAR(191) NULL,
    `productContext` TEXT NULL,
    `objectionProfile` TEXT NULL,
    `openingLine` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Persona_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallSession` ADD CONSTRAINT `CallSession_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallSession` ADD CONSTRAINT `CallSession_personaId_fkey` FOREIGN KEY (`personaId`) REFERENCES `Persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_callSessionId_fkey` FOREIGN KEY (`callSessionId`) REFERENCES `CallSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_callSessionId_fkey` FOREIGN KEY (`callSessionId`) REFERENCES `CallSession`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScoringCriteriaItem` ADD CONSTRAINT `ScoringCriteriaItem_tierId_fkey` FOREIGN KEY (`tierId`) REFERENCES `DifficultyTier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_tierId_fkey` FOREIGN KEY (`tierId`) REFERENCES `DifficultyTier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

