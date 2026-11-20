import "server-only";
import { createHash, createHmac } from "node:crypto";
import { env } from "@/lib/env";
import type { Caption } from "@/lib/content/types";

/**
 * Bunny Stream — vídeo com streaming adaptativo (HLS) e links protegidos.
 *
 * Proteção dos links: "CDN Token Authentication" da Pull Zone da biblioteca,
 * implementada conforme o SDK oficial (github.com/BunnyWay/BunnyCDN.TokenAuthentication):
 *   token = "HS256-" + Base64URL( HMAC-SHA256(chave, caminho_assinado + expires + ip + parametros_ordenados) )
 * Para HLS usamos o formato de diretório (token no caminho), para que a playlist
 * e todos os segmentos de /{videoId}/ fiquem autorizados.
 *
 * Envio pelo painel: upload TUS direto do navegador para a Bunny, com assinatura
 * SHA256(libraryId + apiKey + expires + videoId) gerada aqui no servidor
 * (a chave de API nunca vai para o navegador).
 *
 * ATENÇÃO: escrito conforme a documentação e o SDK oficiais; NÃO validado contra
 * uma conta real da Bunny nesta etapa (sem credenciais). Ver docs/06-relatorio.md.
 */

const API = "https://video.bunnycdn.com";

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** Assina um link da CDN da Bunny (função pura, testada em tests/unit/bunny.test.ts). */
export function signBunnyCdnUrl(opts: {
  host: string;
  path: string; // ex.: /{videoId}/playlist.m3u8
  securityKey: string;
  expires: number; // UNIX em segundos (absoluto)
  tokenPath?: string; // ex.: /{videoId}/ — autoriza tudo dentro do diretório
  isDirectory?: boolean; // token no caminho (necessário para HLS)
}): string {
  const params: Record<string, string> = {};
  if (opts.tokenPath) params.token_path = opts.tokenPath;
  const keys = Object.keys(params).sort();
  const signingData = keys.map((k) => `${k}=${params[k]}`).join("&");
  const signaturePath = opts.tokenPath ?? opts.path;
  const message = `${signaturePath}${opts.expires}${signingData}`;
  const token = `HS256-${b64url(createHmac("sha256", opts.securityKey).update(message).digest())}`;
  const tail = keys.map((k) => `&${k}=${encodeURIComponent(params[k])}`).join("");

  if (opts.isDirectory) {
    return `https://${opts.host}/bcdn_token=${token}${tail}&expires=${opts.expires}${opts.path}`;
  }
  return `https://${opts.host}${opts.path}?token=${token}${tail}&expires=${opts.expires}`;
}

/** Assinatura do upload TUS (função pura): SHA256 hex de libraryId + apiKey + expires + videoId. */
export function bunnyTusSignature(libraryId: string, apiKey: string, expires: number, videoId: string): string {
  return createHash("sha256").update(`${libraryId}${apiKey}${expires}${videoId}`).digest("hex");
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isBunnyVideoId(id: string) {
  return GUID.test(id);
}

/* ----------------------------- Reprodução ----------------------------- */

const PLAYBACK_TTL = 60 * 60 * 3;

export function bunnyPlayback(videoId: string, storedCaptions: Caption[]): {
  src: string;
  poster: string;
  captions: Caption[];
} | null {
  const e = env();
  if (!e.BUNNY_STREAM_CDN_HOSTNAME || !e.BUNNY_STREAM_TOKEN_KEY || !isBunnyVideoId(videoId)) {
    if (!isBunnyVideoId(videoId)) console.warn("[video] identificador Bunny inválido");
    else console.warn("[video] Bunny Stream não configurado");
    return null;
  }
  const expires = Math.floor(Date.now() / 1000) + PLAYBACK_TTL;
  const dir = `/${videoId}/`;
  const signDir = (file: string) =>
    signBunnyCdnUrl({
      host: e.BUNNY_STREAM_CDN_HOSTNAME!,
      path: `${dir}${file}`,
      securityKey: e.BUNNY_STREAM_TOKEN_KEY!,
      expires,
      tokenPath: dir,
      isDirectory: true,
    });
  return {
    src: signDir("playlist.m3u8"),
    poster: signDir("thumbnail.jpg"),
    // Legendas cadastradas na Bunny ficam em /{videoId}/captions/{idioma}.vtt
    captions: storedCaptions.map((c) => ({ ...c, url: signDir(`captions/${c.lang}.vtt`) })),
  };
}

/* ------------------------------ Painel ------------------------------ */

function cfg() {
  const e = env();
  if (!e.BUNNY_STREAM_LIBRARY_ID || !e.BUNNY_STREAM_API_KEY) {
    throw new Error("Bunny Stream não configurado (BUNNY_STREAM_LIBRARY_ID / BUNNY_STREAM_API_KEY).");
  }
  return { library: e.BUNNY_STREAM_LIBRARY_ID, key: e.BUNNY_STREAM_API_KEY };
}

/** Cria o registro do vídeo e devolve os dados para o navegador enviar o arquivo (TUS). */
export async function createBunnyUpload(title: string): Promise<{
  videoId: string;
  libraryId: string;
  expires: number;
  signature: string;
}> {
  const { library, key } = cfg();
  const res = await fetch(`${API}/library/${library}/videos`, {
    method: "POST",
    headers: { AccessKey: key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ title: title.slice(0, 200) || "Aula Onzetec" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`A Bunny recusou o pedido (HTTP ${res.status}).`);
  const { guid } = (await res.json()) as { guid: string };
  const expires = Math.floor(Date.now() / 1000) + 6 * 3600;
  return { videoId: guid, libraryId: library, expires, signature: bunnyTusSignature(library, key, expires, guid) };
}

/** Situação, duração e legendas do vídeo na Bunny (status 4 = pronto). */
export async function fetchBunnyVideo(videoId: string): Promise<{ ready: boolean; durationSeconds: number | null; captions: Caption[] } | null> {
  const e = env();
  if (!e.BUNNY_STREAM_LIBRARY_ID || !e.BUNNY_STREAM_API_KEY || !isBunnyVideoId(videoId)) return null;
  const res = await fetch(`${API}/library/${e.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`, {
    headers: { AccessKey: e.BUNNY_STREAM_API_KEY, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const v = (await res.json()) as { status?: number; length?: number; captions?: { srclang: string; label: string }[] | null };
  return {
    ready: v.status === 4,
    durationSeconds: v.length && v.length > 0 ? Math.round(v.length) : null,
    captions: (v.captions ?? []).map((c) => ({ lang: c.srclang, label: c.label, url: "" })),
  };
}
