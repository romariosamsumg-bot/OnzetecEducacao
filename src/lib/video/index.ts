import "server-only";
import { createPrivateKey, createSign, type JsonWebKey } from "node:crypto";
import { env } from "@/lib/env";
import type { Caption, VideoAsset } from "@/lib/content/types";
import { bunnyPlayback } from "./bunny";

/**
 * Adaptador de vídeo. O restante do sistema só conhece `getPlayback()`.
 * Trocar de provedor = implementar mais um caso aqui; nada muda nas telas.
 *
 * Importante: esta função só é chamada DEPOIS de o banco (RLS) entregar o
 * video_asset — ou seja, quando a pessoa já tem direito ao conteúdo.
 */
export type Playback = {
  src: string;
  type: "video/mp4" | "application/x-mpegURL";
  poster: string | null;
  captions: Caption[];
  provider: VideoAsset["provider"];
};

const TOKEN_TTL_SECONDS = 60 * 60 * 3; // suficiente para uma aula; renovado a cada carregamento de página

export function getPlayback(asset: VideoAsset | null, viewerId: string | null): Playback | null {
  if (!asset) return null;
  switch (asset.provider) {
    case "file":
      return fileDemoPlayback(asset);
    case "bunny_stream": {
      const p = bunnyPlayback(asset.providerAssetId, asset.captions ?? []);
      return p ? { ...p, poster: asset.posterUrl ?? p.poster, type: "application/x-mpegURL", provider: "bunny_stream" } : null;
    }
    case "cloudflare_stream":
      return cloudflarePlayback(asset, viewerId);
    case "mux":
      return null; // Preparado na interface; integração Mux não implementada no MVP.
  }
}

/** Arquivos estáticos locais: SOMENTE demonstração. Nunca usar para conteúdo pago real. */
function fileDemoPlayback(asset: VideoAsset): Playback | null {
  if (env().DEMO_MEDIA_ENABLED !== "true") return null;
  if (!asset.providerAssetId.startsWith("/demo/")) return null;
  return {
    src: asset.providerAssetId,
    type: "video/mp4",
    poster: asset.posterUrl,
    captions: asset.captions ?? [],
    provider: "file",
  };
}

function cloudflarePlayback(asset: VideoAsset, viewerId: string | null): Playback | null {
  const e = env();
  if (!e.CLOUDFLARE_STREAM_CUSTOMER_CODE || !e.CLOUDFLARE_STREAM_SIGNING_KEY_ID || !e.CLOUDFLARE_STREAM_SIGNING_KEY_JWK) {
    console.warn("[video] Cloudflare Stream não configurado");
    return null;
  }
  const token = signStreamToken({
    uid: asset.providerAssetId,
    keyId: e.CLOUDFLARE_STREAM_SIGNING_KEY_ID,
    jwkBase64: e.CLOUDFLARE_STREAM_SIGNING_KEY_JWK,
    ttlSeconds: TOKEN_TTL_SECONDS,
    subject: viewerId ?? undefined,
  });
  const base = `https://customer-${e.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${token}`;
  return {
    src: `${base}/manifest/video.m3u8`,
    type: "application/x-mpegURL",
    poster: asset.posterUrl ?? `${base}/thumbnails/thumbnail.jpg?time=2s&height=480`,
    captions: [], // legendas do Stream vêm dentro do manifesto HLS
    provider: "cloudflare_stream",
  };
}

/**
 * Token assinado (RS256) para vídeos com requireSignedURLs no Cloudflare Stream.
 * Assinatura local com a chave de assinatura do Stream — sem chamada de API por reprodução.
 */
export function signStreamToken(opts: {
  uid: string;
  keyId: string;
  jwkBase64: string;
  ttlSeconds: number;
  subject?: string;
  now?: number;
}): string {
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: opts.keyId };
  const payload: Record<string, unknown> = {
    sub: opts.uid,
    kid: opts.keyId,
    exp: now + opts.ttlSeconds,
    nbf: now - 60,
  };
  const jwk = JSON.parse(Buffer.from(opts.jwkBase64, "base64").toString("utf8")) as JsonWebKey;
  const key = createPrivateKey({ key: jwk, format: "jwk" });
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc(header)}.${enc(payload)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");
  return `${unsigned}.${signature}`;
}
