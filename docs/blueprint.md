# BLUEPRINT.md — Sistem Pencatatan Transaksi, Invoice & Surat Jalan Multi-Tenant

Dokumen ini adalah sumber kebenaran spesifikasi. Foto Invoice & Surat Jalan yang dilampirkan adalah **referensi isi/kop/kolom**, bukan aturan baku ukuran, nomor, atau kertas. Nomor dokumen dan mesin cetak mengikuti aturan di bawah (sistem baru, bukan Excel lama).

---

## 1. Project Overview & Tech Stack

Sistem web internal **multi-tenant** untuk pencatatan penjualan, Invoice, Surat Jalan (kirim sekaligus atau sebagian), pelacakan piutang/jatuh tempo, dan riwayat pembelian pelanggan. **Bukan** sistem stok/gudang — trader sederhana: catat jual, cetak dokumen, panjat piutang.

### Wajib: Login
Seluruh aplikasi **di belakang login**. Tidak ada halaman operasional publik.
- Halaman `/login` (email + password).
- Session JWT di HTTP-Only cookie; middleware menolak yang belum login (redirect `/login`).
- Role: `SUPER_ADMIN` | `OWNER` | `ADMIN` + checklist permission Admin.
- Tenant `SUSPENDED` / user `isActive=false` → tidak bisa masuk.
- Seed awal: 1 akun `SUPER_ADMIN`. Owner dibuat dari panel SUPER_ADMIN (bukan register publik).

### Tech Stack (dipilih agar lokal & hosting VPS gampang)
- **Runtime**: Node.js 20 LTS (satu-satunya server; **bukan** PHP/Apache Laragon sebagai app server).
- **Framework**: Next.js 14+ App Router, TypeScript. Produksi: `next build` + `next start` (port 3000) di belakang nginx/Caddy.
- **Styling & UI**: Tailwind CSS + Lucide React (theme **Steel Blue `#4682B4`**).
- **PWA**: Manifest + service worker, `display: standalone`, ikon di `public/images/`. Install butuh **HTTPS** di production (`localhost` boleh HTTP). CRUD tetap online.
- **Database**: **MySQL 8 / MariaDB** + Prisma (`provider = "mysql"`). Lokal = MySQL/MariaDB bawaan **Laragon**. Production = MySQL/MariaDB **Rumahweb**. Satu schema, beda `DATABASE_URL` di `.env`.
- **Auth**: Custom JWT (`jose` + `bcryptjs`) — cukup untuk RBAC internal, tanpa NextAuth/OAuth.
- **File**: folder disk `uploads/logos` & `uploads/proofs` **di luar** `public/` (bukti terima tidak boleh URL tebak-tebakan). Disajikan lewat route terautentikasi.
- **Print**: browser `@media print` continuous form 9.5" × 11". Tidak ada layanan print server.

**Tidak dipakai:** SQLite, PostgreSQL, Vercel/serverless, S3, Redis, Docker wajib, NextAuth.

### Lingkungan lokal (Laragon Windows)
Laragon = MySQL/MariaDB + (opsional) vhost. App tetap proses **Node**, bukan PHP Apache:
1. Start Laragon (MySQL running, port `3306`).
2. Buat database `amstools` (HeidiSQL / phpMyAdmin Laragon).
3. `.env`: `DATABASE_URL="mysql://root:@127.0.0.1:3306/amstools"` (user `root` password kosong = default Laragon; sesuaikan jika diubah).
4. `npm install` → `npx prisma migrate dev` → `npm run dev` → `http://localhost:3000`
5. Opsional: proxy `amstools.test` → `127.0.0.1:3000`

MariaDB Laragon **kompatibel** dengan Prisma `mysql`.

