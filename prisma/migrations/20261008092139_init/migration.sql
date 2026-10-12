-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `role` ENUM('learner', 'reviewer', 'admin') NOT NULL DEFAULT 'learner',
    `showRomaji` BOOLEAN NOT NULL DEFAULT true,
    `onboardedAt` DATETIME(3) NULL,
    `status` ENUM('active', 'deactivated') NOT NULL DEFAULT 'active',
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `failedWindowStart` DATETIME(3) NULL,
    `sessionVersion` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('verify', 'reset') NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_tokens_tokenHash_key`(`tokenHash`),
    INDEX `email_tokens_userId_type_idx`(`userId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `levels` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `kind` ENUM('word', 'phrase', 'sentence') NOT NULL,
    `subtitle` VARCHAR(200) NOT NULL,
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'published',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `levelId` INTEGER NOT NULL,
    `order` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `sets_levelId_order_key`(`levelId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setId` INTEGER NOT NULL,
    `order` INTEGER NOT NULL,
    `kana` VARCHAR(255) NOT NULL,
    `romaji` VARCHAR(255) NOT NULL,
    `english` VARCHAR(255) NOT NULL,
    `note` TEXT NOT NULL,
    `parts` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `reviewStatus` ENUM('draft', 'in_review', 'approved', 'wrong') NOT NULL DEFAULT 'draft',

    UNIQUE INDEX `items_setId_order_key`(`setId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_audio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `voice` VARCHAR(40) NOT NULL,
    `speed` VARCHAR(10) NOT NULL,
    `filePath` VARCHAR(255) NOT NULL,
    `textHash` VARCHAR(64) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `item_audio_itemId_voice_speed_key`(`itemId`, `voice`, `speed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `reviewerId` INTEGER NOT NULL,
    `target` VARCHAR(10) NOT NULL,
    `verdict` ENUM('draft', 'in_review', 'approved', 'wrong') NOT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roleplays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order` INTEGER NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `scene` VARCHAR(255) NOT NULL,
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'published',

    UNIQUE INDEX `roleplays_order_key`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roleplay_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleplayId` INTEGER NOT NULL,
    `order` INTEGER NOT NULL,
    `speaker` ENUM('colleague', 'you') NOT NULL,
    `kana` VARCHAR(255) NOT NULL,
    `romaji` VARCHAR(255) NOT NULL,
    `english` VARCHAR(255) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `reviewStatus` ENUM('draft', 'in_review', 'approved', 'wrong') NOT NULL DEFAULT 'draft',

    UNIQUE INDEX `roleplay_lines_roleplayId_order_key`(`roleplayId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_items` (
    `userId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `learnedAt` DATETIME(3) NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `itemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_levels` (
    `userId` INTEGER NOT NULL,
    `levelId` INTEGER NOT NULL,
    `unlockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unlockedVia` ENUM('start', 'progress', 'quiz') NOT NULL,
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`userId`, `levelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roleplays` (
    `userId` INTEGER NOT NULL,
    `roleplayId` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `roleplayId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `points_ledger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `delta` INTEGER NOT NULL,
    `reason` ENUM('quiz', 'set', 'level', 'roleplay', 'unlock') NOT NULL,
    `refKey` VARCHAR(80) NOT NULL,
    `localDate` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `points_ledger_userId_idx`(`userId`),
    UNIQUE INDEX `points_ledger_userId_reason_refKey_key`(`userId`, `reason`, `refKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_sets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `localDate` DATE NOT NULL,
    `setNo` INTEGER NOT NULL,
    `itemIds` TEXT NOT NULL,
    `builtForMaxLevel` INTEGER NOT NULL,

    UNIQUE INDEX `quiz_sets_userId_localDate_setNo_key`(`userId`, `localDate`, `setNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_item_review` (
    `userId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `step` INTEGER NOT NULL DEFAULT 0,
    `dueDate` DATE NOT NULL,
    `lastResult` BOOLEAN NOT NULL,
    `lastAnsweredAt` DATETIME(3) NOT NULL,

    INDEX `user_item_review_userId_dueDate_idx`(`userId`, `dueDate`),
    PRIMARY KEY (`userId`, `itemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `kind` ENUM('daily', 'unlock', 'level') NOT NULL,
    `quizSetId` INTEGER NULL,
    `targetLevel` INTEGER NULL,
    `answers` TEXT NOT NULL,
    `score` INTEGER NOT NULL,
    `pointsAwarded` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `quiz_attempts_userId_kind_idx`(`userId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('learn', 'say_it', 'quiz', 'roleplay') NOT NULL,
    `itemId` INTEGER NULL,
    `localDate` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `study_events_userId_localDate_idx`(`userId`, `localDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_activity` (
    `userId` INTEGER NOT NULL,
    `localDate` DATE NOT NULL,
    `itemsLearned` INTEGER NOT NULL DEFAULT 0,
    `quizDone` BOOLEAN NOT NULL DEFAULT false,
    `qualified` BOOLEAN NOT NULL DEFAULT false,
    `restUsed` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`userId`, `localDate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `streaks` (
    `userId` INTEGER NOT NULL,
    `current` INTEGER NOT NULL DEFAULT 0,
    `longest` INTEGER NOT NULL DEFAULT 0,
    `lastQualifiedDate` DATE NULL,
    `restWeek` DATE NULL,
    `restUsed` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `target` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_tokens` ADD CONSTRAINT `email_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sets` ADD CONSTRAINT `sets_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `sets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_audio` ADD CONSTRAINT `item_audio_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_reviews` ADD CONSTRAINT `item_reviews_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roleplay_lines` ADD CONSTRAINT `roleplay_lines_roleplayId_fkey` FOREIGN KEY (`roleplayId`) REFERENCES `roleplays`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_items` ADD CONSTRAINT `user_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_items` ADD CONSTRAINT `user_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_levels` ADD CONSTRAINT `user_levels_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_levels` ADD CONSTRAINT `user_levels_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roleplays` ADD CONSTRAINT `user_roleplays_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roleplays` ADD CONSTRAINT `user_roleplays_roleplayId_fkey` FOREIGN KEY (`roleplayId`) REFERENCES `roleplays`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `points_ledger` ADD CONSTRAINT `points_ledger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_sets` ADD CONSTRAINT `quiz_sets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_item_review` ADD CONSTRAINT `user_item_review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_item_review` ADD CONSTRAINT `user_item_review_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_quizSetId_fkey` FOREIGN KEY (`quizSetId`) REFERENCES `quiz_sets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_events` ADD CONSTRAINT `study_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_events` ADD CONSTRAINT `study_events_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_activity` ADD CONSTRAINT `daily_activity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `streaks` ADD CONSTRAINT `streaks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
