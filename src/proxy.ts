import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase Auth (tokens de curta duração) a cada navegação.
 * A autorização NÃO acontece aqui: cada página, Server Action e rota verifica
 * a sessão perto dos dados, e o banco aplica RLS.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.AUTH_MODE === "dev" || !url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    // Ignora arquivos estáticos, imagens e webhooks (que não usam sessão)
    "/((?!_next/static|_next/image|favicon.ico|icons/|demo/|manifest.webmanifest|sw.js|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|vtt)$).*)",
  ],
};
