"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputClass, primaryButtonClass } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reason = searchParams.get("reason");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string; mustChangePassword?: boolean };
      if (!response.ok) {
        setError(data.error ?? "Gagal masuk.");
        return;
      }
      if (data.mustChangePassword) {
        router.replace("/change-password");
        router.refresh();
        return;
      }
      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      {reason === "password" && !error ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sesi berakhir karena password diubah. Masuk kembali dengan password baru.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} w-full py-2.5`}
      >
        {pending ? "Masuk..." : "Masuk"}
      </button>
    </form>
  );
}
