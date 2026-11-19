import "server-only";
import { env } from "@/lib/env";

/**
 * Operações administrativas no Cloudflare Stream (API v4).
 * Escritas conforme a documentação pública; NÃO testadas contra a API real nesta
 * etapa (sem credenciais). Ver docs/06-relatorio.md.
 */
function cfg() {
  const e = env();
  if (!e.CLOUDFLARE_ACCOUNT_ID || !e.CLOUDFLARE_STREAM_API_TOKEN) {
    throw new Error("Cloudflare Stream não configurado (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN).");
  }
  return { account: e.CLOUDFLARE_ACCOUNT_ID, token: e.CLOUDFLARE_STREAM_API_TOKEN };
}

/** Cria um envio direto (upload do navegador para o Cloudflare, até 200 MB por envio básico). */
export async function createStreamDirectUpload(opts: { requireSignedURLs: boolean }): Promise<{ uploadURL: string; uid: string }> {
  const { account, token } = cfg();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ maxDurationSeconds: 3 * 3600, requireSignedURLs: opts.requireSignedURLs }),
    cache: "no-store",
  });
  const data = (await res.json()) as { success: boolean; result?: { uploadURL: string; uid: string } };
  if (!res.ok || !data.success || !data.result) throw new Error(`Cloudflare Stream recusou o pedido (HTTP ${res.status}).`);
  return data.result;
}

export async function fetchStreamVideo(uid: string): Promise<{ readyToStream: boolean; duration: number | null } | null> {
  const e = env();
  if (!e.CLOUDFLARE_ACCOUNT_ID || !e.CLOUDFLARE_STREAM_API_TOKEN) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${e.CLOUDFLARE_ACCOUNT_ID}/stream/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${e.CLOUDFLARE_STREAM_API_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: { readyToStream?: boolean; duration?: number } };
  return { readyToStream: !!data.result?.readyToStream, duration: data.result?.duration && data.result.duration > 0 ? data.result.duration : null };
}
