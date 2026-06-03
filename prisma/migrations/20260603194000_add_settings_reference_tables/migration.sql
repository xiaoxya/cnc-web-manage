-- Bring the production database in sync with the current Prisma schema.
-- The checks make this migration safe for servers that were previously patched with `prisma db push`.

CREATE TABLE IF NOT EXISTS `repair_vendors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `factories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `specs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `categoryId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factories' AND INDEX_NAME = 'factories_code_key'
        ),
        'SELECT 1',
        'CREATE UNIQUE INDEX `factories_code_key` ON `factories`(`code`)'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'specs' AND INDEX_NAME = 'specs_categoryId_idx'
        ),
        'SELECT 1',
        'CREATE INDEX `specs_categoryId_idx` ON `specs`(`categoryId`)'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tools' AND COLUMN_NAME = 'specId'
        ),
        'SELECT 1',
        'ALTER TABLE `tools` ADD COLUMN `specId` INTEGER NULL'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tools' AND COLUMN_NAME = 'maintenanceCount'
        ),
        'SELECT 1',
        'ALTER TABLE `tools` ADD COLUMN `maintenanceCount` INTEGER NOT NULL DEFAULT 0'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tool_transactions' AND COLUMN_NAME = 'factoryId'
        ),
        'SELECT 1',
        'ALTER TABLE `tool_transactions` ADD COLUMN `factoryId` INTEGER NULL'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_records' AND COLUMN_NAME = 'repairVendor'
        ),
        'SELECT 1',
        'ALTER TABLE `maintenance_records` ADD COLUMN `repairVendor` VARCHAR(191) NULL'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_records' AND COLUMN_NAME = 'previousStatus'
        ),
        'SELECT 1',
        'ALTER TABLE `maintenance_records` ADD COLUMN `previousStatus` VARCHAR(191) NULL'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_records' AND COLUMN_NAME = 'previousFactoryInfo'
        ),
        'SELECT 1',
        'ALTER TABLE `maintenance_records` ADD COLUMN `previousFactoryInfo` VARCHAR(191) NULL'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stocktakings' AND COLUMN_NAME = 'factoryId'
        ),
        'SELECT 1',
        'ALTER TABLE `stocktakings` ADD COLUMN `factoryId` INTEGER NULL'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tools' AND INDEX_NAME = 'tools_specId_idx'
        ),
        'SELECT 1',
        'CREATE INDEX `tools_specId_idx` ON `tools`(`specId`)'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tool_transactions' AND INDEX_NAME = 'tool_transactions_factoryId_idx'
        ),
        'SELECT 1',
        'CREATE INDEX `tool_transactions_factoryId_idx` ON `tool_transactions`(`factoryId`)'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stocktakings' AND INDEX_NAME = 'stocktakings_factoryId_idx'
        ),
        'SELECT 1',
        'CREATE INDEX `stocktakings_factoryId_idx` ON `stocktakings`(`factoryId`)'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'specs' AND CONSTRAINT_NAME = 'specs_categoryId_fkey'
        ),
        'SELECT 1',
        'ALTER TABLE `specs` ADD CONSTRAINT `specs_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `tool_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tools' AND CONSTRAINT_NAME = 'tools_specId_fkey'
        ),
        'SELECT 1',
        'ALTER TABLE `tools` ADD CONSTRAINT `tools_specId_fkey` FOREIGN KEY (`specId`) REFERENCES `specs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tool_transactions' AND CONSTRAINT_NAME = 'tool_transactions_factoryId_fkey'
        ),
        'SELECT 1',
        'ALTER TABLE `tool_transactions` ADD CONSTRAINT `tool_transactions_factoryId_fkey` FOREIGN KEY (`factoryId`) REFERENCES `factories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stocktakings' AND CONSTRAINT_NAME = 'stocktakings_factoryId_fkey'
        ),
        'SELECT 1',
        'ALTER TABLE `stocktakings` ADD CONSTRAINT `stocktakings_factoryId_fkey` FOREIGN KEY (`factoryId`) REFERENCES `factories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
