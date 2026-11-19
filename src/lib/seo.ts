import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function absoluteUrl(path: string) {
  return new URL(path, SITE).toString();
}

/** JSON-LD seguro para <script type="application/ld+json">. */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "video.other" | "book";
  noindex?: boolean;
}): Metadata {
  const description = opts.description.slice(0, 200);
  return {
    title: opts.title,
    description,
    alternates: { canonical: opts.path },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: opts.title,
      description,
      url: opts.path,
      type: opts.type === "book" ? "website" : (opts.type ?? "website"),
      images: opts.image ? [{ url: opts.image }] : [{ url: "/og-default.png", width: 1200, height: 630 }],
      locale: "pt_BR",
      siteName: "Onzetec Educação",
    },
    twitter: { card: "summary_large_image", title: opts.title, description },
  };
}

export const organizationLd = {
  "@type": "EducationalOrganization",
  name: "Onzetec Educação",
  url: SITE,
};
