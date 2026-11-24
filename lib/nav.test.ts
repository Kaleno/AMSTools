import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { User } from "@prisma/client";
import type { CurrentUser } from "./current-user";
import { getNavItems } from "./nav";
import type { UserRole } from "./auth-token";

function current(role: UserRole, flags: Partial<User> = {}): CurrentUser {
  const user = {
    id: "user",
    role,
    tenantId: role === "SUPER_ADMIN" ? null : "tenant",
    canViewDashboard: false,
    canManageInvoice: false,
    canManageSuratJalan: false,
    canManageMasterData: false,
    canViewReports: false,
    ...flags,
  } as User;
  return {
    session: {
      sub: user.id,
      email: "a@b.c",
      name: "A",
      role,
      tenantId: user.tenantId,
      sessionVersion: 0,
    },
    user,
    tenant: null,
  };
}

function hrefs(role: UserRole, flags?: Partial<User>) {
  return getNavItems(current(role, flags)).map((item) => item.href);
}

describe("profile navigation", () => {
  it("gives Super Admin and tenant admins a Profil link, not company settings", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN"] as const) {
      const links = hrefs(role);
      assert.ok(links.includes("/account"), role);
      assert.equal(links.includes("/settings"), false, role);
    }
    assert.ok(hrefs("ADMIN", { canViewDashboard: true, canManageInvoice: true }).includes("/account"));
  });

  it("keeps Owner on company settings", () => {
    const links = hrefs("OWNER");
    assert.ok(links.includes("/settings"));
    assert.equal(links.includes("/account"), false);
  });
});
