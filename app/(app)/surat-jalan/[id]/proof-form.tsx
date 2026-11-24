"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Camera } from "lucide-react";
import { ErrorText, SubmitButton } from "@/components/ui";
import { uploadProof, type ActionState } from "../actions";

const initial: ActionState = { error: null };

export function ProofForm({ suratJalanId, replace }: { suratJalanId: string; replace?: boolean }) {
  const [state, formAction] = useFormState(uploadProof.bind(null, suratJalanId), initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-3">
      <ErrorText message={state?.error} />
      {replace ? (
        <p className="text-sm leading-relaxed text-slate-500">Mengganti foto tidak mengubah tanggal diterima.</p>
      ) : null}
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-steel hover:bg-steel-tint">
        <Camera className="h-6 w-6 text-steel" />
        <span className="mt-2 text-sm font-semibold text-slate-800">{replace ? "Ganti foto bukti" : "Ambil atau pilih foto"}</span>
        <span className="mt-1 text-xs text-slate-500">PNG, JPG, atau WebP. Di ponsel, tombol ini membuka kamera.</span>
        <input
          name="bukti"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          capture="environment"
          required
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setPreview(null);
              setFileName(null);
              return;
            }
            setFileName(file.name);
            const url = URL.createObjectURL(file);
            setPreview(url);
          }}
        />
      </label>
      {fileName ? <p className="text-xs text-slate-500">{fileName}</p> : null}
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Pratinjau bukti" className="max-h-80 w-full rounded-lg border border-slate-200 object-contain" />
      ) : null}
      <SubmitButton>{replace ? "Simpan foto baru" : "Unggah dan tandai diterima"}</SubmitButton>
    </form>
  );
}
