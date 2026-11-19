import { Suspense } from "react";
import { BottomNav, BottomNavFallback } from "@/components/layout/main-nav";
import { EnvironmentBanner, SiteFooter, SiteHeader, SkipLink } from "@/components/layout/site-chrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <EnvironmentBanner />
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="pb-bottom-nav outline-none">
        {children}
      </main>
      <SiteFooter />
      <Suspense fallback={<BottomNavFallback />}>
        <BottomNav />
      </Suspense>
    </>
  );
}
