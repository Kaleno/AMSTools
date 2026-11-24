"use client";

import { useActionState } from "react";
import { confirmProductImport, previewProductImport, type ImportState } from "./actions";
import { ErrorText, SubmitButton } from "@/components/ui";

const initial: ImportState = { error: null };

export function ProductImportForm() {
  const [previewState, previewAction] = useActionState(previewProductImport, initial);
  const [confirmState, confirmAction] = useActionState(confirmProductImport, initial);
  const preview = previewState?.preview ?? [];
  const valid = preview.filter((row) => !row.error);
  const invalid = preview.filter((row) => row.error);

  return (
    <div className="panel space-y-3 p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">Impor Excel</p>
          <p className="text-xs text-slate-500">
            Kode yang sudah ada di-update. Baris tanpa kode dapat nomor otomatis. Hapus produk tetap di aplikasi.
          </p>
        </div>
        <form action={previewAction} className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="file"
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          required
          className="w-full min-w-0 text-sm sm:w-auto"
        />
          <div className="[&_button]:w-full sm:[&_button]:w-auto">
            <SubmitButton>Pratinjau</SubmitButton>
          </div>
        </form>
      </div>
      <ErrorText message={previewState?.error ?? confirmState?.error} />

      {preview.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {valid.filter((row) => row.action === "create").length} baru · {valid.filter((row) => row.action === "update").length}{" "}
            update · {invalid.length} error
          </p>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 md:hidden">
            {preview.map((row) => (
              <div key={`${row.line}-${row.kodeProduk}`} className="px-3 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium text-slate-900">{row.namaProduk || "—"}</p>
                  <span className={row.error ? "shrink-0 text-xs text-rose-700" : "shrink-0 text-xs text-emerald-700"}>
                    {row.error ? "Error" : row.action === "update" ? "Update" : "Baru"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Baris {row.line} · {row.kodeProduk || "tanpa kode"}
                </p>
                {row.error ? <p className="mt-1 text-xs text-rose-700">{row.error}</p> : null}
              </div>
            ))}
          </div>
          <div className="hidden max-h-64 overflow-auto rounded-lg border border-slate-200 text-sm md:block">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">Aksi</th>
                  <th className="px-3 py-2">Kode</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={`${row.line}-${row.kodeProduk}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 tabular-nums">{row.line}</td>
                    <td className="px-3 py-2">{row.error ? "—" : row.action === "update" ? "Update" : "Baru"}</td>
                    <td className="px-3 py-2">{row.kodeProduk || "—"}</td>
                    <td className="px-3 py-2">{row.namaProduk || "—"}</td>
                    <td className={row.error ? "px-3 py-2 text-rose-700" : "px-3 py-2 text-emerald-700"}>
                      {row.error || "Siap"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {valid.length > 0 ? (
            <form action={confirmAction}>
              <input type="hidden" name="payload" value={JSON.stringify(valid)} />
              <div className="[&_button]:w-full sm:[&_button]:w-auto">
                <SubmitButton>Simpan {valid.length} baris valid</SubmitButton>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
