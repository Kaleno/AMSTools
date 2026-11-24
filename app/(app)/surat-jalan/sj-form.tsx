"use client";

import { useEffect, useMemo, useState } from "react";
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
  alreadyShippedCount = 0,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  invoiceId: string;
  suggestedNumber: string;
  tanggalDefault: string;
  noPo?: string | null;
  rows: RemainRow[];
  alreadyShippedCount?: number;
}) {
  const shippable = rows;
  const [state, formAction] = useFormState(action, initial);
  const [tanggal, setTanggal] = useState(tanggalDefault);
  const [noSj, setNoSj] = useState(suggestedNumber);
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(shippable.map((row) => [row.id, true])),
  );
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(shippable.map((row) => [row.id, row.remaining])),
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

  const payload = useMemo(
    () =>
      rows
        .filter((row) => selected[row.id] && (qtys[row.id] ?? 0) > 0)
        .map((row) => ({
          invoiceItemId: row.id,
          qty: qtys[row.id] ?? 0,
          keterangan: notes[row.id] ?? "",
        })),
    [rows, selected, qtys, notes],
  );

  const selectedCount = payload.length;

  function selectAllRemaining() {
    setSelected(Object.fromEntries(shippable.map((row) => [row.id, true])));
    setQtys((cur) => {
      const next = { ...cur };
      for (const row of shippable) next[row.id] = row.remaining;
      return next;
    });
  }

  function clearSelection() {
    setSelected(Object.fromEntries(shippable.map((row) => [row.id, false])));
  }

  function toggleRow(row: RemainRow, checked: boolean) {
    setSelected((cur) => ({ ...cur, [row.id]: checked }));
    if (checked) {
      setQtys((cur) => ({ ...cur, [row.id]: cur[row.id] > 0 ? cur[row.id] : row.remaining }));
    }
  }

  function setQty(row: RemainRow, raw: number) {
    const next = Math.min(row.remaining, Math.max(0, raw));
    setQtys((cur) => ({ ...cur, [row.id]: next }));
    if (next > 0) setSelected((cur) => ({ ...cur, [row.id]: true }));
  }

  return (
    <form action={formAction} className="space-y-4 pb-24 lg:space-y-6 lg:pb-0">
      <input type="hidden" name="itemsJson" value={JSON.stringify(payload)} />
      <input type="hidden" name="noSuratJalanTouched" value={touched ? "1" : "0"} />
      <ErrorText message={state?.error} />

      <section className="panel grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
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
            value={noSj}
            onChange={(e) => {
              setTouched(true);
              setNoSj(e.target.value);
            }}
            className={inputClass}
          />
        </Field>
        <p className="text-sm text-slate-500 sm:col-span-2">No. PO: {noPo || "—"}</p>
        {alreadyShippedCount > 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
            {alreadyShippedCount} barang sudah terkirim di Surat Jalan sebelumnya, tidak ditampilkan di sini. Cetak ulang
            SJ lama dari menu Surat Jalan.
          </p>
        ) : null}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-600">
            Centang yang dibawa. <span className="font-medium text-slate-800">{selectedCount}</span> item dipilih.
          </p>
          <div className="flex gap-3 text-sm">
            <button type="button" onClick={selectAllRemaining} className="font-medium text-steel hover:text-steel-dark">
              Semua sisa
            </button>
            <button type="button" onClick={clearSelection} className="font-medium text-slate-500 hover:text-slate-800">
              Kosongkan
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {rows.map((row) => {
            const checked = Boolean(selected[row.id]);
            const qtyLocked = checked && row.remaining === 1;
            return (
              <div key={row.id} className={`px-4 py-3 ${!checked ? "bg-slate-50/80" : ""}`}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleRow(row, e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-steel focus:ring-steel"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{row.namaProduk}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {row.satuan} · invoice {row.qty} · sudah {row.shipped} · sisa {row.remaining}
                    </span>
                  </span>
                </label>
                {checked ? (
                  <div className="ml-8 mt-3 space-y-2">
                    {qtyLocked ? (
                      <p className="text-sm text-slate-600">
                        Kirim sekarang: <span className="font-semibold tabular-nums">1</span>
                      </p>
                    ) : (
                      <Field label="Kirim sekarang">
                        <input
                          type="number"
                          min={1}
                          max={row.remaining}
                          step="1"
                          inputMode="numeric"
                          value={qtys[row.id] ?? row.remaining}
                          onChange={(e) => setQty(row, Number(e.target.value))}
                          className={inputClass}
                        />
                      </Field>
                    )}
                    <Field label="Keterangan">
                      <input
                        value={notes[row.id] ?? ""}
                        onChange={(e) => setNotes((cur) => ({ ...cur, [row.id]: e.target.value }))}
                        placeholder="2 Dus + 1 Pack"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-steel-tint text-slate-600">
              <tr>
                <th className="w-12 px-4 py-3 font-medium">
                  <span className="sr-only">Pilih</span>
                </th>
                <th className="px-4 py-3 font-medium">Barang</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Sudah</th>
                <th className="px-4 py-3 font-medium">Sisa</th>
                <th className="px-4 py-3 font-medium">Kirim sekarang</th>
                <th className="px-4 py-3 font-medium">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const checked = Boolean(selected[row.id]);
                const qtyLocked = checked && row.remaining === 1;
                return (
                  <tr key={row.id} className={`border-t border-steel-border ${!checked ? "bg-slate-50/70" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleRow(row, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-steel focus:ring-steel"
                        aria-label={`Kirim ${row.namaProduk}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.namaProduk}
                      <span className="block text-xs text-slate-500">{row.satuan}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.qty}</td>
                    <td className="px-4 py-3 tabular-nums">{row.shipped}</td>
                    <td className="px-4 py-3 tabular-nums">{row.remaining}</td>
                    <td className="px-4 py-3">
                      {qtyLocked ? (
                        <span className="tabular-nums font-medium">1</span>
                      ) : (
                        <input
                          type="number"
                          min={checked ? 1 : 0}
                          max={row.remaining}
                          step="1"
                          value={checked ? qtys[row.id] ?? row.remaining : 0}
                          onChange={(e) => setQty(row, Number(e.target.value))}
                          className={inputClass}
                          disabled={!checked}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={notes[row.id] ?? ""}
                        onChange={(e) => setNotes((cur) => ({ ...cur, [row.id]: e.target.value }))}
                        placeholder="2 Dus + 1 Pack"
                        className={inputClass}
                        disabled={!checked}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Field label="Catatan pengiriman">
        <textarea name="catatanPengiriman" rows={2} className={inputClass} />
      </Field>

      <div className="above-tabbar fixed inset-x-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="[&_button]:w-full">
          <SubmitButton>Simpan Surat Jalan</SubmitButton>
        </div>
      </div>

      <div className="hidden gap-2 lg:flex">
        <SubmitButton>Simpan Surat Jalan</SubmitButton>
        <SecondaryLink href={`/invoices/${invoiceId}`}>Batal</SecondaryLink>
      </div>
    </form>
  );
}
