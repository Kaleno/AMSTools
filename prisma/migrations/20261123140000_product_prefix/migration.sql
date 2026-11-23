ALTER TABLE `Tenant` ADD COLUMN `productPrefix` VARCHAR(191) NOT NULL DEFAULT 'PRD-';

UPDATE `Product` SET `kodeProduk` = NULL WHERE `kodeProduk` = '';

CREATE UNIQUE INDEX `Product_tenantId_kodeProduk_key` ON `Product`(`tenantId`, `kodeProduk`);
