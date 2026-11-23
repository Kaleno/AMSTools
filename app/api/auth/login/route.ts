import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession, sessionCookieOptions, type UserRole } from "@/lib/auth";

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

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: { select: { isActive: true } } },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    if (user.tenant && !user.tenant.isActive) {
      return NextResponse.json(
        { error: "Akun perusahaan dinonaktifkan. Hubungi administrator." },
        { status: 403 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }

    if (user.role !== "SUPER_ADMIN" && !user.tenantId) {
      return NextResponse.json({ error: "Akun tidak terhubung ke perusahaan." }, { status: 403 });
    }

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      tenantId: user.tenantId,
    });

    const response = NextResponse.json({
      ok: true,
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
