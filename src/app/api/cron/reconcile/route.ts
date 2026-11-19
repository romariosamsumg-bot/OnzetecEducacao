import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { reconcile } from "@/lib/billing/service";
import { env } from "@/lib/env";

/** Reconciliação periódica (ex.: Vercel Cron a cada hora). Protegida por CRON_SECRET. */
export async function GET(request: NextRequest) {
  const secret = env().CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok =
    !!secret && auth.length === expected.length && timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const stats = await reconcile();
  return NextResponse.json({ ok: true, stats });
}
