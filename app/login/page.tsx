import Image from "next/image";
import { Suspense } from "react";
import { Copyright } from "@/components/copyright";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
      <section className="hidden flex-col bg-steel-dark px-14 py-12 text-white lg:flex xl:px-20">
        <div className="flex flex-1 flex-col justify-center">
          <Image
            src="/images/android-chrome-512x512.png"
            alt="CV. Abadi Makmur Sejahtera"
            width={176}
            height={176}
            priority
            className="h-44 w-44 rounded-2xl object-contain shadow-lg shadow-black/15"
          />
          <h1 className="mt-8 max-w-lg text-4xl font-semibold leading-tight tracking-tight">
            Invoice, surat jalan, dan piutang dalam satu meja kerja.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
            Catat tagihan, kirim barang, lalu tandai lunas. Khusus pengguna yang sudah didaftarkan.
          </p>
        </div>
        <p className="pt-10 text-xs text-white/60">CV. Abadi Makmur Sejahtera</p>
      </section>
      <section className="flex flex-col bg-surface px-4 py-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <Image
                src="/images/android-chrome-512x512.png"
                alt="CV. Abadi Makmur Sejahtera"
                width={128}
                height={128}
                priority
                className="h-32 w-32 object-contain lg:hidden"
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-steel lg:mt-0">AMS Tools</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Silakan login</h2>
              <p className="mt-1 text-sm text-slate-500">Gunakan email dan password yang terdaftar</p>
            </div>
            <div className="panel p-6 sm:p-8">
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>
        <Copyright className="pt-6 text-center text-xs text-slate-400" />
      </section>
    </main>
  );
}