### Hosting production — Rumahweb
Target: **VPS Rumahweb Linux ≥ 2GB RAM** (paket 512MB terlalu sempit untuk Next.js + MySQL).
- Node 20 + nginx/Caddy (HTTPS Let's Encrypt) + PM2 → `next start`
- MySQL/MariaDB di VPS yang sama (atau database MySQL Rumahweb terpisah)
- Folder `uploads/` di disk VPS
- Env: `DATABASE_URL`, `JWT_SECRET`, `APP_URL` (HTTPS)
- Deploy: `git pull` → `npm ci` → `npx prisma migrate deploy` → `next build` → restart PM2

**Jangan** pakai hosting PHP/cPanel biasa di Rumahweb — Next.js tidak jalan di Apache-PHP. Cloud Hosting Rumahweb yang ada Node.js bisa, tapi VPS lebih bersih untuk `next start` + upload + PWA.

### Design System
- Primary: `#4682B4` · Hover: `#36648B` · Tint: `#F0F5FA` · Border: `#D0E0EE`
- Surface: `#F8FAFC` · Card: `#FFFFFF`
- Status: `LUNAS`/`DITERIMA` Emerald · `BELUM_LUNAS`/`SEBAGIAN` Amber · `OVERDUE` Rose · `DIKIRIM` Steel Blue

### Aturan uang & waktu
- Mata uang IDR, dibulatkan ke **rupiah penuh**.
- Separator tampilan mengikuti contoh: `1,500` / `1,800,000`.
- Timezone **WIB (Asia/Jakarta)** untuk tanggal dokumen dan nomor urut harian.

---

## 2. Multi-Tenant Role & Permission

Data operasional wajib terisolasi `tenantId`. Satu Owner = satu PT. Beberapa Admin per PT.

### `SUPER_ADMIN` (global, `tenantId` null)
- Dashboard semua perusahaan.
- CRUD akun Owner: nama, email, password, Nama PT, alamat, telp, tagline, kota surat.
- Toggle `ACTIVE` / `SUSPENDED` pada Tenant. Suspended → Owner + Admin tidak bisa login.

### `OWNER` (satu `tenantId`)
- Akses penuh semua modul.
- **Pengaturan Perusahaan & Cetakan**:
  - Nama PT, tagline (mis. `GENERAL TRADING AND CONSUMABLE`), alamat, telp, NPWP opsional, logo opsional, **kota surat** (mis. `Cikarang`).
  - PPN default `%` (11 / 12).
  - Format nomor dokumen: `invoicePrefix` (mis. `AMS/CKR/`) dipakai **Invoice dan Surat Jalan** — tahun, bulan Romawi, tanggal, dan urutan harian di-generate sistem.
  - Info rekening (cetak Invoice), nama penandatangan Invoice, catatan kaki Invoice/SJ opsional.
- **Admin**: tambah/edit/nonaktif + checklist permission:
  1. `canViewDashboard`
  2. `canManageInvoice`
  3. `canManageSuratJalan`
  4. `canManageMasterData`
  5. `canViewReports`

### `ADMIN`
- Sidebar & proteksi rute hanya sesuai permission.
- Audit: `createdById` / `updatedById` pada Invoice & Surat Jalan.

---

## 3. Core Business Flow

### 3.1 Buat Invoice
1. Form **Buat Invoice**.
2. Field:
   - `noInvoice`: auto sesuai format di bawah, **bisa edit manual**, unik per tenant.
   - `noPo`: **selalu opsional** (dari customer).
   - `tanggalInvoice`: default hari ini, bisa diubah. Nomor memakai tanggal dokumen ini (bukan jam generate).
   - `customerId` wajib.
   - `items`: produk master → `qty`, `hargaSatuan` (override harga default), `satuan` snapshot.
   - `useDiskon`: opsional. Diskon **level invoice** (`diskonPersen` **atau** `diskonNominal`, salah satu). Tidak ada diskon per-baris di v1.
   - `usePpn`: opsional. PPN = `(subtotal - diskon) * ppnRate / 100` (PPN dihitung **setelah** diskon).
   - `metodePembayaran`:
     - `CASH` → `LUNAS`, `tanggalLunas` otomatis, jatuh tempo disembunyikan.
     - `CREDIT` → `BELUM_LUNAS`, **wajib** `tanggalJatuhTempo`. Pelunasan hanya **100%** (tombol Tandai Lunas). Tidak ada DP/cicilan/partial.
3. Rumus:
   - `subtotal` = Σ (qty × hargaSatuan)
   - `diskonAmount` = persen dari subtotal, atau nominal
   - `dpp` = subtotal − diskonAmount
   - `ppnAmount` = usePpn ? round(dpp × rate / 100) : 0
   - `grandTotal` = dpp + ppnAmount
4. Invoice **tidak** auto-membuat Surat Jalan. User buat SJ dari detail Invoice (sekaligus atau sebagian).

### 3.2 Nomor dokumen (Invoice & Surat Jalan — format sama)

Format (sistem baru; nomor Excel lama seperti `…/XI/263` tidak dipakai):

```
{prefix}{YYYY}/{ROMAN_MONTH}/{DD}{SEQ}
```

Contoh 23 Nov 2026, dokumen ke-1 hari itu: `AMS/CKR/2026/XI/2301`  
`prefix` tenant default `AMS/CKR/` (editable).  
`ROMAN_MONTH`: I … XII dari **tanggal dokumen** (invoice → `tanggalInvoice`, SJ → `tanggalSuratJalan`).  
`DD`: 2 digit tanggal.  
`SEQ`: 2 digit urutan **per tenant, per jenis dokumen, per hari kalender** (`01`–`99`; jika tembus → 3 digit).

Invoice dan Surat Jalan **masing-masing punya counter harian sendiri**. Boleh terjadi Invoice `…/2301` dan SJ `…/2301` (jenis beda, unik terpisah). Kirim 2 kali di hari yang sama → SJ `…/2301` lalu `…/2302`, bukan sufiks `-2`.

Setelah nomor tersimpan, **ubah tanggal tidak meregenerate nomor**. Edit manual tetap dicek unik dalam jenisnya.

### 3.3 Surat Jalan — kirim sekaligus ATAU sebagian

Relasi **Invoice 1 : N Surat Jalan**. Tidak ada modul stok.

Dari detail Invoice → **Buat Surat Jalan**:
- Form menampilkan item invoice + `qtyInvoice`, `qtySudahDikirim`, `qtySisa`.
- Default: semua `qtySisa` terisi (siap “kirim sisa / sekaligus”).
- User boleh turunkan qty per baris, kosongkan baris (qty 0 = tidak masuk SJ ini), isi `keterangan` per baris (catatan packing bebas, mis. `2 Dus + 1 Pack`) — **bukan** kartu stok.
- Tidak boleh qty > sisa. Tidak boleh barang di luar invoice.
- `noPo` & customer disalin dari invoice. `tanggalSuratJalan` default hari ini, editable sebelum cetak.
- `noSuratJalan`: auto format §3.2 dari tanggal SJ, **bisa edit manual**, unik per tenant. Tidak menyalin nomor invoice dan tidak memakai sufiks `-2`.

**Status pengiriman Invoice** (agregat dari SJ):
- `BELUM_DIKIRIM` — belum ada SJ
- `SEBAGIAN` — ada SJ dan masih ada qty sisa
- `TERKIRIM` — sisa semua item = 0

**Status per Surat Jalan**: `DIKIRIM` → unggah 1 foto bukti → `DITERIMA` + `tanggalDiterima`. Foto bisa diganti; tidak ada mundur status otomatis.

### 3.4 Edit / batal Invoice (disepakati)

- **Belum ada SJ**: edit bebas (item, harga, qty, customer, PPN/diskon, tanggal, nomor selama unik).
- **Sudah ada ≥1 SJ**: tidak boleh kurangi qty item di bawah yang sudah dikirim; boleh **tambah item baru** atau **naikkan qty** (sisa bertambah). Tidak boleh hapus item yang sudah pernah masuk SJ. Nomor invoice terkunci.
- **Ada SJ `DITERIMA` atau invoice `LUNAS`**: header pembayaran & item terkunci (kecuali catatan).
- Tidak hard-delete. Aksi **Batalkan (VOID)** hanya jika belum ada SJ `DITERIMA` dan belum lunas. Invoice void tidak masuk omzet/piutang.

### 3.5 Pelunasan CREDIT
Tombol **Tandai Lunas** di detail Invoice dan Laporan Jatuh Tempo → `LUNAS` + `tanggalLunas` + user verifikasi.

---

## 4. Database Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id                  String   @id @default(cuid())
  namaPt              String
  tagline             String?
  alamatPt            String
  telpPt              String
  npwpPt              String?
  logoUrl             String?
  kotaSurat           String   @default("Cikarang")
  isActive            Boolean  @default(true)

  ppnPercentage       Float    @default(11.0)
  invoicePrefix       String   @default("AMS/CKR/")
  bankInfo            String?
  invoiceSignatory    String   @default("Dody Heryanto")
  invoiceFooterNote   String?
  sjFooterNote        String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  users               User[]
  customers           Customer[]
  products            Product[]
  invoices            Invoice[]
  suratJalans         SuratJalan[]
}

