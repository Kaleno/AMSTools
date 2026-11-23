import type { CurrentUser } from "@/lib/current-user";
import { getNavItems } from "@/lib/nav";
import { roleLabel } from "@/lib/roles";
import { ShellFrame } from "@/components/shell-frame";

export function AppShell({
  current,
  children,
}: {
  current: CurrentUser;
  children: React.ReactNode;
}) {
  const items = getNavItems(current);
  const role = roleLabel(current.session.role);
  const scope = current.tenant ? current.tenant.namaPt : "Global";

  return (
    <ShellFrame brand={current.tenant?.namaPt ?? "Platform"} userName={current.session.name} role={`${role} · ${scope}`} items={items}>
      {children}
    </ShellFrame>
  );
}
