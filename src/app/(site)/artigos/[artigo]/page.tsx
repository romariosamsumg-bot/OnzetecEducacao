import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentView } from "@/components/content/content-view";
import { Container, LoadingBlock } from "@/components/ui/primitives";
import { contentMetadata } from "@/lib/content/metadata";

type Props = { params: Promise<{ artigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artigo } = await params;
  return contentMetadata(artigo, "article");
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<Container className="py-8"><LoadingBlock label="Carregando conteúdo…" /></Container>}>
      <View params={params} />
    </Suspense>
  );
}

async function View({ params }: Props) {
  const { artigo } = await params;
  return <ContentView slug={artigo} type="article" />;
}
