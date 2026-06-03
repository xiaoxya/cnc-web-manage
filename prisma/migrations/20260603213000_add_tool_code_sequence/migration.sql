-- Global tool code sequence for Q+00001 style numbering.

CREATE TABLE IF NOT EXISTS `tool_code_sequences` (
    `id` INTEGER NOT NULL,
    `nextValue` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `tool_code_sequences` (`id`, `nextValue`, `createdAt`, `updatedAt`)
SELECT
    1,
    COALESCE(
        (
            SELECT MAX(CAST(SUBSTRING(`toolCode`, 3) AS UNSIGNED)) + 1
            FROM `tools`
            WHERE `toolCode` REGEXP '^Q\\+[0-9]{5}$'
        ),
        1
    ),
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM DUAL
ON DUPLICATE KEY UPDATE
    `nextValue` = GREATEST(`nextValue`, VALUES(`nextValue`)),
    `updatedAt` = VALUES(`updatedAt`);
