"use client";

import Form from "next/form";
import { Search } from "lucide-react";
import { useId } from "react";
import { cn } from "@/components/ui/button";

/** Campo de busca por problema, em linguagem do dia a dia. Funciona sem JavaScript. */
export function ProblemSearch({
  defaultValue,
  size = "lg",
  label = "Qual é a sua dúvida?",
  showLabel = true,
  onDark = false,
}: {
  defaultValue?: string;
  size?: "md" | "lg";
  label?: string;
  showLabel?: boolean;
  onDark?: boolean;
}) {
  const inputId = `busca-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Form action="/resolver" role="search" className="w-full">
      <label
        htmlFor={inputId}
        className={cn(
          "mb-2 block font-bold",
          onDark ? "text-white" : "text-navy-900",
          size === "lg" ? "text-[1.15rem]" : "",
          !showLabel && "sr-only",
        )}
      >
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Ex.: meu WhatsApp não toca"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={120}
          className={cn(
            "min-w-0 flex-1 rounded-[var(--radius-control)] border-2 border-line bg-white px-4 text-ink placeholder:text-ink-muted",
            "hover:border-navy-200 focus:border-navy-700 focus:outline-none focus-visible:outline-3 focus-visible:outline-orange-500",
            size === "lg" ? "min-h-14 text-[1.05rem]" : "min-h-12",
          )}
        />
        <button
          type="submit"
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-orange-500 px-4 font-bold text-navy-950 hover:bg-orange-400",
            size === "lg" ? "min-h-14 sm:px-6" : "min-h-12",
          )}
        >
          <Search aria-hidden className="size-5" />
          <span>Buscar</span>
        </button>
      </div>
    </Form>
  );
}
