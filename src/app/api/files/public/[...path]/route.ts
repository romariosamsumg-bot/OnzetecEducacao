import { NextResponse, type NextRequest } from "next/server";
import { detectFileType, readLocalFile } from "@/lib/storage";
import { env } from "@/lib/env";

/** Somente STORAGE_PROVIDER=local (desenvolvimento): serve imagens públicas enviadas pelo painel. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (env().STORAGE_PROVIDER !== "local") return new NextResponse(null, { status: 404 });
  const { path } = await params;
  try {
    const bytes = await readLocalFile("public", path.join("/"));
    const type = detectFileType(bytes);
    if (!type?.mime.startsWith("image/")) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": type.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
