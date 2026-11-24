import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeInternalPath } from "./safe-redirect";

describe("login return path", () => {
  it("keeps a same-origin relative path", () => {
    assert.equal(safeInternalPath("/dashboard"), "/dashboard");
    assert.equal(safeInternalPath("/invoices/abc-123"), "/invoices/abc-123");
    assert.equal(
      safeInternalPath("/reports/history?from=2024-01-01&to=2024-02-01"),
      "/reports/history?from=2024-01-01&to=2024-02-01",
    );
    assert.equal(safeInternalPath("  /account  "), "/account");
    assert.equal(safeInternalPath("/surat-jalan/abc#bukti"), "/surat-jalan/abc#bukti");
  });

  it("falls back when the value is missing", () => {
    assert.equal(safeInternalPath(null), "/dashboard");
    assert.equal(safeInternalPath(undefined), "/dashboard");
    assert.equal(safeInternalPath(""), "/dashboard");
    assert.equal(safeInternalPath("   "), "/dashboard");
  });

  it("rejects protocol-relative URLs, backslashes, and schemes", () => {
    for (const value of [
      "//evil.com",
      "///evil.com",
      "/\\evil.com",
      "/\\\\evil.com",
      "\\\\evil.com",
      "https://evil.com",
      "http://evil.com",
      "javascript:alert(1)",
      "https:evil.com",
      "/foo\\bar",
      "/foo\tbar",
      "/foo\nbar",
      " //evil.com",
    ]) {
      assert.equal(safeInternalPath(value), "/dashboard", value);
    }
  });

  it("rejects encoded slashes, backslashes, and double-encoding", () => {
    for (const value of [
      "/%2F%2Fevil.com",
      "/%2f%2fevil.com",
      "/%5C%5Cevil.com",
      "/%5c%5cevil.com",
      "/%252F%252Fevil.com",
      "/%252f%252fevil.com",
      "/dashboard%2F..%2F..//evil.com",
      "/%09/evil.com",
      "/%00/evil.com",
    ]) {
      assert.equal(safeInternalPath(value), "/dashboard", value);
    }
  });
});
