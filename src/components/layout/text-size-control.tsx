"use client";

import { Type } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/button";

const options = [
  { value: "100", label: "Normal", sample: "text-[1rem]" },
  { value: "115", label: "Grande", sample: "text-[1.15rem]" },
  { value: "130", label: "Muito grande", sample: "text-[1.3rem]" },
] as const;

export function applyTextScale(value: string) {
  document.documentElement.setAttribute("data-text-scale", value);
  document.cookie = `oz_text_scale=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** Controle "Tamanho do texto", sempre visível no cabeçalho. */
export function TextSizeControl() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("100");
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setCurrent(document.documentElement.getAttribute("data-text-scale") ?? "100");
          setOpen((o) => !o);
        }}
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 font-semibold text-navy-900 hover:bg-navy-100"
      >
        <Type aria-hidden className="size-5" />
        <span className="sr-only sm:not-sr-only">Tamanho do texto</span>
        <span className="sm:hidden" aria-hidden>
          Aa
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label="Tamanho do texto"
          className="absolute right-0 z-50 mt-2 w-64 rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-[var(--shadow-raised)]"
        >
          <p className="px-1 pb-2 font-bold text-navy-900">Tamanho do texto</p>
          <ul className="space-y-1">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  aria-pressed={current === o.value}
                  onClick={() => {
                    applyTextScale(o.value);
                    setCurrent(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-between rounded-[var(--radius-control)] px-3 text-left",
                    current === o.value ? "bg-navy-900 text-white" : "hover:bg-navy-50 text-navy-900",
                  )}
                >
                  <span className={cn("font-semibold", o.sample)}>{o.label}</span>
                  {current === o.value ? <span aria-hidden>✓</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
