import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentView } from "@/components/content/content-view";
import { Container, LoadingBlock } from "@/components/ui/primitives";
import { contentMetadata } from "@/lib/content/metadata";

type Props = { params: Promise<{ guia: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guia } = await params;
  return contentMetadata(guia, "guide");
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<Container className="py-8"><LoadingBlock label="Carregando conteúdo…" /></Container>}>
      <View params={params} />
    </Suspense>
  );
}

async function View({ params }: Props) {
  const { guia } = await params;
  return <ContentView slug={guia} type="guide" />;
}
