import type { SessionPayload } from "@/lib/auth";

export function assertTenantAccess(session: SessionPayload, tenantId: string) {
  if (session.role === "SUPER_ADMIN") {
    return;
  }
  if (!session.tenantId || session.tenantId !== tenantId) {
    throw new Error("FORBIDDEN_TENANT");
  }
}

export function tenantScopeWhere(session: SessionPayload) {
  if (session.role === "SUPER_ADMIN") {
    return {};
  }
  if (!session.tenantId) {
    throw new Error("MISSING_TENANT");
  }
  return { tenantId: session.tenantId };
}
