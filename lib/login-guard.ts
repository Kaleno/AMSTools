/** Same response for a wrong email, a wrong password, and a disabled company or user. */
export const LOGIN_FAILURE_MESSAGE = "Email atau password salah.";

export const LOGIN_RATE_LIMIT_MESSAGE = "Terlalu banyak percobaan masuk. Coba lagi nanti.";

/**
 * bcrypt cost-12 hash used when the email is not a user.
 * Comparing this keeps the failure time close to a real password check.
 * The plaintext is not a credential and is not accepted for login.
 */
export const DUMMY_PASSWORD_HASH = "$2a$12$t/iuGmUQ/fIm.WdFXWqOROm9Mi.fSlTtqiqiet7O8CEGgGs2boD6a";

export type LoginAccount = {
  isActive: boolean;
  role: string;
  tenantId: string | null;
  tenant: { isActive: boolean } | null;
};

/** True when this attempt must not receive a session. */
export function loginIsRejected(account: LoginAccount | null, passwordMatches: boolean): boolean {
  if (!account || !passwordMatches) return true;
  if (!account.isActive) return true;
  if (account.tenant && !account.tenant.isActive) return true;
  if (account.role !== "SUPER_ADMIN" && !account.tenantId) return true;
  return false;
}
