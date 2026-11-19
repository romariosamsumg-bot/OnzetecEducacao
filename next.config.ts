import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;

/**
 * Content-Security-Policy sem nonce (compatível com o pré-render parcial do Next.js).
 * 'unsafe-inline' em scripts é necessário para o carregamento do App Router sem nonce.
 * Mitigação de XSS: nenhum HTML vindo do banco é renderizado (somente texto), e
 * JSON-LD é escapado. Ver docs/02-arquitetura.md § Segurança.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.cloudflarestream.com https://videodelivery.net${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  "media-src 'self' blob: https://*.cloudflarestream.com https://videodelivery.net",
  "font-src 'self'",
  `connect-src 'self' https://*.cloudflarestream.com https://upload.videodelivery.net https://upload.cloudflarestream.com${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.mercadopago.com.br https://*.mercadopago.com.br https://*.mercadopago.com",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  serverExternalPackages: ["postgres"],
  experimental: {
    // Envio de capas/imagens e de arquivos de livro pelo painel (ver limites da hospedagem em docs/05-publicacao.md)
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: {
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
      { protocol: "https", hostname: "*.cloudflarestream.com" },
    ],
    localPatterns: [{ pathname: "/demo/**" }, { pathname: "/api/files/public/**" }, { pathname: "/icons/**" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
