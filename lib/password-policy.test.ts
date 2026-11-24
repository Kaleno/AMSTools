import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateTemporaryPassword, passwordPolicyMessage } from "./password-policy";

describe("password policy", () => {
  it("accepts a password that has every required class", () => {
    assert.equal(passwordPolicyMessage("Abcdef1!"), null);
    assert.equal(passwordPolicyMessage("ChangeMe123!"), null);
  });

  it("names each missing rule in Indonesian", () => {
    assert.equal(
      passwordPolicyMessage("abcdefgh"),
      "Password belum memenuhi syarat: huruf besar, angka, simbol.",
    );
    assert.equal(
      passwordPolicyMessage("Abcdefg"),
      "Password belum memenuhi syarat: minimal 8 karakter, angka, simbol.",
    );
    assert.equal(
      passwordPolicyMessage(""),
      "Password belum memenuhi syarat: minimal 8 karakter, huruf besar, huruf kecil, angka, simbol.",
    );
  });

  it("does not trim, so a surrounding symbol still counts", () => {
    assert.equal(passwordPolicyMessage(" Abcdef1"), null);
  });

  it("rejects passwords longer than 128 characters", () => {
    assert.equal(passwordPolicyMessage(`${"A".repeat(60)}a1!${"b".repeat(70)}`), "Password maksimal 128 karakter.");
  });

  it("generates temporary passwords that meet the policy", () => {
    for (let index = 0; index < 40; index += 1) {
      const password = generateTemporaryPassword();
      assert.equal(passwordPolicyMessage(password), null, password);
      assert.equal(password.length, 12);
    }
  });
});
