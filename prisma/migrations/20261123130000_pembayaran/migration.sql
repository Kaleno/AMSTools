ALTER TABLE `Invoice` ADD COLUMN `jumlahTerbayar` DOUBLE NOT NULL DEFAULT 0;

UPDATE `Invoice` SET `jumlahTerbayar` = `grandTotal` WHERE `statusPembayaran` = 'LUNAS';

CREATE TABLE `Pembayaran` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `jumlah` DOUBLE NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `catatan` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `Pembayaran_invoiceId_idx`(`invoiceId`),
    CONSTRAINT `Pembayaran_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `Pembayaran_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
