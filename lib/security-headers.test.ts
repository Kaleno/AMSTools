import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { securityHeaders } from "./security-headers.mjs";

function header(nodeEnv: "development" | "production" | "test" | undefined, key: string) {
  return securityHeaders(nodeEnv).find((item) => item.key === key)?.value;
}

describe("security headers", () => {
  it("sets clickjacking, sniffing, referrer, and a tight permissions policy", () => {
    assert.equal(header("development", "X-Frame-Options"), "DENY");
    assert.equal(header("development", "X-Content-Type-Options"), "nosniff");
    assert.equal(header("development", "Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.match(header("development", "Permissions-Policy") ?? "", /microphone=\(\)/);
    assert.match(header("development", "Permissions-Policy") ?? "", /camera=\(self\)/);
    assert.equal(header("development", "Content-Security-Policy"), "frame-ancestors 'none'");
    assert.equal(header("development", "Strict-Transport-Security"), undefined);
  });

  it("adds HSTS only in production", () => {
    assert.equal(header("production", "Strict-Transport-Security"), "max-age=15552000");
    assert.equal(header("test", "Strict-Transport-Security"), undefined);
  });
});
