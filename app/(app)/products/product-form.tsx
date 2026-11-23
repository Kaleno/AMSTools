"use client";

import { useFormState } from "react-dom";
import type { Product } from "@prisma/client";
import type { ActionState } from "./actions";
import { ErrorText, Field, inputClass, SecondaryLink, SubmitButton } from "@/components/ui";

const initial: ActionState = { error: null };

const SATUAN = ["Pcs", "Box", "Dus", "Pack", "Unit", "Set", "Kg"];

export function ProductForm({
  action,
  product,
  submitLabel,
  suggestedKode,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  product?: Product;
  submitLabel: string;
  suggestedKode?: string;
}) {
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="panel max-w-xl space-y-4 p-4 pb-24 lg:p-6 lg:pb-6">
      <ErrorText message={state?.error} />
      <Field label="Kode produk">
        <input
          name="kodeProduk"
          defaultValue={product?.kodeProduk ?? suggestedKode ?? ""}
          className={inputClass}
        />
        {!product ? (
          <p className="mt-1 text-xs text-slate-500">Otomatis dari Pengaturan (prefix produk). Bisa diubah.</p>
        ) : null}
      </Field>
      <Field label="Nama produk">
        <input name="namaProduk" required defaultValue={product?.namaProduk} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Satuan">
          <select name="satuan" defaultValue={product?.satuan ?? "Pcs"} className={inputClass}>
            {SATUAN.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Harga default">
          <input
            name="hargaDefault"
            type="number"
            min={0}
            step={1}
            defaultValue={product ? Math.round(product.hargaDefault) : 0}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Keterangan">
        <textarea name="keterangan" rows={2} defaultValue={product?.keterangan ?? ""} className={inputClass} />
      </Field>
      <div className="above-tabbar fixed inset-x-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="[&_button]:w-full">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </div>
      <div className="hidden gap-2 lg:flex">
        <SubmitButton>{submitLabel}</SubmitButton>
        <SecondaryLink href="/products">Batal</SecondaryLink>
      </div>
    </form>
  );
}
