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
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  product?: Product;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initial);

  return (
    <form action={formAction} className="max-w-xl space-y-4 panel p-6">
      <ErrorText message={state?.error} />
      <Field label="Kode produk">
        <input name="kodeProduk" defaultValue={product?.kodeProduk ?? ""} className={inputClass} />
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
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <SecondaryLink href="/products">Batal</SecondaryLink>
      </div>
    </form>
  );
}
