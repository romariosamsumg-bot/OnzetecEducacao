import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { asUser } from "@/lib/db";
import { getSession } from "./session";

export type SubscriptionSummary = {
  id: string;
  status: "pending" | "active" | "past_due" | "paused" | "canceled" | "expired";
  planName: string;
  interval: "month" | "year";
  priceCents: number | null;
  provider: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type Viewer = {
  id: string;
  email: string | null;
  displayName: string;
  role: "member" | "admin";
  isAdmin: boolean;
  hasAccess: boolean; // assinatura válida (ou administrador)
  textScale: 100 | 115 | 130;
  reduceMotion: boolean;
  learningInterest: string | null;
  onboardingDone: boolean;
  subscription: SubscriptionSummary | null;
};

/** Pessoa conectada (ou null). Dados lidos com RLS, como a própria pessoa. */
export const getViewer = cache(() => loadViewer());

/** Versão sem cache da requisição (use após alterar a assinatura na mesma requisição). */
export async function loadViewer(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session) return null;

  return asUser(session.userId, async (db) => {
    const [profile] = await db<
      {
        id: string;
        displayName: string;
        role: "member" | "admin";
        textScale: number;
        reduceMotion: boolean;
        learningInterest: string | null;
        onboardingDone: boolean;
        hasAccess: boolean;
      }[]
    >`
      select p.id, p.display_name, p.role, p.text_scale, p.reduce_motion, p.learning_interest,
             p.onboarding_done, public.has_active_subscription() as has_access
      from public.profiles p where p.id = auth.uid()`;
    if (!profile) return null;

    const [sub] = await db<SubscriptionSummary[]>`
      select s.id, s.status, pl.name as plan_name, pl.interval, s.price_cents, s.provider,
             s.current_period_end, s.cancel_at_period_end
      from public.subscriptions s join public.plans pl on pl.id = s.plan_id
      where s.user_id = auth.uid()
      order by (s.status in ('active', 'past_due', 'paused')) desc, s.created_at desc
      limit 1`;

    const isAdmin = profile.role === "admin";
    return {
      id: profile.id,
      email: session.email,
      displayName: profile.displayName,
      role: profile.role,
      isAdmin,
      hasAccess: isAdmin || profile.hasAccess,
      textScale: ([100, 115, 130].includes(profile.textScale) ? profile.textScale : 100) as Viewer["textScale"],
      reduceMotion: profile.reduceMotion,
      learningInterest: profile.learningInterest,
      onboardingDone: profile.onboardingDone,
      subscription: sub ?? null,
    };
  });
}

/** Exige conta. Redireciona para "Entrar" e volta para a página atual depois. */
export async function requireViewer(returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?voltar=${encodeURIComponent(safeReturnPath(returnTo))}`);
  return viewer;
}

/** Exige administrador. Para os demais, a área simplesmente não existe (404). */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}

/** Aceita apenas caminhos internos (evita redirecionamento aberto). */
export function safeReturnPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  return path.slice(0, 300);
}
