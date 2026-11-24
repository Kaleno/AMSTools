"use client";

import { useEffect } from "react";
import { StandaloneStatus } from "@/components/status-screen";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (error.digest) console.error("[ui] error", error.digest);
  }, [error]);

  return (
    <StandaloneStatus
      code="500"
      title="Tidak bisa memuat halaman"
      description="Terjadi gangguan saat membuka halaman ini. Coba lagi, atau kembali ke dashboard."
      digest={error.digest}
      onRetry={reset}
    />
  );
}
