import { redirect } from "next/navigation";
import { getSession, type SessionPayload, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Tenant, User } from "@prisma/client";

export type PermissionKey =
  | "canViewDashboard"
  | "canManageInvoice"
  | "canManageSuratJalan"
  | "canManageMasterData"
  | "canViewReports";

export type CurrentUser = {
  session: SessionPayload;
  user: User;
  tenant: Tenant | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { tenant: true },
  });

  if (!user || !user.isActive) return null;
  if (user.tenant && !user.tenant.isActive) return null;

  return {
    session: {
      ...session,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId,
    },
    user,
    tenant: user.tenant,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }
  return current;
}

export async function requireRoles(roles: UserRole[]): Promise<CurrentUser> {
  const current = await requireUser();
  if (!roles.includes(current.session.role)) {
    redirect("/forbidden");
  }
  return current;
}

export async function requireSuperAdmin() {
  return requireRoles(["SUPER_ADMIN"]);
}

export async function requireTenantUser(): Promise<CurrentUser & { tenant: Tenant }> {
  const current = await requireUser();
  if (current.session.role === "SUPER_ADMIN" || !current.tenant || !current.session.tenantId) {
    redirect("/forbidden");
  }
  return current as CurrentUser & { tenant: Tenant };
}

export function hasPermission(current: CurrentUser, key: PermissionKey) {
  if (current.session.role === "SUPER_ADMIN") return false;
  if (current.session.role === "OWNER") return true;
  return current.user[key];
}

export async function requirePermission(key: PermissionKey) {
  const current = await requireTenantUser();
  if (!hasPermission(current, key)) {
    redirect("/forbidden");
  }
  return current;
}
