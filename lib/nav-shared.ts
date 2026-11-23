export type NavIcon =
  | "dashboard"
  | "companies"
  | "invoices"
  | "ship"
  | "customers"
  | "products"
  | "due"
  | "history"
  | "admins"
  | "settings";

export type NavGroup = "Operasional" | "Master" | "Laporan" | "Kelola";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group: NavGroup;
};

export const navGroupOrder: NavGroup[] = ["Operasional", "Master", "Laporan", "Kelola"];
