import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/current-user";
import { ResetPasswordButton } from "@/components/reset-password-button";
import { Badge, EmptyState, ListSummary, PageHeader, PrimaryLink, TableWrap, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { ListPager } from "@/components/list-pager";
import { pageWindow } from "@/lib/pagination";
import { ToggleAdminButton } from "./toggle-button";

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const current = await requireRoles(["OWNER"]);
  const query = await searchParams;
  const where = { tenantId: current.tenant!.id, role: "ADMIN" };
  const totalCount = await prisma.user.count({ where });
  const paging = pageWindow(query.page, totalCount);
  const admins =
    totalCount === 0
      ? []
      : await prisma.user.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: paging.skip,
          take: paging.take,
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
          <ListSummary>{totalCount} akun admin</ListSummary>
          <div className="panel divide-y divide-slate-100 overflow-hidden md:hidden">
            {admins.map((admin) => (
              <div key={admin.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{admin.name}</p>
                    <p className="truncate text-xs text-slate-500">{admin.email}</p>
                    {admin.mustChangePassword ? (
                      <p className="text-xs text-amber-700">Menunggu ganti password</p>
                    ) : null}
                  </div>
                  <Badge active={admin.isActive} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4">
                  <Link href={`/admins/${admin.id}/edit`} className="inline-flex min-h-11 items-center text-sm font-medium text-steel">
                    Edit
                  </Link>
                  <ResetPasswordButton userId={admin.id} userName={admin.name} />
                  <ToggleAdminButton adminId={admin.id} isActive={admin.isActive} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
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
                    <td className={tdClass}>
                      <p>{admin.email}</p>
                      {admin.mustChangePassword ? (
                        <p className="text-xs text-amber-700">Menunggu ganti password</p>
                      ) : null}
                    </td>
                    <td className={tdClass}>
                      <Badge active={admin.isActive} />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admins/${admin.id}/edit`} className="text-sm font-medium text-steel hover:text-steel-dark">
                          Edit
                        </Link>
                        <ResetPasswordButton userId={admin.id} userName={admin.name} />
                        <ToggleAdminButton adminId={admin.id} isActive={admin.isActive} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          </div>
          <ListPager pathname="/admins" paging={paging} />
        </>
      )}
    </div>
  );
}
