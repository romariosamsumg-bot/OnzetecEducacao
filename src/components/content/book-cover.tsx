import Image from "next/image";
import { BookOpen } from "lucide-react";

export function BookCover({ src, title, className = "" }: { src: string | null; title: string; className?: string }) {
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-[var(--radius-control)] shadow-[var(--shadow-raised)] ${className}`}>
      {src ? (
        <Image src={src} alt={`Capa do livro ${title}`} fill sizes="(min-width: 768px) 280px, 60vw" className="object-cover" />
      ) : (
        <div className="flex size-full flex-col justify-between bg-navy-900 p-5 text-white" role="img" aria-label={`Capa do livro ${title}`}>
          <BookOpen aria-hidden className="size-8 text-orange-400" />
          <p className="text-[1.15rem] leading-snug font-bold">{title}</p>
          <p className="text-[0.8rem] font-semibold tracking-[0.15em] text-navy-200">ONZETEC</p>
        </div>
      )}
    </div>
  );
}
