import "server-only";
import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas na primeira leitura.
 * Nada aqui é enviado ao navegador (exceto as NEXT_PUBLIC_*, lidas em outro lugar).
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

    AUTH_MODE: z.enum(["supabase", "dev"]).default("supabase"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET precisa de pelo menos 32 caracteres"),
    DEV_AUTH_ALLOW_PRODUCTION_BUILD: z.enum(["true", "false"]).default("false"),

    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("local"),
    SUPABASE_PUBLIC_BUCKET: z.string().default("public-media"),
    SUPABASE_PRIVATE_BUCKET: z.string().default("private-files"),

    DEMO_MEDIA_ENABLED: z.enum(["true", "false"]).default("false"),
    // Provedor usado em novos envios de vídeo pelo painel
    VIDEO_PROVIDER: z.enum(["bunny_stream", "cloudflare_stream"]).default("bunny_stream"),
    BUNNY_STREAM_LIBRARY_ID: z.string().regex(/^\d+$/).optional(),
    BUNNY_STREAM_API_KEY: z.string().optional(),
    // Hostname da Pull Zone da biblioteca (ex.: vz-abc123.b-cdn.net)
    BUNNY_STREAM_CDN_HOSTNAME: z.string().regex(/^[a-z0-9.-]+$/i).optional(),
    // "URL Token Authentication Key" da Pull Zone (proteção dos links de vídeo)
    BUNNY_STREAM_TOKEN_KEY: z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_STREAM_API_TOKEN: z.string().optional(),
    CLOUDFLARE_STREAM_CUSTOMER_CODE: z.string().optional(),
    CLOUDFLARE_STREAM_SIGNING_KEY_ID: z.string().optional(),
    CLOUDFLARE_STREAM_SIGNING_KEY_JWK: z.string().optional(), // JWK em base64

    BILLING_PROVIDER: z.enum(["mercadopago", "none"]).default("none"),
    MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
    MERCADOPAGO_TEST_PAYER_EMAIL: z.string().email().optional(),

    CRON_SECRET: z.string().min(24).optional(),
    SUPPORT_EMAIL: z.string().email().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.AUTH_MODE === "supabase" && (!v.NEXT_PUBLIC_SUPABASE_URL || !v.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
      ctx.addIssue({ code: "custom", message: "AUTH_MODE=supabase exige NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" });
    }
    if (v.BILLING_PROVIDER === "mercadopago" && (!v.MERCADOPAGO_ACCESS_TOKEN || !v.MERCADOPAGO_WEBHOOK_SECRET)) {
      ctx.addIssue({ code: "custom", message: "BILLING_PROVIDER=mercadopago exige MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_WEBHOOK_SECRET" });
    }
    if (v.STORAGE_PROVIDER === "supabase" && (!v.NEXT_PUBLIC_SUPABASE_URL || !v.SUPABASE_SERVICE_ROLE_KEY)) {
      ctx.addIssue({ code: "custom", message: "STORAGE_PROVIDER=supabase exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY" });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `- ${i.path.join(".") || "env"}: ${i.message}`).join("\n");
    throw new Error(`Configuração inválida:\n${msg}`);
  }
  cached = parsed.data;
  return cached;
}

/** Login simplificado de desenvolvimento — nunca disponível em produção real. */
export function devAuthEnabled(): boolean {
  const e = env();
  if (e.AUTH_MODE !== "dev") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  if (e.NODE_ENV === "production" && e.DEV_AUTH_ALLOW_PRODUCTION_BUILD !== "true") return false;
  return true;
}

export function siteUrl(path = ""): string {
  return new URL(path, env().NEXT_PUBLIC_SITE_URL).toString();
}
