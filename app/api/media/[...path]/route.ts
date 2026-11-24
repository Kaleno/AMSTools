import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { resolveMediaPath } from "@/lib/media-path";
import { readUpload, uploadsRoot } from "@/lib/uploads";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (current.user.mustChangePassword) {
    return NextResponse.json({ error: "Ganti password terlebih dahulu." }, { status: 403 });
  }
  const session = current.session;

  const { path: segments } = await params;
  const resolved = resolveMediaPath(segments ?? [], uploadsRoot(), new URL(request.url).pathname);
  if (!resolved.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.role !== "SUPER_ADMIN" && session.tenantId !== resolved.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const file = await readUpload(resolved.relative);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": TYPES[resolved.extension] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
