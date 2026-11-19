/**
 * SÍMBOLO PROVISÓRIO.
 * Os arquivos oficiais da marca ONZETEC (símbolo "O" 360°) não foram fornecidos.
 * Este componente é o único ponto de troca: substitua o SVG pelo arquivo oficial.
 */
export function LogoMark({ className = "size-9", onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="14.5" fill="none" stroke={onDark ? "#ffffff" : "#0b2545"} strokeWidth="5" />
      <path d="M20 5.5a14.5 14.5 0 0 1 14.2 11.6" fill="none" stroke="#f47b20" strokeWidth="5" strokeLinecap="round" />
      <circle cx="34.2" cy="17.1" r="2.6" fill="#f47b20" />
    </svg>
  );
}

export function Logo({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark onDark={onDark} />
      <span className="flex flex-col leading-none">
        <span className={`text-[1.15rem] font-bold tracking-[0.08em] ${onDark ? "text-white" : "text-navy-900"}`}>
          ONZETEC
        </span>
        {!compact ? (
          <span className={`text-[0.78rem] font-semibold tracking-wide ${onDark ? "text-orange-400" : "text-orange-700"}`}>
            Educação
          </span>
        ) : null}
      </span>
    </span>
  );
}
