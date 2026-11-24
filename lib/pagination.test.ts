import assert from "node:assert/strict";
import test from "node:test";
import { sumGrandTotal, sumSisaTagihan } from "./list-totals";
import { sisaTagihan } from "./payment";
import { PAGE_SIZE, pageHref, pageWindow, parsePage, withSearchQuery } from "./pagination";
import { dueDateTempoSql, dueInvoiceWhere } from "./report-filters";
import { readReceivableRow, receivableSisaQuery, sqlNumber } from "./receivable-total";

test("page query falls back to 1", () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage(""), 1);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("-3"), 1);
  assert.equal(parsePage("2.5"), 1);
  assert.equal(parsePage("abc"), 1);
  assert.equal(parsePage("9999999999999999999"), 1);
  assert.equal(parsePage(["4", "9"]), 4);
  assert.equal(parsePage("12"), 12);
});

test("page window clamps and slices without using the current page as the total", () => {
  assert.equal(PAGE_SIZE, 25);
  const empty = pageWindow("4", 0);
  assert.deepEqual(
    { page: empty.page, pageCount: empty.pageCount, skip: empty.skip, from: empty.from, to: empty.to },
    { page: 1, pageCount: 1, skip: 0, from: 0, to: 0 },
  );

  const last = pageWindow("9", 30, 25);
  assert.equal(last.page, 2);
  assert.equal(last.pageCount, 2);
  assert.equal(last.skip, 25);
  assert.equal(last.from, 26);
  assert.equal(last.to, 30);

  const middle = pageWindow("2", 80, 25);
  assert.equal(middle.skip, 25);
  assert.equal(middle.from, 26);
  assert.equal(middle.to, 50);
  assert.equal(middle.pageCount, 4);
});

test("pager links keep filters and omit page 1", () => {
  assert.equal(pageHref("/invoices", 1, { q: "ams", status: "lunas", kirim: "semua", page: "4" }), "/invoices?q=ams&status=lunas&kirim=semua");
  assert.equal(pageHref("/invoices", 3, { q: "ams", status: "lunas" }), "/invoices?q=ams&status=lunas&page=3");
  assert.equal(pageHref("/customers", 1), "/customers");
});

test("a new search drops the page and keeps the other filters", () => {
  assert.equal(withSearchQuery("status=lunas&kirim=belum&page=3", "  PO-9 "), "status=lunas&kirim=belum&q=PO-9");
  assert.equal(withSearchQuery("q=PO-9&status=lunas&page=2", "   "), "status=lunas");
});

test("money totals match the unpaged sum, not the page sum", () => {
  const rows = Array.from({ length: 55 }, (_, index) => ({
    grandTotal: index + 1,
    jumlahTerbayar: index % 4,
  }));
  const window = pageWindow("2", rows.length, 25);
  const pageRows = rows.slice(window.skip, window.skip + window.take);

  const unpagedGrand = rows.reduce((sum, row) => sum + row.grandTotal, 0);
  const unpagedSisa = rows.reduce((sum, row) => sum + sisaTagihan(row), 0);
  assert.equal(sumGrandTotal(rows), unpagedGrand);
  assert.equal(sumSisaTagihan(rows), unpagedSisa);
  assert.notEqual(sumGrandTotal(pageRows), unpagedGrand);
  assert.notEqual(sumSisaTagihan(pageRows), unpagedSisa);

  const grouped = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    const key = index % 7 === 0 ? "a" : "b";
    grouped.set(key, (grouped.get(key) ?? 0) + row.grandTotal);
  }
  const groups = Array.from(grouped, ([, total]) => ({ grandTotal: total }));
  assert.equal(sumGrandTotal(groups), unpagedGrand);
  assert.notEqual(sumGrandTotal(groups.slice(0, 1)), unpagedGrand);
});

test("sisa is rounded per invoice before the sum", () => {
  const rows = [
    { grandTotal: 10.6, jumlahTerbayar: 0.4 },
    { grandTotal: 5, jumlahTerbayar: 9 },
  ];
  assert.equal(sumSisaTagihan(rows), 11);
  const summedColumns = Math.max(0, Math.round(10.6 + 5) - Math.round(0.4 + 9));
  assert.notEqual(summedColumns, sumSisaTagihan(rows));
});

test("receivable SQL sums every matching row and does not page", () => {
  const today = new Date("2026-11-01T00:00:00.000Z");
  const weekEnd = new Date("2026-11-08T00:00:00.000Z");
  const query = receivableSisaQuery("tenant-1", dueDateTempoSql("overdue", today, weekEnd));
  const text = query.strings.join("?");
  assert.match(text, /SUM\(GREATEST\(0,\s*ROUND\(`grandTotal`\)\s*-\s*ROUND\(`jumlahTerbayar`\)\)\)/);
  assert.match(text, /COUNT\(\*\)/);
  assert.equal(text.includes("LIMIT"), false);
  assert.equal(text.includes("OFFSET"), false);
  assert.deepEqual(query.values, ["tenant-1", "BELUM_LUNAS", "SEBAGIAN", today]);

  const open = receivableSisaQuery("tenant-2");
  assert.deepEqual(open.values, ["tenant-2", "BELUM_LUNAS", "SEBAGIAN"]);
  assert.deepEqual(readReceivableRow({ sisa: BigInt(1500), total: BigInt(3) }), { sisa: 1500, count: 3 });
  assert.equal(sqlNumber("2500.5"), 2500.5);
  assert.equal(sqlNumber(null), 0);
});

test("due-date buckets used by the list and the total stay the same", () => {
  const today = new Date("2026-11-24T00:00:00.000Z");
  const weekEnd = new Date("2026-12-01T00:00:00.000Z");
  const overdue = dueInvoiceWhere("tenant-1", "overdue", today, weekEnd);
  const week = dueInvoiceWhere("tenant-1", "minggu", today, weekEnd);
  const all = dueInvoiceWhere("tenant-1", "lain", today, weekEnd);
  assert.deepEqual(overdue.tanggalJatuhTempo, { not: null, lt: today });
  assert.deepEqual(week.tanggalJatuhTempo, { gte: today, lte: weekEnd });
  assert.deepEqual(all.tanggalJatuhTempo, { not: null });

  const weekSql = dueDateTempoSql("minggu", today, weekEnd).strings.join("?");
  assert.match(weekSql, /tanggalJatuhTempo` >= \?/);
  assert.match(weekSql, /tanggalJatuhTempo` <= \?/);
  assert.match(dueDateTempoSql("semua", today, weekEnd).strings.join("?"), /IS NOT NULL/);
  assert.equal(dueDateTempoSql("overdue", today, weekEnd).values.length, 1);
});
