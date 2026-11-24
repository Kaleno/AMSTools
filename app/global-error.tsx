"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import { StandaloneStatus } from "@/components/status-screen";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (error.digest) console.error("[ui] error", error.digest);
  }, [error]);

  return (
    <html lang="id">
      <body className={`${inter.className} bg-surface text-slate-800 antialiased`}>
        <StandaloneStatus
          code="500"
          title="Tidak bisa memuat halaman"
          description="Terjadi gangguan saat membuka halaman ini. Coba lagi, atau kembali ke dashboard."
          digest={error.digest}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
