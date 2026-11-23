export const OPEN_PAYMENT_STATUSES = ["BELUM_LUNAS", "SEBAGIAN"] as const;

export function sisaTagihan(invoice: { grandTotal: number; jumlahTerbayar: number }) {
  return Math.max(0, Math.round(invoice.grandTotal) - Math.round(invoice.jumlahTerbayar));
}

export function derivePaymentStatus(grandTotal: number, jumlahTerbayar: number) {
  const paid = Math.round(jumlahTerbayar);
  const total = Math.round(grandTotal);
  if (paid <= 0) return "BELUM_LUNAS" as const;
  if (paid >= total) return "LUNAS" as const;
  return "SEBAGIAN" as const;
}
