import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { preferencesScript } from "@/lib/inline-scripts";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-atkinson",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Onzetec Educação — aprenda a usar o celular com calma",
    template: "%s | Onzetec Educação",
  },
  description:
    "Cursos, guias passo a passo e dicas rápidas para usar o celular Android, o WhatsApp e a internet com segurança e autonomia.",
  applicationName: "Onzetec Educação",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Onzetec Educação",
  },
  appleWebApp: { capable: true, title: "Onzetec", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b2545",
  width: "device-width",
  initialScale: 1,
  // Zoom sempre permitido (acessibilidade)
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={atkinson.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
