export const OWNER_ONLY_CANCEL = "Hanya Owner yang bisa membatalkan Surat Jalan.";
export const RECEIVED_CANCEL = "Surat Jalan yang sudah diterima tidak bisa dibatalkan.";
export const ALREADY_CANCELLED = "Surat Jalan ini sudah dibatalkan.";
export const REASON_REQUIRED = "Alasan pembatalan wajib diisi.";

export function suratJalanCancelBlock(input: {
  role: string;
  statusPengiriman: string;
  buktiTerimaUrl?: string | null;
  alasan: string;
}): string | null {
  if (input.role !== "OWNER") return OWNER_ONLY_CANCEL;
  if (input.statusPengiriman === "BATAL") return ALREADY_CANCELLED;
  if (input.statusPengiriman === "DITERIMA" || input.buktiTerimaUrl) return RECEIVED_CANCEL;
  if (!input.alasan.trim()) return REASON_REQUIRED;
  return null;
}
