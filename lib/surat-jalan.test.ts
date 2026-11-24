import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { parseWibDate } from "./datetime";
import { nextDocumentNumber } from "./document-number";
import {
  computeStatusPengiriman,
  lockedSuratJalanCreateError,
  nextSuratJalanUrutan,
  type ShipLine,
} from "./shipping";

const tenant = { id: "tenant-1", invoicePrefix: "AMS/CKR/" };

type StoredNumber = {
  id: string;
  noSuratJalan: string;
  tanggalSuratJalan: Date;
};

function stored(id: string, noSuratJalan: string, tanggal: string): StoredNumber {
  return { id, noSuratJalan, tanggalSuratJalan: parseWibDate(tanggal) };
}

function numberClient(rows: StoredNumber[]) {
  return {
    suratJalan: {
      async findMany(args: {
        where: {
          id?: { not: string };
          tanggalSuratJalan?: { gte: Date; lt: Date };
          noSuratJalan?: { startsWith: string };
        };
      }) {
        const where = args.where;
        return rows
          .filter((row) => {
            if (where.id?.not && row.id === where.id.not) return false;
            if (where.tanggalSuratJalan) {
              const { gte, lt } = where.tanggalSuratJalan;
              if (row.tanggalSuratJalan < gte || row.tanggalSuratJalan >= lt) return false;
            }
            if (where.noSuratJalan?.startsWith && !row.noSuratJalan.startsWith(where.noSuratJalan.startsWith)) {
              return false;
            }
            return true;
          })
          .map((row) => ({ noSuratJalan: row.noSuratJalan }));
      },
    },
  } as unknown as Prisma.TransactionClient;
}

function suggest(date: string, rows: StoredNumber[]) {
  return nextDocumentNumber({
    tenant,
    kind: "suratJalan",
    date,
    db: numberClient(rows),
  });
}

type SjRow = { urutan: number; items: { invoiceItemId: string; qty: number }[] };

function openInvoice(statusDokumen = "AKTIF") {
  return {
    statusDokumen,
    items: [
      {
        id: "item-1",
        namaProduk: "Kertas",
        satuan: "rim",
        qty: 10,
        hargaSatuan: 1000,
        subtotal: 10_000,
        productId: "prod-1",
        invoiceId: "inv-1",
      },
    ],
    suratJalans: [] as SjRow[],
  } as unknown as Parameters<typeof lockedSuratJalanCreateError>[0] & { suratJalans: SjRow[] };
}

function recordShipment<T extends { suratJalans: SjRow[] }>(invoice: T, lines: ShipLine[]) {
  return {
    ...invoice,
    suratJalans: [
      ...invoice.suratJalans,
      {
        urutan: nextSuratJalanUrutan(invoice.suratJalans),
        items: lines.map((line) => ({ invoiceItemId: line.invoiceItemId, qty: line.qty })),
      },
    ],
  };
}

test("two overlapping qty checks cannot both pass", () => {
  const attempt = [{ invoiceItemId: "item-1", qty: 10 }];
  const firstLook = openInvoice();
  assert.equal(lockedSuratJalanCreateError(firstLook, attempt), null);

  const afterFirst = recordShipment(firstLook, attempt);
  assert.equal(lockedSuratJalanCreateError(afterFirst, attempt), 'Qty "Kertas" melebihi sisa (0).');
  assert.equal(computeStatusPengiriman(afterFirst), "TERKIRIM");
  assert.equal(nextSuratJalanUrutan(afterFirst.suratJalans), 2);
});

test("partial delivery still accepts a later shipment within sisa", () => {
  let current = openInvoice();
  assert.equal(lockedSuratJalanCreateError(current, [{ invoiceItemId: "item-1", qty: 4 }]), null);
  current = recordShipment(current, [{ invoiceItemId: "item-1", qty: 4 }]);
  assert.equal(computeStatusPengiriman(current), "SEBAGIAN");
  assert.equal(nextSuratJalanUrutan(current.suratJalans), 2);

  assert.equal(lockedSuratJalanCreateError(current, [{ invoiceItemId: "item-1", qty: 6 }]), null);
  assert.equal(
    lockedSuratJalanCreateError(current, [{ invoiceItemId: "item-1", qty: 7 }]),
    'Qty "Kertas" melebihi sisa (6).',
  );

  current = recordShipment(current, [{ invoiceItemId: "item-1", qty: 6 }]);
  assert.equal(computeStatusPengiriman(current), "TERKIRIM");
  assert.equal(lockedSuratJalanCreateError(current, [{ invoiceItemId: "item-1", qty: 1 }]), 'Qty "Kertas" melebihi sisa (0).');
});

test("locked recheck rejects a void invoice and an unknown item", () => {
  assert.equal(
    lockedSuratJalanCreateError(openInvoice("VOID"), [{ invoiceItemId: "item-1", qty: 1 }]),
    "Invoice batal tidak bisa dikirim.",
  );
  assert.equal(
    lockedSuratJalanCreateError(openInvoice(), [{ invoiceItemId: "other", qty: 1 }]),
    "Ada item yang tidak termasuk invoice.",
  );
});

test("backdated and manually typed numbers advance the next suggestion", async () => {
  const next = await suggest("2026-11-24", [
    stored("sj-1", "AMS/CKR/2026/XI/2401", "2026-11-24"),
    stored("sj-2", "AMS/CKR/2026/XI/2407", "2026-11-01"),
    stored("sj-3", "SJ-MANUAL", "2026-11-24"),
  ]);
  assert.equal(next, "AMS/CKR/2026/XI/2408");
});

test("same-day surat jalan sequence goes from 01 to 02", async () => {
  assert.equal(await suggest("2026-11-24", []), "AMS/CKR/2026/XI/2401");
  assert.equal(
    await suggest("2026-11-24", [stored("sj-1", "AMS/CKR/2026/XI/2401", "2026-11-24")]),
    "AMS/CKR/2026/XI/2402",
  );
});

test("next day restarts the surat jalan sequence", async () => {
  const rows = [
    stored("sj-1", "AMS/CKR/2026/XI/2401", "2026-11-24"),
    stored("sj-2", "AMS/CKR/2026/XI/2402", "2026-11-24"),
  ];
  assert.equal(await suggest("2026-11-25", rows), "AMS/CKR/2026/XI/2501");
});
