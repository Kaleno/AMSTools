import { randomInt } from "crypto";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "Minimal 8 karakter",
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "upper",
    label: "Ada huruf besar",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lower",
    label: "Ada huruf kecil",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "digit",
    label: "Ada angka",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "symbol",
    label: "Ada simbol (contoh ! @ # $)",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

const RULE_PHRASE: Record<string, string> = {
  length: "minimal 8 karakter",
  upper: "huruf besar",
  lower: "huruf kecil",
  digit: "angka",
  symbol: "simbol",
};

/** Returns an Indonesian error, or null when the password meets the policy. Does not trim. */
export function passwordPolicyMessage(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Password maksimal 128 karakter.";
  }
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => RULE_PHRASE[rule.id] ?? rule.label,
  );
  if (missing.length === 0) return null;
  return `Password belum memenuhi syarat: ${missing.join(", ")}.`;
}

export function passwordFrom(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";

export function generateTemporaryPassword(length = 12) {
  const pools = [UPPER, LOWER, DIGITS, SYMBOLS];
  const chars = pools.map((set) => set[randomInt(set.length)] ?? "A");
  const all = pools.join("");
  while (chars.length < length) {
    chars.push(all[randomInt(all.length)] ?? "a");
  }
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = chars[index] ?? "a";
    chars[index] = chars[swapIndex] ?? "a";
    chars[swapIndex] = current;
  }
  return chars.join("");
}
