export type ContentType = "video" | "short" | "article" | "guide";
export type AccessLevel = "free" | "premium";
export type PublishStatus = "draft" | "scheduled" | "published" | "archived";
export type EditorialStatus = "current" | "review_soon" | "outdated";

export type ContentCard = {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  access: AccessLevel;
  durationSeconds: number | null;
  categorySlug: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  appName: string | null;
  likesCount: number;
  isDemo: boolean;
  publishedAt: Date | null;
  courseSlug: string | null;
  courseTitle: string | null;
};

export type CourseCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  level: string;
  isDemo: boolean;
  lessonsCount: number;
  freeLessonsCount: number;
  totalSeconds: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
};

export type ArticleBlock =
  | { type: "paragraph" | "heading" | "tip" | "warning"; text: string }
  | { type: "image"; url: string; alt: string; text?: string };

export type GuideStep = { text: string; image_url: string | null; image_alt: string | null };
export type GuideBody = {
  causes: string[];
  steps: GuideStep[];
  cautions: string[];
  if_not_working: string;
};

export type Caption = { lang: string; label: string; url: string };
export type Material = { label: string; url: string };

export type VideoAsset = {
  id: string;
  provider: "bunny_stream" | "cloudflare_stream" | "mux" | "file";
  providerAssetId: string;
  durationSeconds: number | null;
  posterUrl: string | null;
  captions: Caption[];
};

export function contentHref(type: ContentType, slug: string): string {
  switch (type) {
    case "video":
      return `/aulas/${slug}`;
    case "short":
      return `/dicas/${slug}`;
    case "article":
      return `/artigos/${slug}`;
    case "guide":
      return `/resolver/${slug}`;
  }
}

export const contentTypeLabel: Record<ContentType, string> = {
  video: "Videoaula",
  short: "Dica rápida",
  article: "Artigo",
  guide: "Guia de solução",
};

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds} s`;
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatPrice(cents: number | null | undefined, currency = "BRL"): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

export function formatDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(
    new Date(d),
  );
}
