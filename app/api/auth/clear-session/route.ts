import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-token";

export async function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "password");
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
