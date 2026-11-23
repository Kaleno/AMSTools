"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/lib/nav-shared";
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { NoticeToast } from "@/components/notice-toast";

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

function currentLabel(pathname: string, items: NavItem[]) {
  const match = items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.label ?? "AMS Tools";
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
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
    <div className="flex h-dvh overflow-hidden bg-surface">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {brandBlock}
        <SidebarNav items={items} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-dvh w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <button
              type="button"
              aria-label="Tutup menu"
              className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            {brandBlock}
            <SidebarNav items={items} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-semibold text-slate-900 lg:hidden">{currentLabel(pathname, items)}</p>
          </div>

          <div className="relative">
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
        <main className="app-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
      <NoticeToast />
    </div>
  );
}
