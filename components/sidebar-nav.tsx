"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  FileText,
  History,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { navGroupOrder, type NavIcon, type NavItem } from "@/lib/nav-shared";

export const navIcons: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  companies: Building2,
  invoices: FileText,
  ship: Truck,
  customers: Users,
  products: Package,
  due: CalendarClock,
  history: History,
  admins: Shield,
  settings: Settings,
};

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="app-scroll flex-1 overflow-y-auto px-3 py-3">
      {navGroupOrder.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="mb-2">
            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
            <div className="space-y-0.5">
              {groupItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = navIcons[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={
                      active
                        ? "relative flex items-center gap-2.5 rounded-lg bg-steel-tint px-3 py-2 text-sm font-semibold text-steel-dark before:absolute before:left-0 before:top-1.5 before:h-[calc(100%-0.75rem)] before:w-0.5 before:rounded-full before:bg-steel"
                        : "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
