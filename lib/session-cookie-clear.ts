import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth-token";

/** Same name, path, httpOnly, secure, and sameSite as the cookie that was set. maxAge 0 removes it. */
export function clearedSessionCookie() {
  const options = sessionCookieOptions();
  return {
    name: options.name,
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    maxAge: 0,
  };
}

export function clearSessionOn(response: NextResponse) {
  const cookie = clearedSessionCookie();
  response.cookies.set(cookie.name, "", {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
}
