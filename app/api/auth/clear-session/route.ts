import { NextResponse } from "next/server";
import { clearSessionOn } from "@/lib/session-cookie-clear";

export async function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "password");
  const response = NextResponse.redirect(loginUrl);
  clearSessionOn(response);
  return response;
}
