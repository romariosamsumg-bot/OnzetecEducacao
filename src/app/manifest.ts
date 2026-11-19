import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onzetec Educação",
    short_name: "Onzetec",
    description: "Aprenda a usar o celular com calma: cursos, guias passo a passo e dicas rápidas.",
    lang: "pt-BR",
    start_url: "/?origem=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f4",
    theme_color: "#0b2545",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Resolver um problema", url: "/resolver", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Meus salvos", url: "/salvos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
