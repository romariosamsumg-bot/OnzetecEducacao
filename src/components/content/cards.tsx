import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, FileText, LifeBuoy, PlayCircle, Smartphone } from "lucide-react";
import { cn } from "@/components/ui/button";
import { CategoryIcon, tintFor } from "@/components/ui/icon";
import { AccessBadge, DemoBadge, ProgressBar } from "@/components/ui/primitives";
import {
  contentHref,
  contentTypeLabel,
  formatDuration,
  type ContentCard as ContentCardData,
  type ContentType,
  type CourseCard as CourseCardData,
} from "@/lib/content/types";

const typeIcons: Record<ContentType, typeof PlayCircle> = {
  video: PlayCircle,
  short: Smartphone,
  article: FileText,
  guide: LifeBuoy,
};

function Cover({
  src,
  alt,
  icon,
  tintKey,
  className,
  sizes = "(min-width: 1024px) 300px, 90vw",
}: {
  src: string | null;
  alt: string;
  icon: string | null;
  tintKey: string | null;
  className?: string;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-navy-100", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return (
    <div aria-hidden className={cn("flex items-center justify-center", tintFor(tintKey), className)}>
      <CategoryIcon name={icon} className="size-12 opacity-90" />
    </div>
  );
}

export function ContentCard({ item, headingLevel = 3 }: { item: ContentCardData; headingLevel?: 2 | 3 }) {
  const Icon = typeIcons[item.type];
  const H = `h${headingLevel}` as "h2" | "h3";
  const duration = formatDuration(item.durationSeconds);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]">
      <Cover src={item.coverImageUrl} alt="" icon={item.categoryIcon} tintKey={item.categorySlug} className="aspect-[16/8]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-[0.85rem] font-semibold text-ink-muted">
          <span className="inline-flex items-center gap-1 text-navy-700">
            <Icon aria-hidden className="size-4" />
            {contentTypeLabel[item.type]}
          </span>
          {duration ? (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-4" />
              {duration}
            </span>
          ) : null}
        </div>
        <H className="text-[1.1rem] leading-snug font-bold text-navy-900">
          <Link href={contentHref(item.type, item.slug)} className="after:absolute after:inset-0 focus-visible:outline-none group-has-[:focus-visible]:underline">
            {item.title}
          </Link>
        </H>
        {item.summary ? <p className="line-clamp-2 text-[0.95rem] text-ink-soft">{item.summary}</p> : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <AccessBadge access={item.access} />
          {item.isDemo ? <DemoBadge /> : null}
        </div>
      </div>
    </article>
  );
}

export function CourseCard({ course, progress }: { course: CourseCardData; progress?: { done: number; total: number } }) {
  const duration = formatDuration(course.totalSeconds);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]">
      <Cover src={course.coverImageUrl} alt="" icon={course.categoryIcon} tintKey={course.categorySlug} className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-navy-700">
          <BookOpen aria-hidden className="size-4" /> Curso
          {course.categoryName ? <span className="text-ink-muted">· {course.categoryName}</span> : null}
        </p>
        <h3 className="text-[1.15rem] leading-snug font-bold text-navy-900">
          <Link href={`/cursos/${course.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none group-has-[:focus-visible]:underline">
            {course.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-[0.95rem] text-ink-soft">{course.summary}</p>
        {progress && progress.total > 0 ? (
          <div className="space-y-1 pt-1">
            <ProgressBar value={(progress.done / progress.total) * 100} label={`Progresso no curso ${course.title}`} />
            <p className="text-[0.85rem] text-ink-muted">
              {progress.done} de {progress.total} aulas concluídas
            </p>
          </div>
        ) : (
          <p className="text-[0.9rem] text-ink-muted">
            {course.lessonsCount > 0 ? `${course.lessonsCount} aulas` : null}
            {duration ? ` · ${duration}` : null}
            {course.freeLessonsCount > 0 ? ` · ${course.freeLessonsCount} gratuita${course.freeLessonsCount > 1 ? "s" : ""}` : null}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">{course.isDemo ? <DemoBadge /> : null}</div>
      </div>
    </article>
  );
}

/** Linha compacta para listas (busca, salvos, guias). */
export function ContentRow({ item, meta }: { item: ContentCardData; meta?: React.ReactNode }) {
  const Icon = typeIcons[item.type];
  return (
    <li className="group relative flex items-start gap-4 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)] hover:border-navy-200">
      <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tintFor(item.categorySlug))}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[0.85rem] font-semibold text-ink-muted">
          {contentTypeLabel[item.type]}
          {item.appName ? ` · ${item.appName}` : ""}
        </p>
        <h3 className="leading-snug font-bold text-navy-900">
          <Link href={contentHref(item.type, item.slug)} className="after:absolute after:inset-0 focus-visible:outline-none group-has-[:focus-visible]:underline">
            {item.title}
          </Link>
        </h3>
        {item.summary ? <p className="line-clamp-2 text-[0.95rem] text-ink-soft">{item.summary}</p> : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <AccessBadge access={item.access} />
          {item.isDemo ? <DemoBadge /> : null}
          {meta}
        </div>
      </div>
    </li>
  );
}

export function CardGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <ul
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
      )}
    >
      {children}
    </ul>
  );
}
