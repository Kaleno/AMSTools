import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sessionCookieOptions, signSession } from "@/lib/auth";
import { sessionClaims } from "@/lib/session-cookie";
import { DUMMY_PASSWORD_HASH, LOGIN_FAILURE_MESSAGE, LOGIN_RATE_LIMIT_MESSAGE, loginIsRejected } from "@/lib/login-guard";
import { clientAddress, loginRateLimiter } from "@/lib/login-rate-limit";

export async function POST(request: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = (await request.json()) as { email?: string; password?: string };
    } catch {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const ip = clientAddress(request.headers);
    const limited = loginRateLimiter.check(ip, email);
    if (limited.limited) {
      return NextResponse.json(
        { error: LOGIN_RATE_LIMIT_MESSAGE },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: { select: { isActive: true } } },
    });

    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (
      !user ||
      loginIsRejected(
        {
          isActive: user.isActive,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant,
        },
        passwordMatches,
      )
    ) {
      loginRateLimiter.recordFailure(ip, email);
      return NextResponse.json({ error: LOGIN_FAILURE_MESSAGE }, { status: 401 });
    }

    loginRateLimiter.clear(ip, email);

    const token = await signSession(sessionClaims(user));
    const response = NextResponse.json({
      ok: true,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
    const cookie = sessionCookieOptions();
    response.cookies.set(cookie.name, token, cookie);
    return response;
  } catch (error) {
    console.error("login error", error);
    return NextResponse.json({ error: "Gagal masuk. Coba lagi." }, { status: 500 });
  }
}
