import { sisaTagihan } from "@/lib/payment";

export function sumGrandTotal(rows: { grandTotal: number }[]) {
  return rows.reduce((sum, row) => sum + row.grandTotal, 0);
}

/** Sum of per-row sisa. Rounding and the zero floor happen on each invoice, then the rows are added. */
export function sumSisaTagihan(rows: { grandTotal: number; jumlahTerbayar: number }[]) {
  return rows.reduce((sum, row) => sum + sisaTagihan(row), 0);
}
