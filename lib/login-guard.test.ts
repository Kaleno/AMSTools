import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcryptjs";
import { DUMMY_PASSWORD_HASH, LOGIN_FAILURE_MESSAGE, loginIsRejected, type LoginAccount } from "./login-guard";

const activeOwner: LoginAccount = {
  isActive: true,
  role: "OWNER",
  tenantId: "tenant-1",
  tenant: { isActive: true },
};

describe("login failure is one outcome", () => {
  it("uses one message for every rejected attempt", () => {
    assert.equal(LOGIN_FAILURE_MESSAGE, "Email atau password salah.");
  });

  it("rejects an unknown email, a bad password, a disabled user, and a disabled company", () => {
    assert.equal(loginIsRejected(null, false), true);
    assert.equal(loginIsRejected(null, true), true);
    assert.equal(loginIsRejected(activeOwner, false), true);
    assert.equal(loginIsRejected({ ...activeOwner, isActive: false }, true), true);
    assert.equal(loginIsRejected({ ...activeOwner, tenant: { isActive: false } }, true), true);
    assert.equal(loginIsRejected({ ...activeOwner, role: "ADMIN", tenantId: null, tenant: null }, true), true);
  });

  it("accepts an active owner and a super admin with the right password", () => {
    assert.equal(loginIsRejected(activeOwner, true), false);
    assert.equal(
      loginIsRejected({ isActive: true, role: "SUPER_ADMIN", tenantId: null, tenant: null }, true),
      false,
    );
  });

  it("keeps a cost-12 dummy hash that does not match an arbitrary password", async () => {
    assert.match(DUMMY_PASSWORD_HASH, /^\$2a\$12\$/);
    assert.equal(await bcrypt.compare("not-the-dummy-plaintext", DUMMY_PASSWORD_HASH), false);
  });
});
