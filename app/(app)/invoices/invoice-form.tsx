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
  paymentLockMessage,
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
  paymentLockMessage?: string | null;
  catatanOnly?: boolean;
  autoNumber?: boolean;
}) {
  const [state, formAction] = useFormState(action, initial);
  const [tanggal, setTanggal] = useState(defaults?.tanggalInvoice ?? "");
  const [noInvoice, setNoInvoice] = useState(defaults?.noInvoice ?? suggestedNumber);
  const [numberTouched, setNumberTouched] = useState(!autoNumber);
  const [customerId, setCustomerId] = useState(defaults?.customerId ?? "");
  const [showExtras, setShowExtras] = useState(false);
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
  const methodLocked = Boolean(paymentLocked || readOnly);
  const requestedDiskon = !useDiskon
    ? 0
    : diskonMode === "persen"
      ? Math.round(totals.subtotal * (Number(diskonPersen || "0") / 100))
      : Math.round(Number(diskonNominal || "0") || 0);
  const discountCapped = useDiskon && totals.subtotal > 0 && requestedDiskon > totals.subtotal;
  const creditZero = metode === "CREDIT" && totals.grandTotal === 0;

  return (
    <form action={formAction} className="space-y-4 pb-32 lg:space-y-6 lg:pb-0">
      <input type="hidden" name="itemsJson" value={JSON.stringify(lines.map(({ id, productId, qty, hargaSatuan }) => ({ id, productId, qty, hargaSatuan })))} />
      <ErrorText message={state?.error} />

      <section className="space-y-4 panel p-4 lg:p-6">
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
          <Field label="Customer">
            <input type="hidden" name="customerId" value={customerId} />
            <CustomerPicker customers={customers} value={customerId} disabled={readOnly} onChange={setCustomerId} />
          </Field>
          <Field label="No. PO (opsional)">
            <input name="noPo" defaultValue={defaults?.noPo ?? ""} className={inputClass} readOnly={readOnly} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {methodLocked ? <input type="hidden" name="metodePembayaran" value={metode} /> : null}
          <Field label="Pembayaran">
            <select
              name={methodLocked ? undefined : "metodePembayaran"}
              value={metode}
              onChange={(e) => setMetode(e.target.value as "CASH" | "CREDIT")}
              className={inputClass}
              disabled={methodLocked}
              aria-describedby={paymentLockMessage ? "payment-lock-note" : undefined}
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
                readOnly={readOnly}
              />
            </Field>
          ) : null}
        </div>
        {paymentLockMessage ? (
          <p id="payment-lock-note" className="text-sm leading-relaxed text-slate-500">
            {paymentLockMessage}
          </p>
        ) : null}
        {creditZero ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
            Total Rp0. Invoice tempo ini tersimpan sebagai lunas dan tidak masuk piutang.
          </p>
        ) : null}
      </section>

      <section className="space-y-4 panel p-4 lg:p-6">
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
        <div className="space-y-3 md:hidden">
          {lines.map((line) => (
            <div key={line.key} className="rounded-lg border border-slate-200 p-3">
              <ProductPicker
                products={products}
                value={line.productId}
                disabled={readOnly || line.locked}
                onChange={(productId) => onProductChange(line.key, productId)}
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Qty</span>
                  <input
                    type="number"
                    min={line.minQty || 1}
                    step="1"
                    value={line.qty}
                    onChange={(e) => setLine(line.key, { qty: Number(e.target.value) })}
                    className={inputClass}
                    readOnly={readOnly}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Harga / pcs</span>
                  <MoneyField
                    value={line.hargaSatuan}
                    readOnly={readOnly}
                    onChange={(hargaSatuan) => setLine(line.key, { hargaSatuan })}
                  />
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm text-slate-500">
                  {line.satuan || "—"} · <span className="font-semibold tabular-nums text-slate-900">{formatRupiah(line.qty * line.hargaSatuan)}</span>
                </p>
                {readOnly || line.locked ? null : (
                  <button
                    type="button"
                    className="shrink-0 px-2 py-2 text-sm font-medium text-rose-600"
                    onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
        <button
          type="button"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 lg:hidden"
          onClick={() => setShowExtras((value) => !value)}
        >
          {showExtras ? "Sembunyikan diskon dan catatan" : "Diskon, PPN, dan catatan"}
        </button>
        <div className={`${showExtras ? "block" : "hidden"} space-y-4 panel p-4 lg:block lg:p-6`}>
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
              {discountCapped ? (
                <p className="text-sm leading-relaxed text-amber-800 sm:col-span-2">
                  Diskon lebih besar dari subtotal, jadi dipotong sampai habis.
                </p>
              ) : null}
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
        <div className="hidden space-y-2 panel p-4 text-sm lg:sticky lg:top-0 lg:block lg:p-6">
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
          {creditZero ? (
            <p className="text-xs leading-relaxed text-slate-500">Tempo Rp0 dianggap lunas, tidak masuk piutang.</p>
          ) : null}
        </div>
      </section>

      <div className="above-tabbar fixed inset-x-0 z-30 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total tagihan</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{formatRupiah(totals.grandTotal)}</p>
          {creditZero ? <p className="text-[11px] leading-snug text-slate-500">Rp0 dianggap lunas</p> : null}
        </div>
        <div className="shrink-0">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </div>

      <div className="hidden gap-2 lg:flex">
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

function CustomerPicker({
  customers,
  value,
  disabled,
  onChange,
}: {
  customers: Customer[];
  value: string;
  disabled?: boolean;
  onChange: (customerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const selected = customers.find((customer) => customer.id === value);
  const needle = query.trim().toLowerCase();
  const filtered = customers
    .filter((customer) => {
      if (!needle) return true;
      return (
        customer.namaPt.toLowerCase().includes(needle) ||
        (customer.picName ?? "").toLowerCase().includes(needle) ||
        customer.noTelp.toLowerCase().includes(needle)
      );
    })
    .slice(0, 30);

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
        value={open ? query : selected?.namaPt ?? ""}
        placeholder="Cari nama, PIC, atau telepon"
        disabled={disabled}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          if (value) onChange("");
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
            <li className="px-3 py-2 text-sm text-slate-500">Tidak ada customer.</li>
          ) : (
            filtered.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(customer.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-slate-800">{customer.namaPt}</span>
                  <span className="shrink-0 text-xs text-slate-400">{customer.picName || customer.noTelp}</span>
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
