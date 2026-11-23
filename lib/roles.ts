import type { UserRole } from "@/lib/auth";

export function roleLabel(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    default:
      return role;
  }
}
