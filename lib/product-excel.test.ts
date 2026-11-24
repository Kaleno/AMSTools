import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProductWorkbook, parseCsv, parseProductWorkbook, rowsFromTable } from "./product-excel";

describe("product workbook", () => {
  it("round-trips the same columns through xlsx", async () => {
    const source = [
      {
        kodeProduk: "PRD-0001",
        namaProduk: 'Pipa, 1"',
        satuan: "Batang",
        hargaDefault: 15000,
        keterangan: "Catatan",
      },
      {
        kodeProduk: "",
        namaProduk: "Tanpa kode",
        satuan: "Pcs",
        hargaDefault: 0,
        keterangan: "",
      },
    ];
    const parsed = await parseProductWorkbook(await buildProductWorkbook(source));
    assert.equal(parsed.error, undefined);
    assert.deepEqual(parsed.rows, source);
  });

  it("reads a csv with quoted commas and the same headers", async () => {
    const csv = '\uFEFFkode_produk,nama_produk,satuan,harga_default,keterangan\nPRD-0002,"Pipa, 1""",Batang,"Rp 15.000","catatan ""khusus"""\n';
    const parsed = await parseProductWorkbook(Buffer.from(csv, "utf8"));
    assert.equal(parsed.error, undefined);
    assert.deepEqual(parsed.rows, [
      {
        kodeProduk: "PRD-0002",
        namaProduk: 'Pipa, 1"',
        satuan: "Batang",
        hargaDefault: 15,
        keterangan: 'catatan "khusus"',
      },
    ]);
  });

  it("rejects the old .xls binary and a corrupt zip", async () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const old = await parseProductWorkbook(ole);
    assert.match(old.error ?? "", /\.xls lama/);

    const zip = await parseProductWorkbook(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]));
    assert.match(zip.error ?? "", /tidak bisa dibaca/);
  });

  it("keeps an empty harga as zero and a broken number as invalid", () => {
    const parsed = rowsFromTable([
      ["nama", "harga"],
      ["Cat", ""],
      ["Kawat", "."],
      ["Paku", "-5"],
    ]);
    assert.deepEqual(
      parsed.rows.map((row) => row.hargaDefault),
      [0, Number.NaN, -5],
    );
    assert.equal(parseCsv("a,b\n1,2\n").length, 2);
  });
});
