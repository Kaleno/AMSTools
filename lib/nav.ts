import type { CurrentUser } from "@/lib/current-user";
import { hasPermission } from "@/lib/current-user";
import type { NavItem } from "@/lib/nav-shared";

export type { NavIcon, NavGroup, NavItem } from "@/lib/nav-shared";
export { navGroupOrder } from "@/lib/nav-shared";

export function getNavItems(current: CurrentUser): NavItem[] {
  const { role } = current.session;
  const items: NavItem[] = [];

  if (role === "SUPER_ADMIN" || hasPermission(current, "canViewDashboard")) {
    items.push({ href: "/dashboard", label: "Dashboard", icon: "dashboard", group: "Operasional" });
  }

  if (role === "SUPER_ADMIN") {
    items.push({ href: "/companies", label: "Perusahaan", icon: "companies", group: "Kelola" });
  }

  if (hasPermission(current, "canManageInvoice")) {
    items.push({ href: "/invoices", label: "Invoice", icon: "invoices", group: "Operasional" });
  }

  if (hasPermission(current, "canManageSuratJalan")) {
    items.push({ href: "/surat-jalan", label: "Surat Jalan", icon: "ship", group: "Operasional" });
  }

  if (hasPermission(current, "canManageMasterData")) {
    items.push({ href: "/customers", label: "Customer", icon: "customers", group: "Master" });
    items.push({ href: "/products", label: "Produk", icon: "products", group: "Master" });
  }

  if (hasPermission(current, "canViewReports")) {
    items.push({ href: "/reports/due-dates", label: "Jatuh Tempo", icon: "due", group: "Laporan" });
    items.push({ href: "/reports/history", label: "Riwayat", icon: "history", group: "Laporan" });
  }

  if (role === "OWNER") {
    items.push({ href: "/admins", label: "Akun Admin", icon: "admins", group: "Kelola" });
    items.push({ href: "/settings", label: "Pengaturan", icon: "settings", group: "Kelola" });
  }

  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    items.push({ href: "/account", label: "Profil", icon: "settings", group: "Kelola" });
  }

  return items;
}
