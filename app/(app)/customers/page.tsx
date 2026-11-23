import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/current-user";
import { EmptyState, ListSummary, PageHeader, PrimaryLink, TableWrap, tableClass, tdClass, thClass, theadClass, trClass } from "@/components/ui";
import { CallLink } from "@/components/call-link";
import { DeleteCustomerButton } from "./delete-button";

export default async function CustomersPage() {
  const current = await requirePermission("canManageMasterData");
  const customers = await prisma.customer.findMany({
    where: { tenantId: current.tenant.id },
    orderBy: { namaPt: "asc" },
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Customer"
        description="Master data pembeli, terisolasi per perusahaan."
        action={<PrimaryLink href="/customers/new">Tambah customer</PrimaryLink>}
      />
      {customers.length === 0 ? (
        <EmptyState
          title="Belum ada customer"
          hint="Tambah PT pembeli beserta alamat pengiriman."
          action={<PrimaryLink href="/customers/new">Tambah customer</PrimaryLink>}
        />
      ) : (
        <>
          <ListSummary>{customers.length} customer</ListSummary>
          <div className="space-y-2 md:hidden">
            {customers.map((customer) => (
              <div key={customer.id} className="panel p-4">
                <p className="font-semibold text-slate-900">{customer.namaPt}</p>
                {customer.email ? <p className="text-xs text-slate-500">{customer.email}</p> : null}
                <CallLink phone={customer.noTelp} pic={customer.picName} />
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{customer.alamatPengiriman}</p>
                <div className="mt-3 flex items-center gap-3">
                  <Link href={`/customers/${customer.id}/edit`} className="text-sm font-medium text-steel hover:text-steel-dark">
                    Edit
                  </Link>
                  <DeleteCustomerButton id={customer.id} disabled={customer._count.invoices > 0} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
          <TableWrap>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>PIC / Telp</th>
                  <th className={thClass}>Alamat</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className={trClass}>
                    <td className={tdClass}>
                      <p className="font-medium text-slate-900">{customer.namaPt}</p>
                      {customer.email ? <p className="text-xs text-slate-500">{customer.email}</p> : null}
                    </td>
                    <td className={tdClass}>
                      <p>{customer.picName || "—"}</p>
                      <p className="text-xs text-slate-500">{customer.noTelp}</p>
                    </td>
                    <td className={`${tdClass} max-w-xs text-slate-600`}>
                      <p className="line-clamp-2">{customer.alamatPengiriman}</p>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-3">
                        <Link href={`/customers/${customer.id}/edit`} className="text-sm font-medium text-steel hover:text-steel-dark">
                          Edit
                        </Link>
                        <DeleteCustomerButton id={customer.id} disabled={customer._count.invoices > 0} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          </div>
        </>
      )}
    </div>
  );
}
