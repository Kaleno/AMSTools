import assert from "node:assert/strict";
import test from "node:test";
import { calcInvoice, lineSubtotal, wholeRupiahLines } from "./invoice-calc";
import { derivePaymentStatus, paymentSnapshot } from "./payment";

test("subtotal is the sum of rounded lines, not a rounded raw sum", () => {
  const items = [
    { qty: 2.5, hargaSatuan: 3 },
    { qty: 2.5, hargaSatuan: 3 },
  ];
  const lines = items.map((item) => lineSubtotal(item));
  assert.deepEqual(lines, [8, 8]);

  const totals = calcInvoice({
    items,
    useDiskon: false,
    diskonPersen: null,
    diskonNominal: null,
    usePpn: false,
    ppnRate: 11,
  });
  assert.equal(totals.subtotal, 16);
  assert.equal(
    totals.subtotal,
    lines.reduce((sum, line) => sum + line, 0),
  );
  assert.notEqual(totals.subtotal, Math.round(2.5 * 3 + 2.5 * 3));
});

test("fractional unit prices round per line before the sum", () => {
  const items = [
    { qty: 1, hargaSatuan: 1.4 },
    { qty: 1, hargaSatuan: 1.4 },
    { qty: 1, hargaSatuan: 1.4 },
  ];
  const totals = calcInvoice({
    items,
    useDiskon: true,
    diskonPersen: 50,
    diskonNominal: null,
    usePpn: true,
    ppnRate: 11,
  });
  assert.equal(totals.subtotal, 3);
  assert.notEqual(totals.subtotal, Math.round(1.4 + 1.4 + 1.4));
  assert.equal(totals.diskonAmount, 2);
  assert.equal(totals.dpp, 1);
  assert.equal(totals.ppnAmount, 0);
  assert.equal(totals.grandTotal, 1);
});

test("saved lines, discount, PPN, and payment status use the summed line subtotals", () => {
  const saved = wholeRupiahLines([
    { qty: 2.5, hargaSatuan: 10.6 },
    { qty: 2.5, hargaSatuan: 10.6 },
  ]);
  assert.deepEqual(
    saved.map((line) => ({ hargaSatuan: line.hargaSatuan, subtotal: line.subtotal })),
    [
      { hargaSatuan: 11, subtotal: 28 },
      { hargaSatuan: 11, subtotal: 28 },
    ],
  );

  const totals = calcInvoice({
    items: saved,
    useDiskon: true,
    diskonPersen: 10,
    diskonNominal: null,
    usePpn: true,
    ppnRate: 11,
  });
  assert.equal(
    totals.subtotal,
    saved.reduce((sum, line) => sum + line.subtotal, 0),
  );
  assert.equal(totals.subtotal, 56);
  assert.equal(totals.diskonAmount, 6);
  assert.equal(totals.dpp, 50);
  assert.equal(totals.ppnAmount, 6);
  assert.equal(totals.grandTotal, 56);

  assert.equal(derivePaymentStatus(totals.grandTotal, 0), "BELUM_LUNAS");
  assert.equal(derivePaymentStatus(totals.grandTotal, 20), "SEBAGIAN");
  assert.equal(derivePaymentStatus(totals.grandTotal, totals.grandTotal), "LUNAS");

  const cash = paymentSnapshot({
    metode: "CASH",
    grandTotal: totals.grandTotal,
    paidFromPayments: 0,
    previousTanggalLunas: null,
    previousLunasById: null,
    actorId: "user-1",
    now: new Date("2026-11-24T00:00:00.000Z"),
  });
  assert.equal(cash.statusPembayaran, "LUNAS");
  assert.equal(cash.jumlahTerbayar, totals.grandTotal);
});
