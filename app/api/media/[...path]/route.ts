import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { readUpload } from "@/lib/uploads";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (current.user.mustChangePassword) {
    return NextResponse.json({ error: "Ganti password terlebih dahulu." }, { status: 403 });
  }
  const session = current.session;

  const relative = params.path.join("/");
  if (relative.startsWith("logos/")) {
    const tenantFromFile = relative.replace(/^logos\//, "").replace(/\.[^.]+$/, "");
    if (session.role !== "SUPER_ADMIN" && session.tenantId !== tenantFromFile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (relative.startsWith("proofs/")) {
    const tenantFromFile = relative.split("/")[1];
    if (session.role !== "SUPER_ADMIN" && session.tenantId !== tenantFromFile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await readUpload(relative);
    const ext = relative.split(".").pop()?.toLowerCase() ?? "png";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
