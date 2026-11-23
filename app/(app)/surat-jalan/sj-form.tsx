"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { ErrorText, Field, inputClass, SecondaryLink, SubmitButton } from "@/components/ui";
import { previewSjNumber, type ActionState } from "./actions";

const initial: ActionState = { error: null };

export type RemainRow = {
  id: string;
  namaProduk: string;
  satuan: string;
  qty: number;
  shipped: number;
  remaining: number;
};

export function SuratJalanForm({
  action,
  invoiceId,
  suggestedNumber,
  tanggalDefault,
  noPo,
  rows,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  invoiceId: string;
  suggestedNumber: string;
  tanggalDefault: string;
  noPo?: string | null;
  rows: RemainRow[];
}) {
  const [state, formAction] = useFormState(action, initial);
  const [tanggal, setTanggal] = useState(tanggalDefault);
  const [noSj, setNoSj] = useState(suggestedNumber);
  const [touched, setTouched] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((row) => [row.id, row.remaining])),
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (touched) return;
    let active = true;
    previewSjNumber(tanggal).then((value) => {
      if (active) setNoSj(value);
    });
    return () => {
      active = false;
    };
  }, [tanggal, touched]);

  const payload = rows
    .filter((row) => (qtys[row.id] ?? 0) > 0)
    .map((row) => ({
      invoiceItemId: row.id,
      qty: qtys[row.id] ?? 0,
      keterangan: notes[row.id] ?? "",
    }));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="itemsJson" value={JSON.stringify(payload)} />
      <ErrorText message={state?.error} />

      <section className="grid gap-4 panel p-6 sm:grid-cols-2">
        <Field label="Tanggal">
          <input
            name="tanggalSuratJalan"
            type="date"
            required
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="No. Surat Jalan">
          <input
            name="noSuratJalan"
            required
            value={noSj}
            onChange={(e) => {
              setTouched(true);
              setNoSj(e.target.value);
            }}
            className={inputClass}
          />
        </Field>
        <p className="text-sm text-slate-500 sm:col-span-2">No. PO: {noPo || "—"}</p>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-steel-tint text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Barang</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Sudah</th>
              <th className="px-4 py-3 font-medium">Sisa</th>
              <th className="px-4 py-3 font-medium">Kirim sekarang</th>
              <th className="px-4 py-3 font-medium">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-steel-border">
                <td className="px-4 py-3">
                  {row.namaProduk}
                  <span className="block text-xs text-slate-500">{row.satuan}</span>
                </td>
                <td className="px-4 py-3">{row.qty}</td>
                <td className="px-4 py-3">{row.shipped}</td>
                <td className="px-4 py-3">{row.remaining}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={row.remaining}
                    step="1"
                    value={qtys[row.id] ?? 0}
                    onChange={(e) => setQtys((cur) => ({ ...cur, [row.id]: Number(e.target.value) }))}
                    className={inputClass}
                    disabled={row.remaining <= 0}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={notes[row.id] ?? ""}
                    onChange={(e) => setNotes((cur) => ({ ...cur, [row.id]: e.target.value }))}
                    placeholder="2 Dus + 1 Pack"
                    className={inputClass}
                    disabled={row.remaining <= 0}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <Field label="Catatan pengiriman">
        <textarea name="catatanPengiriman" rows={2} className={inputClass} />
      </Field>

      <div className="flex gap-2">
        <SubmitButton>Simpan Surat Jalan</SubmitButton>
        <SecondaryLink href={`/invoices/${invoiceId}`}>Batal</SecondaryLink>
      </div>
    </form>
  );
}
