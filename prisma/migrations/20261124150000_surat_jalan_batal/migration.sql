-- Nullable columns so existing surat jalan stay DIKIRIM and valid.
ALTER TABLE `SuratJalan`
    ADD COLUMN `alasanBatal` TEXT NULL,
    ADD COLUMN `batalAt` DATETIME(3) NULL,
    ADD COLUMN `batalById` VARCHAR(191) NULL;

ALTER TABLE `SuratJalan`
    ADD CONSTRAINT `SuratJalan_batalById_fkey` FOREIGN KEY (`batalById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
