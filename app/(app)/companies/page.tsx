import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/current-user";
import { ResetPasswordButton } from "@/components/reset-password-button";
import { Badge, EmptyState, ListSummary, PageHeader, PrimaryLink, TableWrap, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { ToggleStatusButton } from "./toggle-button";

export default async function CompaniesPage() {
  await requireSuperAdmin();
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { users: { where: { role: "OWNER" }, take: 1 } },
  });

  return (
    <div>
      <PageHeader
        title="Perusahaan"
        description="Kelola akun Owner dan status tenant."
        action={<PrimaryLink href="/companies/new">Tambah perusahaan</PrimaryLink>}
      />
      {tenants.length === 0 ? (
        <EmptyState
          title="Belum ada perusahaan"
          hint="Buat PT pertama beserta akun Owner-nya."
          action={<PrimaryLink href="/companies/new">Tambah perusahaan</PrimaryLink>}
        />
      ) : (
        <>
          <ListSummary>{tenants.length} perusahaan</ListSummary>
          <div className="panel divide-y divide-slate-100 overflow-hidden md:hidden">
            {tenants.map((tenant) => {
              const owner = tenant.users[0];
              return (
                <div key={tenant.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{tenant.namaPt}</p>
                      <p className="truncate text-xs text-slate-500">{owner ? `${owner.name} · ${owner.email}` : tenant.telpPt}</p>
                      {owner?.mustChangePassword ? (
                        <p className="text-xs text-amber-700">Menunggu ganti password</p>
                      ) : null}
                    </div>
                    <Badge active={tenant.isActive} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4">
                    <Link href={`/companies/${tenant.id}/edit`} className="inline-flex min-h-11 items-center text-sm font-medium text-steel">
                      Edit
                    </Link>
                    {owner ? <ResetPasswordButton userId={owner.id} userName={owner.name} /> : null}
                    <ToggleStatusButton tenantId={tenant.id} isActive={tenant.isActive} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block">
          <TableWrap>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Perusahaan</th>
                  <th className={thClass}>Owner</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const owner = tenant.users[0];
                  return (
                    <tr key={tenant.id} className={trClass}>
                      <td className={tdClass}>
                        <p className="font-medium text-slate-900">{tenant.namaPt}</p>
                        <p className="text-xs text-slate-500">{tenant.telpPt}</p>
                      </td>
                      <td className={tdClass}>
                        <p>{owner?.name ?? "—"}</p>
                        <p className="text-xs text-slate-500">{owner?.email}</p>
                        {owner?.mustChangePassword ? (
                          <p className="text-xs text-amber-700">Menunggu ganti password</p>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        <Badge active={tenant.isActive} />
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/companies/${tenant.id}/edit`} className="text-sm font-medium text-steel hover:text-steel-dark">
                            Edit
                          </Link>
                          {owner ? <ResetPasswordButton userId={owner.id} userName={owner.name} /> : null}
                          <ToggleStatusButton tenantId={tenant.id} isActive={tenant.isActive} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          </div>
        </>
      )}
    </div>
  );
}
