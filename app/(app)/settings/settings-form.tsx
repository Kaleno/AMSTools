"use client";

import { useActionState, useState } from "react";
import type { Tenant } from "@prisma/client";
import { PasswordField } from "@/components/password-field";
import { updateSettings, type ActionState } from "./actions";
import { ErrorText, Field, inputClass, SubmitButton } from "@/components/ui";

const initial: ActionState = { error: null };

export function SettingsForm({ tenant }: { tenant: Tenant }) {
  const [state, formAction] = useActionState(updateSettings, initial);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const confirmTouched = password.length > 0 || confirmPassword.length > 0;

  return (
    <form action={formAction} className="max-w-3xl space-y-6 pb-24 lg:pb-0">
      {state?.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Pengaturan tersimpan.</p>
      ) : null}
      <ErrorText message={state?.error} />

      <section className="panel space-y-4 p-4 lg:p-6">
        <h2 className="font-semibold text-slate-900">Profil perusahaan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama PT">
            <input name="namaPt" required defaultValue={tenant.namaPt} className={inputClass} />
          </Field>
          <Field label="Tagline">
            <input name="tagline" defaultValue={tenant.tagline ?? ""} className={inputClass} />
          </Field>
          <Field label="Telepon">
            <input name="telpPt" required defaultValue={tenant.telpPt} className={inputClass} />
          </Field>
          <Field label="NPWP">
            <input name="npwpPt" defaultValue={tenant.npwpPt ?? ""} className={inputClass} />
          </Field>
          <Field label="Kota surat">
            <input name="kotaSurat" defaultValue={tenant.kotaSurat} className={inputClass} />
          </Field>
          <Field label="Logo cetakan (PNG/JPG, max 2MB)">
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
          </Field>
        </div>
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/media/${tenant.logoUrl}`} alt="Logo PT" className="h-16 object-contain" />
        ) : null}
        <Field label="Alamat">
          <textarea name="alamatPt" required rows={3} defaultValue={tenant.alamatPt} className={inputClass} />
        </Field>
      </section>

      <section className="panel space-y-4 p-4 lg:p-6">
        <h2 className="font-semibold text-slate-900">Dashboard</h2>
        <Field label="Jatuh tempo terdekat (hari)">
          <input
            name="dashboardDueDays"
            type="number"
            min={1}
            max={90}
            step={1}
            required
            defaultValue={tenant.dashboardDueDays}
            className={inputClass}
          />
        </Field>
        <p className="text-sm text-slate-500">
          Daftar di dashboard menampilkan tagihan yang sudah lewat, plus yang jatuh tempo dalam jumlah hari ini ke depan.
          Kartu “Jatuh tempo” dan filter laporan memakai angka yang sama.
        </p>
      </section>

      <section className="panel space-y-4 p-4 lg:p-6">
        <h2 className="font-semibold text-slate-900">Pajak & nomor dokumen</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PPN default (%)">
            <input
              name="ppnPercentage"
              type="number"
              step="0.01"
              defaultValue={tenant.ppnPercentage}
              className={inputClass}
            />
          </Field>
          <Field label="Prefix nomor (contoh AMS/CKR/)">
            <input name="invoicePrefix" defaultValue={tenant.invoicePrefix} className={inputClass} />
          </Field>
          <Field label="Prefix kode produk (contoh PRD-)">
            <input name="productPrefix" defaultValue={tenant.productPrefix} className={inputClass} />
          </Field>
        </div>
        <p className="text-sm text-slate-500">
          Produk baru otomatis bernomor {tenant.productPrefix || "PRD-"}0001, 0002, dst. Bisa diubah saat input.
        </p>
      </section>

      <section className="panel space-y-4 p-4 lg:p-6">
        <h2 className="font-semibold text-slate-900">Cetakan</h2>
        <Field label="Info rekening (Invoice)">
          <textarea name="bankInfo" rows={3} defaultValue={tenant.bankInfo ?? ""} className={inputClass} />
        </Field>
        <Field label="Nama penandatangan Invoice">
          <input name="invoiceSignatory" defaultValue={tenant.invoiceSignatory} className={inputClass} />
        </Field>
        <Field label="Catatan kaki Invoice">
          <textarea name="invoiceFooterNote" rows={2} defaultValue={tenant.invoiceFooterNote ?? ""} className={inputClass} />
        </Field>
        <Field label="Catatan kaki Surat Jalan">
          <textarea name="sjFooterNote" rows={2} defaultValue={tenant.sjFooterNote ?? ""} className={inputClass} />
        </Field>
      </section>

      <section className="panel space-y-4 p-4 lg:p-6">
        <h2 className="font-semibold text-slate-900">Password Owner</h2>
        <p className="text-sm text-slate-500">
          Kosongkan ketiga field jika password tidak diubah. Mengganti password wajib mengisi password saat ini.
          Menyimpan password baru mengakhiri sesi di perangkat lain.
        </p>
        <Field label="Password saat ini">
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            spellCheck={false}
            className={inputClass}
          />
        </Field>
        <PasswordField name="newPassword" label="Password baru" onValueChange={setPassword} />
        <Field label="Ulangi password baru">
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
          />
        </Field>
        {confirmTouched ? (
          <p className={`text-xs ${password === confirmPassword ? "text-emerald-700" : "text-slate-500"}`}>
            {password === confirmPassword ? "Konfirmasi sama." : "Konfirmasi belum sama."}
          </p>
        ) : null}
      </section>

      <div className="above-tabbar fixed inset-x-0 z-30 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="[&_button]:w-full">
          <SubmitButton>Simpan pengaturan</SubmitButton>
        </div>
      </div>
      <div className="hidden lg:block">
        <SubmitButton>Simpan pengaturan</SubmitButton>
      </div>
    </form>
  );
}
