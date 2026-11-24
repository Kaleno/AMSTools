import ExcelJS from "exceljs";

export const PRODUCT_SHEET_HEADERS = ["kode_produk", "nama_produk", "satuan", "harga_default", "keterangan"] as const;

export type ProductExcelRow = {
  kodeProduk: string;
  namaProduk: string;
  satuan: string;
  hargaDefault: number;
  keterangan: string;
};

const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);

function normHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_");
}

function pick(record: Record<string, string>, aliases: string[]) {
  for (const [key, value] of Object.entries(record)) {
    if (aliases.includes(normHeader(key))) return value.trim();
  }
  return "";
}

function hargaFromText(raw: string) {
  const hargaDefault = Number(raw.replace(/[^\d.-]/g, "") || "0");
  return Number.isFinite(hargaDefault) ? Math.round(hargaDefault) : Number.NaN;
}

export function rowFromRecord(record: Record<string, string>): ProductExcelRow {
  const satuan = pick(record, ["satuan", "unit"]);
  return {
    kodeProduk: pick(record, ["kode_produk", "kode", "code", "sku"]),
    namaProduk: pick(record, ["nama_produk", "nama", "name", "produk", "product"]),
    satuan: satuan || "Pcs",
    hargaDefault: hargaFromText(pick(record, ["harga_default", "harga", "price", "harga_default_rp"])),
    keterangan: pick(record, ["keterangan", "catatan", "notes"]),
  };
}

export function rowsFromTable(table: string[][]): { rows: ProductExcelRow[]; error?: string } {
  if (table.length === 0) return { rows: [], error: "File kosong." };
  const [headers, ...body] = table;
  if (!body.length) return { rows: [], error: "Tidak ada baris data. Baris pertama harus header." };
  const rows = body.map((line) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      const key = String(header ?? "").trim();
      if (!key) return;
      record[key] = String(line[index] ?? "");
    });
    return rowFromRecord(record);
  });
  return { rows };
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      table.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    table.push(row);
  }
  return table;
}

function valueToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return "";
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
    if ("text" in value && value.text != null) return String(value.text);
    if ("result" in value && value.result != null && typeof value.result !== "object") return String(value.result);
  }
  return "";
}

function cellText(cell: ExcelJS.Cell) {
  const value = valueToString(cell.value).trim();
  if (value) return value;
  return String(cell.text ?? "").trim();
}

async function tableFromXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs 4.4 still types Buffer as the pre-Node-22 interface.
  await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const table: string[][] = [];
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cells: string[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) {
      cells.push(cellText(row.getCell(column)));
    }
    table.push(cells);
  }
  return table;
}

export async function buildProductWorkbook(rows: ProductExcelRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Produk");
  sheet.addRow([...PRODUCT_SHEET_HEADERS]);
  for (const row of rows) {
    sheet.addRow([row.kodeProduk, row.namaProduk, row.satuan, row.hargaDefault, row.keterangan]);
  }
  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}

export async function parseProductWorkbook(buffer: Buffer): Promise<{ rows: ProductExcelRow[]; error?: string }> {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(OLE_MAGIC)) {
    return { rows: [], error: "File .xls lama tidak didukung. Simpan sebagai .xlsx atau .csv." };
  }

  const zip = buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (zip) {
    try {
      return rowsFromTable(await tableFromXlsx(buffer));
    } catch {
      return { rows: [], error: "File Excel tidak bisa dibaca. Unggah .xlsx atau .csv." };
    }
  }

  if (buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0)) {
    return { rows: [], error: "File Excel tidak bisa dibaca. Unggah .xlsx atau .csv." };
  }

  const text = buffer.toString("utf8");
  return rowsFromTable(parseCsv(text));
}
