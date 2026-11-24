import assert from "node:assert/strict";
import test from "node:test";
import { calcInvoice } from "./invoice-calc";
import { foreignInvoiceItemIds } from "./invoice-items";
import { invoiceLocks } from "./invoice-lock";
import { derivePaymentStatus, paymentSnapshot } from "./payment";

function invoice(partial: Record<string, unknown>) {
  return {
    statusDokumen: "AKTIF",
    metodePembayaran: "CREDIT",
    statusPembayaran: "BELUM_LUNAS",
    jumlahTerbayar: 0,
    grandTotal: 100_000,
    suratJalans: [],
    ...partial,
  } as unknown as Parameters<typeof invoiceLocks>[0];
}

test("Rp0 tempo is lunas, not stuck belum lunas", () => {
  assert.equal(derivePaymentStatus(0, 0), "LUNAS");
  assert.equal(derivePaymentStatus(100_000, 0), "BELUM_LUNAS");
  assert.equal(derivePaymentStatus(100_000, 40_000), "SEBAGIAN");
  assert.equal(derivePaymentStatus(100_000, 100_000), "LUNAS");
  assert.equal(derivePaymentStatus(100_000, 150_000), "LUNAS");
});

test("100% and over-100% discounts become a lunas zero total", () => {
  for (const diskonPersen of [100, 150]) {
    const totals = calcInvoice({
      items: [{ qty: 2, hargaSatuan: 50_000 }],
      useDiskon: true,
      diskonPersen,
      diskonNominal: null,
      usePpn: false,
      ppnRate: 11,
    });
    assert.equal(totals.grandTotal, 0);
    assert.equal(derivePaymentStatus(totals.grandTotal, 0), "LUNAS");
  }
});

test("credit paid amount follows payment rows, cash follows the total", () => {
  const now = new Date("2026-11-24T00:00:00.000Z");
  const zero = paymentSnapshot({
    metode: "CREDIT",
    grandTotal: 0,
    paidFromPayments: 0,
    previousTanggalLunas: null,
    previousLunasById: null,
    actorId: "user-1",
    now,
  });
  assert.equal(zero.statusPembayaran, "LUNAS");
  assert.equal(zero.jumlahTerbayar, 0);

  const partial = paymentSnapshot({
    metode: "CREDIT",
    grandTotal: 100_000,
    paidFromPayments: 25_000,
    previousTanggalLunas: now,
    previousLunasById: "old",
    actorId: "user-1",
    now,
  });
  assert.deepEqual(
    { status: partial.statusPembayaran, paid: partial.jumlahTerbayar, lunas: partial.tanggalLunas },
    { status: "SEBAGIAN", paid: 25_000, lunas: null },
  );

  const cash = paymentSnapshot({
    metode: "CASH",
    grandTotal: 80_000,
    paidFromPayments: 0,
    previousTanggalLunas: null,
    previousLunasById: null,
    actorId: "user-1",
    now,
  });
  assert.equal(cash.statusPembayaran, "LUNAS");
  assert.equal(cash.jumlahTerbayar, 80_000);
});

test("item ids from another invoice are rejected", () => {
  const owned = new Set(["item-a", "item-b"]);
  assert.deepEqual(foreignInvoiceItemIds([{ id: "item-a" }, { id: undefined }], owned), []);
  assert.deepEqual(foreignInvoiceItemIds([{ id: "item-other" }], owned), ["item-other"]);
  assert.deepEqual(foreignInvoiceItemIds([{ id: "item-a" }, { id: "item-a" }], owned), ["item-a"]);
});

test("cash and in-transit surat jalan cannot be voided, and cash method stays locked", () => {
  const cash = invoiceLocks(invoice({ metodePembayaran: "CASH", statusPembayaran: "LUNAS", jumlahTerbayar: 100_000 }));
  assert.equal(cash.canVoid, false);
  assert.equal(cash.paymentLocked, true);
  assert.match(cash.voidBlockMessage ?? "", /cash/i);
  assert.match(cash.paymentLockMessage ?? "", /tidak bisa diubah/);

  const dikirim = invoiceLocks(
    invoice({
      suratJalans: [{ statusPengiriman: "DIKIRIM" }],
    }),
  );
  assert.equal(dikirim.canVoid, false);
  assert.match(dikirim.voidBlockMessage ?? "", /surat jalan/i);

  const openCredit = invoiceLocks(invoice({}));
  assert.equal(openCredit.canVoid, true);
  assert.equal(openCredit.paymentLocked, false);

  const zeroCredit = invoiceLocks(invoice({ grandTotal: 0, jumlahTerbayar: 0, statusPembayaran: "LUNAS" }));
  assert.equal(zeroCredit.catatanOnly, false);
  assert.equal(zeroCredit.canRecordPayment, false);
  assert.equal(zeroCredit.canVoid, true);
});

test("void is allowed only when every surat jalan is batal", () => {
  const active = invoiceLocks(invoice({ suratJalans: [{ statusPengiriman: "DIKIRIM" }] }));
  assert.equal(active.canVoid, false);
  assert.equal(active.numberLocked, true);

  const mixed = invoiceLocks(
    invoice({
      suratJalans: [{ statusPengiriman: "BATAL" }, { statusPengiriman: "DIKIRIM" }],
    }),
  );
  assert.equal(mixed.canVoid, false);
  assert.equal(mixed.numberLocked, true);

  const allBatal = invoiceLocks(
    invoice({
      suratJalans: [{ statusPengiriman: "BATAL" }, { statusPengiriman: "BATAL" }],
    }),
  );
  assert.equal(allBatal.canVoid, true);
  assert.equal(allBatal.numberLocked, false);
  assert.equal(allBatal.itemsLocked, false);
  assert.equal(allBatal.voidBlockMessage, null);

  const diterima = invoiceLocks(
    invoice({
      suratJalans: [{ statusPengiriman: "DITERIMA" }, { statusPengiriman: "BATAL" }],
    }),
  );
  assert.equal(diterima.canVoid, false);
  assert.equal(diterima.hasDiterima, true);
  assert.equal(diterima.itemsLocked, true);
  assert.equal(diterima.catatanOnly, true);
});
