import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { hasUnsafeMediaText, isInsideDirectory, readInsideRoot, resolveMediaPath } from "./media-path";

const root = path.join(tmpdir(), "ams-uploads");

describe("upload containment", () => {
  it("requires a directory separator so a sibling prefix is outside", () => {
    const base = "/var/data/uploads";
    const sibling = "/var/data/uploads-evil/secret.png";
    assert.equal(sibling.startsWith(base), true);
    assert.equal(isInsideDirectory(base, sibling), false);
    assert.equal(isInsideDirectory(base, "/var/data/uploads/logos/tenant.png"), true);
    assert.equal(isInsideDirectory(base, "/var/data/uploads/../uploads-evil/secret.png"), false);
    assert.equal(isInsideDirectory(base, base), false);
  });
});

describe("media path", () => {
  it("resolves a logo and a proof, including a dot segment, before naming the tenant", () => {
    const logo = resolveMediaPath(["logos", ".", "victim.png"], root, "/api/media/logos/./victim.png");
    assert.equal(logo.ok, true);
    if (!logo.ok) return;
    assert.equal(logo.area, "logos");
    assert.equal(logo.tenantId, "victim");
    assert.equal(logo.relative, "logos/victim.png");
    assert.equal(logo.extension, "png");
    assert.equal(logo.absolute.startsWith(path.resolve(root) + path.sep), true);

    const proof = resolveMediaPath(["proofs", "tenant-a", "sj-1.JPEG"], root);
    assert.equal(proof.ok, true);
    if (!proof.ok) return;
    assert.equal(proof.area, "proofs");
    assert.equal(proof.tenantId, "tenant-a");
    assert.equal(proof.relative, "proofs/tenant-a/sj-1.JPEG");
    assert.equal(proof.extension, "jpeg");
  });

  it("rejects dot-dot before a raw tenant prefix can be trusted", () => {
    const crossed = resolveMediaPath(["proofs", "attacker", "..", "..", "logos", "victim.png"], root);
    assert.equal(crossed.ok, false);
    assert.equal(hasUnsafeMediaText("proofs/attacker/../../logos/victim.png"), true);
    assert.equal(resolveMediaPath(["..", "uploads-evil", "secret.png"], root).ok, false);
    assert.equal(resolveMediaPath(["logos", "tenant", "..", "other.png"], root).ok, false);
  });

  it("rejects absolute paths, backslashes, and encoded traversal", () => {
    for (const segments of [
      ["/etc/passwd"],
      ["C:\\Windows\\secret.png"],
      ["C:/Windows/secret.png"],
      ["logos", "foo\\..\\bar.png"],
      ["logos", "%2e%2e", "victim.png"],
      ["logos", "%2E%2E%2fvictim.png"],
      ["logos", ".%2e", "victim.png"],
      ["logos", "%252e%252e", "victim.png"],
      ["proofs", "attacker", "%2e%2e", "logos", "victim.png"],
      ["logos", "tenant%00.png"],
      ["logos", "tenant%5cother.png"],
      ["product-imports", "tenant", "token"],
      ["logos"],
      ["proofs", "tenant"],
      ["logos", "tenant", "extra.png"],
      [""],
    ]) {
      assert.equal(resolveMediaPath(segments, root).ok, false, segments.join("/"));
    }
    assert.equal(resolveMediaPath([], root).ok, false);
    assert.equal(
      resolveMediaPath(["logos", "victim.png"], root, "/api/media/logos/%2e%2e/%2e%2e/etc/passwd").ok,
      false,
    );
    assert.equal(resolveMediaPath(["logos", "victim.png"], root, "/api/media/logos\\..\\victim.png").ok, false);
  });
});

describe("read inside the upload root", () => {
  it("reads a real file and refuses a symlink that leaves the root", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "media-root-"));
    const outside = mkdtempSync(path.join(tmpdir(), "media-out-"));
    try {
      const logos = path.join(dir, "logos");
      mkdirSync(logos);
      const realFile = path.join(logos, "tenant.png");
      writeFileSync(realFile, "logo");
      const opened = resolveMediaPath(["logos", "tenant.png"], dir);
      assert.equal(opened.ok, true);
      if (!opened.ok) return;
      assert.equal((await readInsideRoot(dir, opened.absolute)).toString(), "logo");

      const secret = path.join(outside, "secret.png");
      writeFileSync(secret, "secret");
      const link = path.join(logos, "linked.png");
      symlinkSync(secret, link);
      const linked = resolveMediaPath(["logos", "linked.png"], dir);
      assert.equal(linked.ok, true);
      if (!linked.ok) return;
      await assert.rejects(() => readInsideRoot(dir, linked.absolute), /INVALID_PATH/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
