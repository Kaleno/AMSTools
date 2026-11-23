"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) setInstalled(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="text-sm text-emerald-700">Aplikasi sudah terpasang di perangkat ini.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Pasang AMS Tools sebagai aplikasi (PWA). Perlu HTTPS di production; localhost boleh HTTP. Cetak dan unggah
        bukti tetap butuh online.
      </p>
      <button
        type="button"
        disabled={!promptEvent}
        onClick={async () => {
          if (!promptEvent) return;
          await promptEvent.prompt();
          await promptEvent.userChoice;
          setPromptEvent(null);
        }}
        className="rounded-lg bg-steel px-4 py-2 text-sm font-semibold text-white hover:bg-steel-dark disabled:opacity-50"
      >
        {promptEvent ? "Install aplikasi" : "Install belum tersedia di browser ini"}
      </button>
    </div>
  );
}
