import { NextResponse } from "next/server";
import { clearSessionOn } from "@/lib/session-cookie-clear";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionOn(response);
  return response;
}
