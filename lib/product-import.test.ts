import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import type { ProductExcelRow } from "./product-excel";
import {
  PRODUCT_IMPORT_TTL_MS,
  ageProductImportFile,
  classifyProductImport,
  productImportFilePath,
  readProductImportFile,
  saveProductImportFile,
} from "./product-import";

const tenant = "cktenant1234567890abcd";

function row(partial: Partial<ProductExcelRow> & Record<string, unknown>): ProductExcelRow {
  return {
    kodeProduk: "",
    namaProduk: "",
    satuan: "Pcs",
    hargaDefault: 0,
    keterangan: "",
    ...partial,
  };
}

describe("product import rows", () => {
  it("ignores client tenant, id, and action, and checks kode against this tenant", async () => {
    const rows = await classifyProductImport(
      [
        row({
          kodeProduk: "SKU-1",
          namaProduk: "  Cat ",
          satuan: "",
          hargaDefault: 1500.6,
          keterangan: "  note ",
          tenantId: "other-tenant",
          existingId: "attacker-chosen",
          action: "create",
        }),
      ],
      [{ id: "real-product", kodeProduk: "SKU-1" }],
      async () => "PRD-0001",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].action, "update");
    assert.equal(rows[0].existingId, "real-product");
    assert.equal(rows[0].hargaDefault, 1501);
    assert.equal(rows[0].satuan, "Pcs");
    assert.equal(rows[0].namaProduk, "Cat");
    assert.equal(rows[0].keterangan, "note");
    assert.equal("tenantId" in rows[0], false);
  });

  it("requires a name, rejects a bad price, and blocks duplicate codes", async () => {
    const rows = await classifyProductImport(
      [
        row({ namaProduk: "", hargaDefault: 10 }),
        row({ namaProduk: "Minus", hargaDefault: -5 }),
        row({ namaProduk: "Rusak", hargaDefault: Number.NaN }),
        row({ kodeProduk: "SKU-2", namaProduk: "Satu", hargaDefault: 10 }),
        row({ kodeProduk: "SKU-2", namaProduk: "Dua", hargaDefault: 10 }),
        row({ namaProduk: "Baru", hargaDefault: 20 }),
        row({ namaProduk: "Kosong", hargaDefault: 0, kodeProduk: "", keterangan: "" }),
      ],
      [{ id: "other", kodeProduk: "PRD-0001" }],
      async (reserved) => {
        let seq = 1;
        let next = `PRD-${String(seq).padStart(4, "0")}`;
        while (next === "PRD-0001" || reserved.includes(next)) {
          seq += 1;
          next = `PRD-${String(seq).padStart(4, "0")}`;
        }
        return next;
      },
    );

    assert.equal(rows[0].error, "Nama produk wajib.");
    assert.equal(rows[1].error, "Harga tidak valid.");
    assert.equal(rows[2].error, "Harga tidak valid.");
    assert.equal(rows[3].action, "create");
    assert.equal(rows[3].kodeProduk, "SKU-2");
    assert.equal(rows[3].existingId, undefined);
    assert.equal(rows[4].error, "Kode SKU-2 dobel di file.");
    assert.equal(rows[5].action, "create");
    assert.equal(rows[5].kodeProduk, "PRD-0002");
    assert.equal(rows[6].hargaDefault, 0);
    assert.equal(rows[6].kodeProduk, "PRD-0003");
    assert.equal(rows[6].action, "create");
  });
});

describe("product import file", () => {
  it("stores the upload under the tenant and refuses a path escape", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "product-import-"));
    try {
      assert.equal(productImportFilePath(root, "../etc", "a".repeat(32)), null);
      assert.equal(productImportFilePath(root, tenant, "../secret"), null);
      assert.equal(productImportFilePath(root, tenant, `${"a".repeat(32)}-evil`), null);
      const stored = productImportFilePath("/tmp/imports", "tenant123", "a".repeat(32));
      assert.equal(stored, path.resolve("/tmp/imports/tenant123", "a".repeat(32)));
      assert.equal(stored?.startsWith(`${path.resolve("/tmp/imports")}${path.sep}`), true);
      assert.equal(stored?.startsWith(`${path.resolve("/tmp/imports")}-evil`), false);

      const token = await saveProductImportFile(root, tenant, Buffer.from("kode_produk,nama_produk\n,Cat\n"));
      assert.match(token ?? "", /^[a-f0-9]{32}$/);
      const loaded = await readProductImportFile(root, tenant, token ?? "");
      assert.equal(loaded?.toString(), "kode_produk,nama_produk\n,Cat\n");
      assert.equal(await readProductImportFile(root, "ckothertenant123456789", token ?? ""), null);

      await ageProductImportFile(root, tenant, token ?? "", Date.now() - PRODUCT_IMPORT_TTL_MS - 1000);
      assert.equal(await readProductImportFile(root, tenant, token ?? ""), null);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
