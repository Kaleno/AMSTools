import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passwordResetDenial, type PasswordResetActor, type PasswordResetTarget } from "./password-reset-auth";

const superAdmin: PasswordResetActor = { id: "sa", role: "SUPER_ADMIN", tenantId: null };
const ownerA: PasswordResetActor = { id: "own-a", role: "OWNER", tenantId: "tenant-a" };
const ownerB: PasswordResetActor = { id: "own-b", role: "OWNER", tenantId: "tenant-b" };
const adminA: PasswordResetTarget = { id: "adm-a", role: "ADMIN", tenantId: "tenant-a" };
const adminB: PasswordResetTarget = { id: "adm-b", role: "ADMIN", tenantId: "tenant-b" };
const ownerTargetB: PasswordResetTarget = { id: "own-b", role: "OWNER", tenantId: "tenant-b" };

describe("password reset authorization", () => {
  it("lets a super admin reset an owner", () => {
    assert.equal(passwordResetDenial(superAdmin, ownerTargetB), null);
  });

  it("refuses a super admin resetting admins, peers, or themselves", () => {
    assert.match(passwordResetDenial(superAdmin, adminA) ?? "", /Owner/);
    assert.match(passwordResetDenial(superAdmin, { id: "sa-2", role: "SUPER_ADMIN", tenantId: null }) ?? "", /Owner/);
    assert.match(passwordResetDenial(superAdmin, { ...superAdmin }) ?? "", /akun sendiri/);
  });

  it("lets an owner reset an admin in the same tenant", () => {
    assert.equal(passwordResetDenial(ownerA, adminA), null);
  });

  it("refuses cross-tenant, peer, and higher-role resets", () => {
    assert.match(passwordResetDenial(ownerA, adminB) ?? "", /luar perusahaan/);
    assert.match(passwordResetDenial(ownerA, ownerTargetB) ?? "", /luar perusahaan/);
    assert.match(passwordResetDenial(ownerA, { id: "own-a2", role: "OWNER", tenantId: "tenant-a" }) ?? "", /admin/);
    assert.match(passwordResetDenial(ownerA, { id: "sa", role: "SUPER_ADMIN", tenantId: null }) ?? "", /luar perusahaan/);
    assert.match(passwordResetDenial(ownerB, adminA) ?? "", /luar perusahaan/);
  });

  it("refuses admins and users with no tenant", () => {
    const adminActor: PasswordResetActor = { id: "adm-a", role: "ADMIN", tenantId: "tenant-a" };
    assert.match(passwordResetDenial(adminActor, { id: "adm-a2", role: "ADMIN", tenantId: "tenant-a" }) ?? "", /tidak berhak/);
    assert.match(passwordResetDenial({ id: "own-x", role: "OWNER", tenantId: null }, adminA) ?? "", /luar perusahaan/);
  });
});
