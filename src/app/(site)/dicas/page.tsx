import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Play } from "lucide-react";
import { AccessBadge, Container, DemoBadge, EmptyState, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { listShorts } from "@/lib/content/queries";
import { formatDuration } from "@/lib/content/types";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dicas rápidas",
  description: "Vídeos curtos com truques úteis para o celular, WhatsApp e segurança — direto ao ponto.",
  path: "/dicas",
});

export default function DicasPage() {
  return (
    <Container className="py-8">
      <PageHeader
        back={{ href: "/aprender", label: "Aprender" }}
        title="Dicas rápidas"
        description="Vídeos curtos, de até 1 minuto. Toque em uma dica para assistir. O vídeo só começa quando você mandar."
      />
      <Suspense fallback={<LoadingBlock label="Carregando dicas…" />}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const viewer = await getViewer();
  const shorts = await listShorts(viewer?.id ?? null, 24);
  if (shorts.length === 0) return <EmptyState title="Ainda não há dicas publicadas" />;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {shorts.map((s) => (
        <li key={s.id}>
          <Link href={`/dicas/${s.slug}`} className="group block space-y-2">
            <span className="relative block aspect-[9/16] overflow-hidden rounded-[var(--radius-card)] bg-navy-900">
              {s.posterUrl ? (
                <Image src={s.posterUrl} alt="" fill sizes="(min-width: 1024px) 250px, 45vw" className="object-cover opacity-90 group-hover:opacity-100" />
              ) : null}
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-navy-950/90 to-transparent p-3 font-bold text-white">
                <Play aria-hidden className="size-6 fill-current text-orange-400" />
                Assistir
                {formatDuration(s.durationSeconds) ? <span className="font-normal text-navy-100">· {formatDuration(s.durationSeconds)}</span> : null}
              </span>
            </span>
            <span className="block leading-snug font-bold text-navy-900 group-hover:underline">{s.title}</span>
            <span className="flex flex-wrap gap-1.5">
              <AccessBadge access={s.access} />
              {s.isDemo ? <DemoBadge /> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
