import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ownPasswordChangeMessage } from "./own-password";

const ok = {
  currentPassword: "OldPass1!",
  newPassword: "NewPass1!",
  confirmPassword: "NewPass1!",
  currentMatches: true,
};

describe("own password change", () => {
  it("accepts a matching current password and a policy-compliant new password", () => {
    assert.equal(ownPasswordChangeMessage(ok), null);
  });

  it("requires the current password before checking the new one", () => {
    assert.equal(
      ownPasswordChangeMessage({ ...ok, currentPassword: "", currentMatches: false }),
      "Password saat ini wajib diisi.",
    );
    assert.equal(
      ownPasswordChangeMessage({ ...ok, currentMatches: false, newPassword: "weak" }),
      "Password saat ini salah.",
    );
  });

  it("requires the new password twice and enforces the policy", () => {
    assert.equal(
      ownPasswordChangeMessage({ ...ok, newPassword: "", confirmPassword: "" }),
      "Password baru dan konfirmasi wajib diisi.",
    );
    assert.equal(
      ownPasswordChangeMessage({ ...ok, confirmPassword: "NewPass2!" }),
      "Konfirmasi password tidak sama.",
    );
    assert.match(
      ownPasswordChangeMessage({ ...ok, newPassword: "password", confirmPassword: "password" }) ?? "",
      /huruf besar/,
    );
  });
});