model User {
  id                  String   @id @default(cuid())
  tenantId            String?
  tenant              Tenant?  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  name                String
  email               String   @unique
  passwordHash        String
  role                String   // SUPER_ADMIN | OWNER | ADMIN
  isActive            Boolean  @default(true)

  canViewDashboard    Boolean  @default(true)
  canManageInvoice    Boolean  @default(false)
  canManageSuratJalan Boolean  @default(false)
  canManageMasterData Boolean  @default(false)
  canViewReports      Boolean  @default(false)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  createdInvoices     Invoice[]    @relation("InvoiceCreator")
  updatedInvoices     Invoice[]    @relation("InvoiceUpdater")
  createdSuratJalans  SuratJalan[] @relation("SjCreator")
  paidInvoices        Invoice[]    @relation("InvoicePaidBy")
}

model Customer {
  id               String   @id @default(cuid())
  tenantId         String
  tenant           Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  namaPt           String
  picName          String?
  noTelp           String
  email            String?
  alamatPengiriman String
  npwp             String?
  catatan          String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  invoices         Invoice[]
}

model Product {
  id           String   @id @default(cuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  kodeProduk   String?
  namaProduk   String
  satuan       String   @default("Pcs")
  hargaDefault Float    @default(0)
  keterangan   String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  invoiceItems InvoiceItem[]
}

model Invoice {
  id                  String    @id @default(cuid())
  tenantId            String
  tenant              Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  noInvoice           String
  noPo                String?
  tanggalInvoice      DateTime  @default(now())
  statusDokumen       String    @default("AKTIF") // AKTIF | VOID

  customerId          String
  customer            Customer  @relation(fields: [customerId], references: [id])

  metodePembayaran    String    // CASH | CREDIT
  statusPembayaran    String    // LUNAS | BELUM_LUNAS
  statusPengiriman    String    @default("BELUM_DIKIRIM") // BELUM_DIKIRIM | SEBAGIAN | TERKIRIM
  tanggalJatuhTempo   DateTime?
  tanggalLunas        DateTime?
  lunasById           String?
  lunasBy             User?     @relation("InvoicePaidBy", fields: [lunasById], references: [id])

  usePpn              Boolean   @default(false)
  ppnRateApplied      Float     @default(0)
  useDiskon           Boolean   @default(false)
  diskonPersen        Float?
  diskonNominal       Float?
  diskonAmount        Float     @default(0)
  subtotal            Float
  ppnAmount           Float     @default(0)
  grandTotal          Float
  catatan             String?

  createdById         String
  createdBy           User      @relation("InvoiceCreator", fields: [createdById], references: [id])
  updatedById         String?
  updatedBy           User?     @relation("InvoiceUpdater", fields: [updatedById], references: [id])

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  items               InvoiceItem[]
  suratJalans         SuratJalan[]

  @@unique([tenantId, noInvoice])
}

model InvoiceItem {
  id          String  @id @default(cuid())
  invoiceId   String
  invoice     Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  productId   String
  product     Product @relation(fields: [productId], references: [id])

  namaProduk  String
  satuan      String
  qty         Float
  hargaSatuan Float
  subtotal    Float

  suratJalanItems SuratJalanItem[]
}

model SuratJalan {
  id                 String    @id @default(cuid())
  tenantId           String
  tenant             Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  invoiceId          String
  invoice            Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  noSuratJalan       String
  noPo               String?
  tanggalSuratJalan  DateTime  @default(now())
  urutan             Int       @default(1) // 1, 2, 3 … per invoice

  statusPengiriman   String    @default("DIKIRIM") // DIKIRIM | DITERIMA
  buktiTerimaUrl     String?
  tanggalDiterima    DateTime?
  catatanPengiriman  String?

  createdById        String
  createdBy          User      @relation("SjCreator", fields: [createdById], references: [id])

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  items              SuratJalanItem[]

  @@unique([tenantId, noSuratJalan])
}

model SuratJalanItem {
  id              String      @id @default(cuid())
  suratJalanId    String
  suratJalan      SuratJalan  @relation(fields: [suratJalanId], references: [id], onDelete: Cascade)

  invoiceItemId   String
  invoiceItem     InvoiceItem @relation(fields: [invoiceItemId], references: [id])

  namaProduk      String
  satuan          String
  qty             Float
  keterangan      String?
}
```

`qtySudahDikirim` / `qtySisa` dihitung dari Σ `SuratJalanItem.qty` per `invoiceItemId` (bukan kolom tersimpan).

---

## 5. UI Modul

### A. Dashboard `/dashboard`
4 KPI: Omzet bulan ini · Tagihan lunas · Piutang aktif · SJ menunggu bukti.  
Widget 5 jatuh tempo terdekat (7 hari / overdue).  
5 transaksi terbaru + badge status bayar & pengiriman.

### B. History Pembelian `/reports/history`
Filter customer + rentang tanggal. Ringkasan per customer (terakhir beli, frekuensi, nilai kumulatif) + detail invoice/produk/harga historis.

### C. Jatuh Tempo `/reports/due-dates`
Filter: semua belum lunas / overdue / minggu ini. Selisih hari, PIC, telp, **Tandai Lunas**.

### D. PWA
- `manifest.webmanifest`: name, short_name, start_url `/dashboard`, `display: standalone`, `theme_color #4682B4`.
- Service worker: precache App Router shell + ikon; network-first untuk API.
- Halaman `/offline` jika tidak ada jaringan.
- Tombol “Install aplikasi” di pengaturan (browser yang support).
- Upload bukti terima & cetak **memerlukan online**. Tidak ada antrian offline v1.

---

## 6. Spesifikasi Cetak Continuous Form

Halaman: `/print/invoice/[id]` dan `/print/surat-jalan/[id]`.  
`print:hidden` untuk chrome app. Page size CSS: lebar **9.5in**, tinggi **11in** (satu lembar continuous). Foto Excel = peta field, bukan ukuran kertas.

### Invoice
- Kop: Nama PT, tagline, alamat, telp (logo opsional jika di-upload).
- Kanan atas: `{kotaSurat}, {tanggalInvoice}`.
- Blok **Kepada:** nama customer, alamat pengiriman, Telp.
- Judul **INVOICE**.
- `No. Invoice` · `No.Po` (kosong jika tidak ada).
- **Pembayaran:** `CASH` dicetak `Cash` · `CREDIT` dicetak `Tempo`. Jika Tempo: **Jatuh tempo: {tanggalJatuhTempo}** wajib tampil.
- Tabel header **tetap sama** semua baris/semua satuan: **No.** | **Nama Barang** | **QTY** | **Satuan** | **Harga / pcs** | **Total Harga** (judul kolom tidak diganti sesuai satuan item).
- Kiri bawah: rekening transfer (`bankInfo`).
- Kanan: Sub Total, Diskon (jika ada), PPN (jika ada), **TOTAL**.
- Kotak TTD: kota + tanggal, ruang tanda tangan, `( {invoiceSignatory} )`.

### Surat Jalan
- Kop PT + telp.
- Judul **SURAT JALAN**.
- Kiri: Tanggal · No. Surat Jalan · No. PO.
- Kanan: **Tujuan :** nama, alamat, telp customer.
- Kalimat: `Dikirimkan barang - barang sebagai berikut :`
- Tabel: **No** | **Nama Barang** | **Qty** | **Satuan** | **Keterangan** — **tanpa harga sama sekali**.
- Footer: `Diterima Oleh` (kiri) · `Dibuat Oleh` (kanan) + garis tangan.

---

## 7. Keputusan terkunci

- Foto = referensi layout/field, bukan spesifikasi kertas atau nomor.
- Cetak **continuous form** 9.5" × 11".
- Nomor Invoice **dan** Surat Jalan: `AMS/CKR/2026/XI/2301` (prefix + tahun + bulan Romawi + DD + SEQ). Counter harian terpisah per jenis dokumen. Tidak ada sufiks `-2`.
- Invoice selalu mencetak metode **Cash / Tempo**; Tempo wajib tampil tanggal jatuh tempo.
- Header kolom harga **seragam**: `Harga / pcs`.
- 1 Invoice : N Surat Jalan (sekaligus atau sebagian). Tanpa stok/gudang.
- Edit/void §3.4. Pelunasan CREDIT 100%. `noPo` opsional. PPN & diskon invoice-level opsional, PPN setelah diskon.
- PWA installable; CRUD/cetak/upload butuh online.
- Diskon hanya di header invoice. Satu foto bukti per SJ.

---

## 8. Phase pembuatan (5 tahap)

Setiap phase selesai = bisa ditest. Urutan wajib: 1 → 5 (print butuh data Invoice/SJ; laporan butuh transaksi).

### Phase 1 — Fondasi + login
Next.js App Router + TypeScript + Tailwind (Steel Blue) + Prisma/MySQL (Laragon) + schema §4.  
Halaman `/login`, JWT cookie, middleware proteksi semua rute, seed `SUPER_ADMIN`.  
Shell layout (sidebar/header) hanya setelah login. Isolasi `tenantId`.  
**Selesai jika:** tanpa akun tidak bisa masuk; login/logout jalan; role terpisah; DB siap.

### Phase 2 — Tenant, pengaturan, master
SUPER_ADMIN: daftar PT, buat/edit Owner, suspend.  
Owner: profil cetak (kop, kota, prefix, PPN, rekening, TTD), upload logo, kelola Admin + checklist permission.  
Master Customer & Produk (CRUD, scoped tenant).  
**Selesai jika:** 1 PT dummy + customer/produk bisa diisi, Admin hanya lihat menu yang diizinkan.

### Phase 3 — Invoice
List/detail/buat/edit/void. Generator nomor `AMS/CKR/YYYY/ROMAN/DDSEQ`.  
Item, override harga, diskon & PPN opsional, Cash/Tempo + jatuh tempo.  
Aturan kunci §3.4. Tombol Tandai Lunas.  
**Selesai jika:** invoice Cash & Tempo tersimpan benar, nomor unik, void/edit sesuai aturan.

### Phase 4 — Surat Jalan + cetak continuous form
Buat SJ dari invoice (sekaligus / sebagian, qty sisa). Nomor SJ format sama, counter terpisah.  
Status invoice `BELUM_DIKIRIM` / `SEBAGIAN` / `TERKIRIM`. Upload bukti → `DITERIMA`.  
Halaman print Invoice & SJ 9.5" × 11", field sesuai §6 (SJ tanpa harga; Tempo + jatuh tempo di invoice).  
**Selesai jika:** kirim sebagian 2 SJ akurat, preview print siap diuji di printer continuous.

### Phase 5 — Dashboard, laporan, PWA
Dashboard KPI + widget jatuh tempo + transaksi terbaru.  
Laporan history pembelian & daftar jatuh tempo.  
PWA: manifest, service worker, `/offline`, installable.  
**Selesai jika:** Owner bisa panjat piutang dari dashboard, app bisa di-install di HP/desktop.

**Di luar v1 (tidak dikerjakan sekarang):** stok/gudang, cicilan/DP, diskon per baris, cetak offline.
