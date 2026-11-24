import { passwordPolicyMessage } from "@/lib/password-policy";

export function ownPasswordChangeMessage(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  currentMatches: boolean;
}): string | null {
  if (!input.currentPassword) {
    return "Password saat ini wajib diisi.";
  }
  if (!input.currentMatches) {
    return "Password saat ini salah.";
  }
  if (!input.newPassword || !input.confirmPassword) {
    return "Password baru dan konfirmasi wajib diisi.";
  }
  if (input.newPassword !== input.confirmPassword) {
    return "Konfirmasi password tidak sama.";
  }
  return passwordPolicyMessage(input.newPassword);
}

/** Owner settings can save without touching the password. Any filled field starts a change. */
export function settingsOwnPasswordMessage(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  currentMatches: boolean;
}): string | null {
  if (!input.currentPassword && !input.newPassword && !input.confirmPassword) {
    return null;
  }
  return ownPasswordChangeMessage(input);
}
