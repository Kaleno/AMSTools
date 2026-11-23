"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import type { Customer, Product } from "@prisma/client";
import { calcInvoice } from "@/lib/invoice-calc";
import { formatRupiah } from "@/lib/format";
import { ErrorText, Field, inputClass, SecondaryLink, SubmitButton } from "@/components/ui";
import { previewInvoiceNumber, type ActionState } from "./actions";

const initial: ActionState = { error: null };

export type LineDraft = {
  key: string;
  id?: string;
  productId: string;
  namaProduk: string;
  satuan: string;
  qty: number;
  hargaSatuan: number;
  minQty: number;
  locked: boolean;
};

type InvoiceDefaults = {
  noInvoice: string;
  noPo?: string | null;
  tanggalInvoice: string;
  customerId: string;
  metodePembayaran: "CASH" | "CREDIT";
  tanggalJatuhTempo?: string;
  usePpn: boolean;
  useDiskon: boolean;
  diskonPersen?: number | null;
  diskonNominal?: number | null;
  catatan?: string | null;
  lines: LineDraft[];
};

function newKey() {
  return Math.random().toString(36).slice(2);
}

export function InvoiceForm({
  action,
  customers,
  products,
  ppnPercentage,
  suggestedNumber,
  defaults,
  submitLabel,
  numberLocked,
  itemsLocked,
  paymentLocked,
  catatanOnly,
  autoNumber = true,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  customers: Customer[];
  products: Product[];
  ppnPercentage: number;
  suggestedNumber: string;
  defaults?: InvoiceDefaults;
  submitLabel: string;
  numberLocked?: boolean;
  itemsLocked?: boolean;
  paymentLocked?: boolean;
  catatanOnly?: boolean;
  autoNumber?: boolean;
}) {
  const [state, formAction] = useFormState(action, initial);
  const [tanggal, setTanggal] = useState(defaults?.tanggalInvoice ?? "");
  const [noInvoice, setNoInvoice] = useState(defaults?.noInvoice ?? suggestedNumber);
  const [numberTouched, setNumberTouched] = useState(!autoNumber);
  const [metode, setMetode] = useState<"CASH" | "CREDIT">(defaults?.metodePembayaran ?? "CASH");
  const [usePpn, setUsePpn] = useState(defaults?.usePpn ?? false);
  const [useDiskon, setUseDiskon] = useState(defaults?.useDiskon ?? false);
  const [diskonMode, setDiskonMode] = useState<"persen" | "nominal">(
    defaults?.diskonNominal ? "nominal" : "persen",
  );
  const [diskonPersen, setDiskonPersen] = useState(String(defaults?.diskonPersen ?? ""));
  const [diskonNominal, setDiskonNominal] = useState(String(defaults?.diskonNominal ?? ""));
  const [lines, setLines] = useState<LineDraft[]>(
    defaults?.lines.length
      ? defaults.lines
      : [{ key: newKey(), productId: "", namaProduk: "", satuan: "Pcs", qty: 1, hargaSatuan: 0, minQty: 0, locked: false }],
  );

  useEffect(() => {
    if (!autoNumber || numberLocked || numberTouched) return;
    let active = true;
    previewInvoiceNumber(tanggal).then((value) => {
      if (active) setNoInvoice(value);
    });
    return () => {
      active = false;
    };
  }, [tanggal, numberLocked, numberTouched, autoNumber]);

  const totals = useMemo(
    () =>
      calcInvoice({
        items: lines.filter((l) => l.productId && l.qty > 0),
        useDiskon,
        diskonPersen: diskonMode === "persen" ? Number(diskonPersen || "0") : null,
        diskonNominal: diskonMode === "nominal" ? Number(diskonNominal || "0") : null,
        usePpn,
        ppnRate: ppnPercentage,
      }),
    [lines, useDiskon, diskonMode, diskonPersen, diskonNominal, usePpn, ppnPercentage],
  );

  function setLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function onProductChange(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    setLine(key, {
      productId,
      namaProduk: product?.namaProduk ?? "",
      satuan: product?.satuan ?? "Pcs",
      hargaSatuan: product ? Math.round(product.hargaDefault) : 0,
    });
  }

  const readOnly = Boolean(catatanOnly || itemsLocked);

  return (
    <form action={formAction} className="space-y-6 pb-24 lg:pb-0">
      <input type="hidden" name="itemsJson" value={JSON.stringify(lines.map(({ id, productId, qty, hargaSatuan }) => ({ id, productId, qty, hargaSatuan })))} />
      <ErrorText message={state?.error} />

      <section className="space-y-4 panel p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal">
            <input
              name="tanggalInvoice"
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={inputClass}
              readOnly={readOnly}
            />
          </Field>
          <Field label="No. Invoice">
            <input
              name="noInvoice"
              required
              value={noInvoice}
              onChange={(e) => {
                setNumberTouched(true);
                setNoInvoice(e.target.value);
              }}
              className={inputClass}
              readOnly={numberLocked || readOnly}
            />
          </Field>
          {readOnly ? <input type="hidden" name="customerId" value={defaults?.customerId ?? ""} /> : null}
          <Field label="Customer">
            <select name="customerId" required defaultValue={defaults?.customerId ?? ""} className={inputClass} disabled={readOnly}>
              <option value="">Pilih customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.namaPt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="No. PO (opsional)">
            <input name="noPo" defaultValue={defaults?.noPo ?? ""} className={inputClass} readOnly={readOnly} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {paymentLocked || readOnly ? <input type="hidden" name="metodePembayaran" value={metode} /> : null}
          <Field label="Pembayaran">
            <select
              name="metodePembayaran"
              value={metode}
              onChange={(e) => setMetode(e.target.value as "CASH" | "CREDIT")}
              className={inputClass}
              disabled={paymentLocked || readOnly}
            >
              <option value="CASH">Cash</option>
              <option value="CREDIT">Tempo</option>
            </select>
          </Field>
          {metode === "CREDIT" ? (
            <Field label="Jatuh tempo">
              <input
                name="tanggalJatuhTempo"
                type="date"
                required
                defaultValue={defaults?.tanggalJatuhTempo}
                className={inputClass}
                readOnly={paymentLocked || readOnly}
              />
            </Field>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Item</h2>
          {readOnly ? null : (
            <button
              type="button"
              className="text-sm font-medium text-steel hover:underline"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  { key: newKey(), productId: "", namaProduk: "", satuan: "Pcs", qty: 1, hargaSatuan: 0, minQty: 0, locked: false },
                ])
              }
            >
              + Tambah baris
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Produk</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Satuan</th>
                <th className="pb-2 font-medium">Harga / pcs</th>
                <th className="pb-2 font-medium">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className="border-t border-steel-border">
                  <td className="min-w-[14rem] py-2 pr-2">
                    <ProductPicker
                      products={products}
                      value={line.productId}
                      disabled={readOnly || line.locked}
                      onChange={(productId) => onProductChange(line.key, productId)}
                    />
                  </td>
                  <td className="py-2 pr-2 w-24">
                    <input
                      type="number"
                      min={line.minQty || 1}
                      step="1"
                      value={line.qty}
                      onChange={(e) => setLine(line.key, { qty: Number(e.target.value) })}
                      className={inputClass}
                      readOnly={readOnly}
                    />
                  </td>
                  <td className="py-2 pr-2 w-20 text-slate-500">{line.satuan || "—"}</td>
                  <td className="w-40 py-2 pr-2">
                    <MoneyField
                      value={line.hargaSatuan}
                      readOnly={readOnly}
                      onChange={(hargaSatuan) => setLine(line.key, { hargaSatuan })}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatRupiah(line.qty * line.hargaSatuan)}</td>
                  <td className="py-2">
                    {readOnly || line.locked ? null : (
                      <button
                        type="button"
                        className="text-rose-600 hover:underline"
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4 panel p-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="useDiskon" checked={useDiskon} onChange={(e) => setUseDiskon(e.target.checked)} disabled={readOnly} />
            Pakai diskon
          </label>
          {useDiskon ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="diskonMode" value="persen" checked={diskonMode === "persen"} onChange={() => setDiskonMode("persen")} disabled={readOnly} />
                Persen
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="diskonMode" value="nominal" checked={diskonMode === "nominal"} onChange={() => setDiskonMode("nominal")} disabled={readOnly} />
                Nominal
              </label>
              {diskonMode === "persen" ? (
                <Field label="Diskon %">
                  <input name="diskonPersen" type="number" min={0} step="0.01" value={diskonPersen} onChange={(e) => setDiskonPersen(e.target.value)} className={inputClass} readOnly={readOnly} />
                </Field>
              ) : (
                <Field label="Diskon Rp">
                  <input name="diskonNominal" type="number" min={0} step="1" value={diskonNominal} onChange={(e) => setDiskonNominal(e.target.value)} className={inputClass} readOnly={readOnly} />
                </Field>
              )}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="usePpn" checked={usePpn} onChange={(e) => setUsePpn(e.target.checked)} disabled={readOnly} />
            Pakai PPN {ppnPercentage}%
          </label>
          <Field label="Catatan">
            <textarea name="catatan" rows={3} defaultValue={defaults?.catatan ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="space-y-2 panel p-6 text-sm lg:sticky lg:top-0">
          <div className="flex justify-between">
            <span>Sub Total</span>
            <span>{formatRupiah(totals.subtotal)}</span>
          </div>
          {useDiskon ? (
            <div className="flex justify-between text-slate-600">
              <span>Diskon</span>
              <span>-{formatRupiah(totals.diskonAmount)}</span>
            </div>
          ) : null}
          {usePpn ? (
            <div className="flex justify-between text-slate-600">
              <span>PPN {ppnPercentage}%</span>
              <span>{formatRupiah(totals.ppnAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatRupiah(totals.grandTotal)}</span>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total tagihan</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{formatRupiah(totals.grandTotal)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <SecondaryLink href="/invoices">Batal</SecondaryLink>
      </div>
    </form>
  );
}

function ProductPicker({
  products,
  value,
  disabled,
  onChange,
}: {
  products: Product[];
  value: string;
  disabled?: boolean;
  onChange: (productId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const selected = products.find((product) => product.id === value);
  const needle = query.trim().toLowerCase();
  const filtered = products.filter((product) => {
    if (!needle) return true;
    return (
      product.namaProduk.toLowerCase().includes(needle) ||
      (product.kodeProduk ?? "").toLowerCase().includes(needle)
    );
  });

  useEffect(() => {
    if (!open) return;
    function place() {
      const input = anchorRef.current?.querySelector("input");
      if (!input) return;
      const box = input.getBoundingClientRect();
      setRect({ top: box.bottom + 4, left: box.left, width: box.width });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, query]);

  return (
    <div
      ref={anchorRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input
        value={open ? query : selected?.namaProduk ?? ""}
        placeholder="Cari produk"
        disabled={disabled}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        className={inputClass}
      />
      {open && !disabled && rect ? (
        <ul
          className="fixed z-[80] max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          style={{ top: rect.top, left: rect.left, width: rect.width }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Tidak ada produk.</li>
          ) : (
            filtered.slice(0, 30).map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(product.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-slate-800">{product.namaProduk}</span>
                  <span className="shrink-0 text-xs text-slate-400">{product.kodeProduk || product.satuan}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function MoneyField({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}) {
  const shown = value ? `Rp ${new Intl.NumberFormat("id-ID").format(value)}` : "";
  return (
    <input
      inputMode="numeric"
      readOnly={readOnly}
      value={shown}
      placeholder="Rp 0"
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "");
        onChange(digits ? Number(digits) : 0);
      }}
      className={`${inputClass} text-right tabular-nums`}
    />
  );
}
