-- CreateTable
CREATE TABLE `RealtimeUsage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `callSessionId` INTEGER NOT NULL,
    `responseCount` INTEGER NOT NULL DEFAULT 0,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `inputTextTokens` INTEGER NOT NULL DEFAULT 0,
    `inputAudioTokens` INTEGER NOT NULL DEFAULT 0,
    `inputCachedTokens` INTEGER NOT NULL DEFAULT 0,
    `inputCachedTextTokens` INTEGER NOT NULL DEFAULT 0,
    `inputCachedAudioTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTextTokens` INTEGER NOT NULL DEFAULT 0,
    `outputAudioTokens` INTEGER NOT NULL DEFAULT 0,
    `totalTokens` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RealtimeUsage_callSessionId_key`(`callSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RealtimeUsage` ADD CONSTRAINT `RealtimeUsage_callSessionId_fkey` FOREIGN KEY (`callSessionId`) REFERENCES `CallSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
