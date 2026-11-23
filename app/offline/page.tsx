import Link from "next/link";

export const metadata = {
  title: "Offline · AMS Tools",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="panel w-full max-w-md px-8 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-steel">AMS Tools</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Tidak ada jaringan</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Invoice, surat jalan, cetak, dan unggah bukti memerlukan koneksi. Sambungkan internet lalu coba lagi.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-steel px-4 py-2 text-sm font-semibold text-white hover:bg-steel-dark"
        >
          Coba buka dashboard
        </Link>
      </div>
    </main>
  );
}
