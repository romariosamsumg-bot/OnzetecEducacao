import { NextResponse, type NextRequest } from "next/server";
import { detectFileType, readLocalFile, verifyLocalPrivateToken } from "@/lib/storage";
import { env } from "@/lib/env";

/** Somente STORAGE_PROVIDER=local: entrega arquivo privado mediante token assinado e com validade curta. */
export async function GET(req: NextRequest) {
  if (env().STORAGE_PROVIDER !== "local") return new NextResponse(null, { status: 404 });
  const data = verifyLocalPrivateToken(req.nextUrl.searchParams.get("token"));
  if (!data) return new NextResponse("Link expirado. Volte para Minha conta e baixe novamente.", { status: 403 });
  try {
    const bytes = await readLocalFile("private", data.p);
    const type = detectFileType(bytes);
    const name = (data.n ?? "arquivo").replace(/[^\w.\- ]/g, "_");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type?.mime ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
