"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, X } from "lucide-react";
import type { NavItem } from "@/lib/nav-shared";
import { Copyright } from "@/components/copyright";
import { LogoutButton } from "@/components/logout-button";
import { navIcons, SidebarNav } from "@/components/sidebar-nav";
import { NoticeToast } from "@/components/notice-toast";

const tabHrefs = ["/dashboard", "/invoices", "/surat-jalan"];

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentLabel(pathname: string, items: NavItem[]) {
  const match = items.find((item) => isActive(pathname, item.href));
  return match?.label ?? "AMS Tools";
}

function tabLabel(item: NavItem) {
  if (item.href === "/dashboard") return "Beranda";
  if (item.href === "/surat-jalan") return "Surat Jalan";
  return item.label;
}

export function ShellFrame({
  brand,
  userName,
  role,
  items,
  children,
}: {
  brand: string;
  userName: string;
  role: string;
  items: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = tabHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const moreItems = items.filter((item) => !tabHrefs.includes(item.href));
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const brandBlock = (
    <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
      <Image src="/images/android-chrome-192x192.png" alt="AMS" width={36} height={36} className="h-9 w-9 object-contain" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-steel">AMS Tools</p>
        <p className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">{brand}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-surface">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {brandBlock}
        <SidebarNav items={items} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <p className="text-sm font-semibold text-slate-900 lg:hidden">{currentLabel(pathname, items)}</p>
          <div className="relative ml-auto">
            {menuOpen ? (
              <button type="button" aria-label="Tutup menu akun" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)} />
            ) : null}
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-slate-50"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-steel text-xs font-semibold text-white">
                {initials(userName)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-slate-900">{userName}</span>
                <span className="block text-xs text-slate-500">{role}</span>
              </span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <p className="px-3 py-2 sm:hidden">
                  <span className="block text-sm font-medium text-slate-900">{userName}</span>
                  <span className="block text-xs text-slate-500">{role}</span>
                </p>
                <LogoutButton className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60" />
              </div>
            ) : null}
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6 lg:pb-6 lg:pt-6">
            {children}
          </div>
        </main>
        <footer className="hidden shrink-0 border-t border-slate-200 bg-white px-4 py-2 lg:block">
          <Copyright />
        </footer>
      </div>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setMoreOpen(false)} />
          <div className="app-scroll absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white pb-[calc(3.5rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Lainnya</p>
              <button type="button" aria-label="Tutup" className="rounded-md p-1 text-slate-500" onClick={() => setMoreOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav items={moreItems} onNavigate={() => setMoreOpen(false)} />
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex h-14">
          {tabs.map((item) => {
            const Icon = navIcons[item.icon];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${active ? "font-semibold text-steel" : "font-medium text-slate-400"}`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {tabLabel(item)}
              </Link>
            );
          })}
          {moreItems.length > 0 ? (
            <button
              type="button"
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${moreOpen || moreActive ? "font-semibold text-steel" : "font-medium text-slate-400"}`}
              onClick={() => setMoreOpen((value) => !value)}
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={moreOpen || moreActive ? 2.25 : 1.75} />
              Lainnya
            </button>
          ) : null}
        </div>
      </nav>
      <NoticeToast />
    </div>
  );
}
