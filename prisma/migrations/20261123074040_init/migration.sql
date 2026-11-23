-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `namaPt` VARCHAR(191) NOT NULL,
    `tagline` VARCHAR(191) NULL,
    `alamatPt` TEXT NOT NULL,
    `telpPt` VARCHAR(191) NOT NULL,
    `npwpPt` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `kotaSurat` VARCHAR(191) NOT NULL DEFAULT 'Cikarang',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `ppnPercentage` DOUBLE NOT NULL DEFAULT 11.0,
    `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'AMS/CKR/',
    `bankInfo` TEXT NULL,
    `invoiceSignatory` VARCHAR(191) NOT NULL DEFAULT 'Dody Heryanto',
    `invoiceFooterNote` TEXT NULL,
    `sjFooterNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `canViewDashboard` BOOLEAN NOT NULL DEFAULT true,
    `canManageInvoice` BOOLEAN NOT NULL DEFAULT false,
    `canManageSuratJalan` BOOLEAN NOT NULL DEFAULT false,
    `canManageMasterData` BOOLEAN NOT NULL DEFAULT false,
    `canViewReports` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `namaPt` VARCHAR(191) NOT NULL,
    `picName` VARCHAR(191) NULL,
    `noTelp` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `alamatPengiriman` TEXT NOT NULL,
    `npwp` VARCHAR(191) NULL,
    `catatan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `kodeProduk` VARCHAR(191) NULL,
    `namaProduk` VARCHAR(191) NOT NULL,
    `satuan` VARCHAR(191) NOT NULL DEFAULT 'Pcs',
    `hargaDefault` DOUBLE NOT NULL DEFAULT 0,
    `keterangan` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `noInvoice` VARCHAR(191) NOT NULL,
    `noPo` VARCHAR(191) NULL,
    `tanggalInvoice` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statusDokumen` VARCHAR(191) NOT NULL DEFAULT 'AKTIF',
    `customerId` VARCHAR(191) NOT NULL,
    `metodePembayaran` VARCHAR(191) NOT NULL,
    `statusPembayaran` VARCHAR(191) NOT NULL,
    `statusPengiriman` VARCHAR(191) NOT NULL DEFAULT 'BELUM_DIKIRIM',
    `tanggalJatuhTempo` DATETIME(3) NULL,
    `tanggalLunas` DATETIME(3) NULL,
    `lunasById` VARCHAR(191) NULL,
    `usePpn` BOOLEAN NOT NULL DEFAULT false,
    `ppnRateApplied` DOUBLE NOT NULL DEFAULT 0,
    `useDiskon` BOOLEAN NOT NULL DEFAULT false,
    `diskonPersen` DOUBLE NULL,
    `diskonNominal` DOUBLE NULL,
    `diskonAmount` DOUBLE NOT NULL DEFAULT 0,
    `subtotal` DOUBLE NOT NULL,
    `ppnAmount` DOUBLE NOT NULL DEFAULT 0,
    `grandTotal` DOUBLE NOT NULL,
    `catatan` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_tenantId_noInvoice_key`(`tenantId`, `noInvoice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `namaProduk` VARCHAR(191) NOT NULL,
    `satuan` VARCHAR(191) NOT NULL,
    `qty` DOUBLE NOT NULL,
    `hargaSatuan` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuratJalan` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `noSuratJalan` VARCHAR(191) NOT NULL,
    `noPo` VARCHAR(191) NULL,
    `tanggalSuratJalan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `urutan` INTEGER NOT NULL DEFAULT 1,
    `statusPengiriman` VARCHAR(191) NOT NULL DEFAULT 'DIKIRIM',
    `buktiTerimaUrl` VARCHAR(191) NULL,
    `tanggalDiterima` DATETIME(3) NULL,
    `catatanPengiriman` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SuratJalan_tenantId_noSuratJalan_key`(`tenantId`, `noSuratJalan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuratJalanItem` (
    `id` VARCHAR(191) NOT NULL,
    `suratJalanId` VARCHAR(191) NOT NULL,
    `invoiceItemId` VARCHAR(191) NOT NULL,
    `namaProduk` VARCHAR(191) NOT NULL,
    `satuan` VARCHAR(191) NOT NULL,
    `qty` DOUBLE NOT NULL,
    `keterangan` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_lunasById_fkey` FOREIGN KEY (`lunasById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuratJalan` ADD CONSTRAINT `SuratJalan_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuratJalan` ADD CONSTRAINT `SuratJalan_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuratJalan` ADD CONSTRAINT `SuratJalan_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuratJalanItem` ADD CONSTRAINT `SuratJalanItem_suratJalanId_fkey` FOREIGN KEY (`suratJalanId`) REFERENCES `SuratJalan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuratJalanItem` ADD CONSTRAINT `SuratJalanItem_invoiceItemId_fkey` FOREIGN KEY (`invoiceItemId`) REFERENCES `InvoiceItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
