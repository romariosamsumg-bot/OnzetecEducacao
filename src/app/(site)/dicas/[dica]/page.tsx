import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentView } from "@/components/content/content-view";
import { Container, LoadingBlock } from "@/components/ui/primitives";
import { contentMetadata } from "@/lib/content/metadata";

type Props = { params: Promise<{ dica: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dica } = await params;
  return contentMetadata(dica, "short");
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<Container className="py-8"><LoadingBlock label="Carregando conteúdo…" /></Container>}>
      <View params={params} />
    </Suspense>
  );
}

async function View({ params }: Props) {
  const { dica } = await params;
  return <ContentView slug={dica} type="short" />;
}
