import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SignJWT } from "jose";
import { readSessionVersion, signSession, verifySessionToken } from "./auth-token";

process.env.JWT_SECRET = "unit-test-jwt-secret-32chars";

describe("session token version", () => {
  it("treats a missing claim as version 0 and rejects garbage", () => {
    assert.equal(readSessionVersion(undefined), 0);
    assert.equal(readSessionVersion(null), 0);
    assert.equal(readSessionVersion(0), 0);
    assert.equal(readSessionVersion(3), 3);
    assert.equal(readSessionVersion(1.5), null);
    assert.equal(readSessionVersion(-1), null);
    assert.equal(readSessionVersion("3"), null);
  });

  it("round-trips sessionVersion", async () => {
    const token = await signSession({
      sub: "user",
      email: "a@b.c",
      name: "A",
      role: "ADMIN",
      tenantId: "tenant",
      sessionVersion: 4,
    });
    const payload = await verifySessionToken(token);
    assert.equal(payload?.sessionVersion, 4);
    assert.equal(payload?.role, "ADMIN");
  });

  it("accepts a legacy token that has no sessionVersion claim", async () => {
    const token = await new SignJWT({
      sub: "user",
      email: "a@b.c",
      name: "A",
      role: "OWNER",
      tenantId: "tenant",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const payload = await verifySessionToken(token);
    assert.equal(payload?.sessionVersion, 0);
    assert.equal(payload?.email, "a@b.c");
  });
});
