import { requireRoles } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { InstallAppButton } from "@/components/install-app-button";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const current = await requireRoles(["OWNER"]);
  return (
    <div>
      <PageHeader
        title="Pengaturan perusahaan"
        description="Profil PT dan kustomisasi cetakan Invoice / Surat Jalan."
      />
      <section className="mb-6 panel p-6">
        <h2 className="mb-3 font-semibold text-slate-900">Aplikasi (PWA)</h2>
        <InstallAppButton />
      </section>
      <SettingsForm tenant={current.tenant!} />
    </div>
  );
}
