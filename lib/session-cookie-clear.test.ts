import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SESSION_COOKIE, sessionCookieOptions } from "./auth-token";
import { clearedSessionCookie } from "./session-cookie-clear";

function setNodeEnv(value: string | undefined) {
  (process.env as { NODE_ENV?: string }).NODE_ENV = value;
}

describe("cleared session cookie", () => {
  it("repeats the flags used when the cookie is set", () => {
    const previous = process.env.NODE_ENV;
    try {
      setNodeEnv("development");
      const setDev = sessionCookieOptions();
      const clearDev = clearedSessionCookie();
      assert.equal(clearDev.name, setDev.name);
      assert.equal(clearDev.name, SESSION_COOKIE);
      assert.equal(clearDev.httpOnly, setDev.httpOnly);
      assert.equal(clearDev.sameSite, setDev.sameSite);
      assert.equal(clearDev.path, setDev.path);
      assert.equal(clearDev.secure, false);
      assert.equal(clearDev.maxAge, 0);
      assert.equal(setDev.maxAge > 0, true);

      setNodeEnv("production");
      const setProd = sessionCookieOptions();
      const clearProd = clearedSessionCookie();
      assert.equal(clearProd.secure, true);
      assert.equal(setProd.secure, true);
      assert.equal(clearProd.httpOnly, true);
      assert.equal(clearProd.sameSite, "lax");
      assert.equal(clearProd.path, "/");
    } finally {
      setNodeEnv(previous);
    }
  });
});
