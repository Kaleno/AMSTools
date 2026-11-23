import Link from "next/link";
import { primaryButtonClass } from "@/components/ui";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto mt-10 max-w-md panel px-8 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-steel">AMS Tools</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Akses ditolak</h1>
      <p className="mt-2 text-sm text-slate-500">Akun ini tidak punya izin untuk membuka halaman tersebut.</p>
      <Link href="/dashboard" className={`${primaryButtonClass} mt-6`}>
        Kembali ke dashboard
      </Link>
    </div>
  );
}
