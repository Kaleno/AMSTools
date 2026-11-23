import * as XLSX from "xlsx";

export const PRODUCT_SHEET_HEADERS = ["kode_produk", "nama_produk", "satuan", "harga_default", "keterangan"] as const;

export type ProductExcelRow = {
  kodeProduk: string;
  namaProduk: string;
  satuan: string;
  hargaDefault: number;
  keterangan: string;
};

function normHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_");
}

function pick(record: Record<string, unknown>, aliases: string[]) {
  for (const [key, value] of Object.entries(record)) {
    if (aliases.includes(normHeader(key))) {
      return String(value ?? "").trim();
    }
  }
  return "";
}

export function buildProductWorkbook(rows: ProductExcelRow[]) {
  const data = [
    [...PRODUCT_SHEET_HEADERS],
    ...rows.map((row) => [row.kodeProduk, row.namaProduk, row.satuan, row.hargaDefault, row.keterangan]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Produk");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function parseProductWorkbook(buffer: Buffer): { rows: ProductExcelRow[]; error?: string } {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { rows: [], error: "File Excel tidak bisa dibaca. Unggah .xlsx, .xls, atau .csv." };
  }
  const name = book.SheetNames[0];
  if (!name) return { rows: [], error: "File kosong." };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[name], { defval: "", raw: false });
  if (raw.length === 0) return { rows: [], error: "Tidak ada baris data. Baris pertama harus header." };

  const rows: ProductExcelRow[] = [];
  for (const record of raw) {
    const namaProduk = pick(record, ["nama_produk", "nama", "name", "produk", "product"]);
    const kodeProduk = pick(record, ["kode_produk", "kode", "code", "sku"]);
    const satuan = pick(record, ["satuan", "unit"]) || "Pcs";
    const hargaRaw = pick(record, ["harga_default", "harga", "price", "harga_default_rp"]);
    const keterangan = pick(record, ["keterangan", "catatan", "notes"]);
    const hargaDefault = Number(String(hargaRaw).replace(/[^\d.-]/g, "") || "0");
    rows.push({
      kodeProduk,
      namaProduk,
      satuan,
      hargaDefault: Number.isFinite(hargaDefault) ? Math.round(hargaDefault) : NaN,
      keterangan,
    });
  }
  return { rows };
}
