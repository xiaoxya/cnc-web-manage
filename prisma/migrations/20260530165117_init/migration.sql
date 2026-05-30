-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    `displayName` VARCHAR(100) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tool_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `counter` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tool_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `locations_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tools` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `toolCode` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `specification` VARCHAR(255) NULL,
    `material` VARCHAR(100) NULL,
    `brand` VARCHAR(100) NULL,
    `categoryId` INTEGER NOT NULL,
    `locationId` INTEGER NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `minQuantity` INTEGER NOT NULL DEFAULT 1,
    `unit` VARCHAR(20) NOT NULL DEFAULT '把',
    `price` DECIMAL(10, 2) NULL,
    `status` ENUM('IN_STOCK', 'IN_USE', 'MAINTENANCE', 'SCRAPPED') NOT NULL DEFAULT 'IN_STOCK',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tools_toolCode_key`(`toolCode`),
    INDEX `tools_categoryId_idx`(`categoryId`),
    INDEX `tools_locationId_idx`(`locationId`),
    INDEX `tools_status_idx`(`status`),
    INDEX `tools_toolCode_idx`(`toolCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tool_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `toolId` INTEGER NOT NULL,
    `type` ENUM('IN', 'OUT') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `operatorId` INTEGER NOT NULL,
    `referenceNo` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tool_transactions_toolId_idx`(`toolId`),
    INDEX `tool_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `toolId` INTEGER NOT NULL,
    `status` ENUM('IN_MAINTENANCE', 'COMPLETED') NOT NULL DEFAULT 'IN_MAINTENANCE',
    `description` TEXT NOT NULL,
    `cost` DECIMAL(10, 2) NULL,
    `reporterId` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `maintenance_records_toolId_idx`(`toolId`),
    INDEX `maintenance_records_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocktakings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stocktakingNo` VARCHAR(50) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
    `operatorId` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stocktakings_stocktakingNo_key`(`stocktakingNo`),
    INDEX `stocktakings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocktaking_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stocktakingId` INTEGER NOT NULL,
    `toolId` INTEGER NOT NULL,
    `expectedQuantity` INTEGER NOT NULL,
    `actualQuantity` INTEGER NOT NULL,
    `difference` INTEGER NOT NULL,
    `notes` TEXT NULL,

    UNIQUE INDEX `stocktaking_items_stocktakingId_toolId_key`(`stocktakingId`, `toolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tools` ADD CONSTRAINT `tools_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `tool_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tools` ADD CONSTRAINT `tools_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transactions` ADD CONSTRAINT `tool_transactions_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transactions` ADD CONSTRAINT `tool_transactions_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_records` ADD CONSTRAINT `maintenance_records_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocktakings` ADD CONSTRAINT `stocktakings_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocktaking_items` ADD CONSTRAINT `stocktaking_items_stocktakingId_fkey` FOREIGN KEY (`stocktakingId`) REFERENCES `stocktakings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocktaking_items` ADD CONSTRAINT `stocktaking_items_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
