import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
      <section className="hidden flex-col justify-between bg-steel-dark px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Image src="/images/android-chrome-192x192.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
          <p className="text-sm font-semibold tracking-wide">AMS Tools</p>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Invoice, surat jalan, dan piutang dalam satu meja kerja.</h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            Catat tagihan, kirim barang, lalu tandai lunas. Khusus pengguna yang sudah didaftarkan.
          </p>
        </div>
        <p className="text-xs text-white/60">CV. Abadi Makmur Sejahtera</p>
      </section>
      <section className="flex items-center justify-center bg-surface px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Image
              src="/images/android-chrome-192x192.png"
              alt="CV. Abadi Makmur Sejahtera"
              width={72}
              height={72}
              priority
              className="h-16 w-16 object-contain lg:hidden"
            />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-steel lg:mt-0">AMS Tools</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Masuk ke sistem</h2>
            <p className="mt-1 text-sm text-slate-500">Gunakan email dan password yang diberikan owner.</p>
          </div>
          <div className="panel p-6 sm:p-8">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
