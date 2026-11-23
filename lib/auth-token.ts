import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ams_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type UserRole = "SUPER_ADMIN" | "OWNER" | "ADMIN";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET belum diset atau terlalu pendek.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || !payload.email || !payload.role) {
      return null;
    }
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name ?? ""),
      role: payload.role as UserRole,
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
