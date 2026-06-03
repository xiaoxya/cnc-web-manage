-- Allow multiple categories to share the same code prefix.
ALTER TABLE `tool_categories` DROP INDEX `tool_categories_code_key`;
CREATE INDEX `tool_categories_code_idx` ON `tool_categories`(`code`);
