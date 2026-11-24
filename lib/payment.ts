export const OPEN_PAYMENT_STATUSES = ["BELUM_LUNAS", "SEBAGIAN"] as const;

export type PaymentMetode = "CASH" | "CREDIT";
export type PaymentStatus = "BELUM_LUNAS" | "SEBAGIAN" | "LUNAS";

export function sisaTagihan(invoice: { grandTotal: number; jumlahTerbayar: number }) {
  return Math.max(0, Math.round(invoice.grandTotal) - Math.round(invoice.jumlahTerbayar));
}

export function sumPembayaran(rows: { jumlah: number }[]) {
  return Math.round(rows.reduce((sum, row) => sum + row.jumlah, 0));
}

export function derivePaymentStatus(grandTotal: number, jumlahTerbayar: number): PaymentStatus {
  const paid = Math.round(jumlahTerbayar);
  const total = Math.round(grandTotal);
  // Rp0 is covered (0 >= 0). Check this before the unpaid branch so a tempo
  // invoice with nothing to collect is LUNAS instead of stuck BELUM_LUNAS.
  if (paid >= total) return "LUNAS";
  if (paid <= 0) return "BELUM_LUNAS";
  return "SEBAGIAN";
}

export function paymentSnapshot(input: {
  metode: PaymentMetode;
  grandTotal: number;
  paidFromPayments: number;
  previousTanggalLunas: Date | null;
  previousLunasById: string | null;
  actorId: string;
  now: Date;
  paymentDate?: Date | null;
}) {
  const jumlahTerbayar =
    input.metode === "CASH" ? Math.round(input.grandTotal) : Math.round(input.paidFromPayments);
  const statusPembayaran: PaymentStatus =
    input.metode === "CASH" ? "LUNAS" : derivePaymentStatus(input.grandTotal, jumlahTerbayar);

  if (statusPembayaran !== "LUNAS") {
    return {
      jumlahTerbayar,
      statusPembayaran,
      tanggalLunas: null as Date | null,
      lunasById: null as string | null,
    };
  }

  return {
    jumlahTerbayar,
    statusPembayaran,
    tanggalLunas: input.paymentDate ?? input.previousTanggalLunas ?? input.now,
    lunasById: input.previousLunasById ?? input.actorId,
  };
}
