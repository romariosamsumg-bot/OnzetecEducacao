import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Cliente do Supabase Auth para Server Components, Server Actions e Route Handlers. */
export async function supabaseServer() {
  const e = env();
  const cookieStore = await cookies();
  return createServerClient(e.NEXT_PUBLIC_SUPABASE_URL!, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Em Server Components não é possível gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}
