import { cookies } from "next/headers";
import { sessionCookieOptions, signSession, type UserRole } from "@/lib/auth-token";

export function sessionClaims(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  sessionVersion: number;
}) {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    tenantId: user.tenantId,
    sessionVersion: user.sessionVersion,
  };
}

export async function setSessionCookie(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  sessionVersion: number;
}) {
  const token = await signSession(sessionClaims(user));
  const { name, ...options } = sessionCookieOptions();
  const cookieStore = await cookies();
  cookieStore.set(name, token, options);
}
