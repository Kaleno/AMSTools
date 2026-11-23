import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/current-user";
import { Badge, EmptyState, ListSummary, PageHeader, PrimaryLink, TableWrap, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { ToggleAdminButton } from "./toggle-button";

export default async function AdminsPage() {
  const current = await requireRoles(["OWNER"]);
  const admins = await prisma.user.findMany({
    where: { tenantId: current.tenant!.id, role: "ADMIN" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Akun Admin"
        description="Staf operasional dengan izin menu per orang."
        action={<PrimaryLink href="/admins/new">Tambah Admin</PrimaryLink>}
      />
      {admins.length === 0 ? (
        <EmptyState
          title="Belum ada Admin"
          hint="Tambah staf dan centang menu yang boleh diakses."
          action={<PrimaryLink href="/admins/new">Tambah Admin</PrimaryLink>}
        />
      ) : (
        <>
          <ListSummary>{admins.length} akun admin</ListSummary>
          <TableWrap>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className={trClass}>
                    <td className={`${tdClass} font-medium text-slate-900`}>{admin.name}</td>
                    <td className={tdClass}>{admin.email}</td>
                    <td className={tdClass}>
                      <Badge active={admin.isActive} />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-3">
                        <Link href={`/admins/${admin.id}/edit`} className="text-sm font-medium text-steel hover:text-steel-dark">
                          Edit
                        </Link>
                        <ToggleAdminButton adminId={admin.id} isActive={admin.isActive} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </div>
  );
}
