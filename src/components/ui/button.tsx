import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "inverse";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold text-center " +
  "transition-colors duration-150 select-none disabled:opacity-55 disabled:cursor-not-allowed " +
  "aria-disabled:opacity-55 aria-disabled:pointer-events-none [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  // Laranja com texto marinho (5,6:1). Reservado para a ação principal da tela.
  primary: "bg-orange-500 text-navy-950 hover:bg-orange-400 active:bg-orange-500",
  secondary: "bg-navy-900 text-white hover:bg-navy-800",
  outline: "border-2 border-navy-900 text-navy-900 bg-white hover:bg-navy-50",
  ghost: "text-navy-900 hover:bg-navy-100",
  danger: "bg-danger-700 text-white hover:bg-[#9a1d13]",
  inverse: "bg-white text-navy-900 hover:bg-navy-100",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-[0.9rem]",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-7 text-[1.075rem]",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", full = false) {
  return cn(base, variants[variant], sizes[size], full && "w-full");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
  loading?: boolean;
};

export function Button({ variant, size, full, icon, loading, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(buttonClasses(variant, size, full), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{children}</span>
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; full?: boolean; icon?: ReactNode };

export function ButtonLink({ variant, size, full, icon, children, className, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses(variant, size, full), className)} {...rest}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex items-center gap-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 animate-spin">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span>{label}</span> : null}
    </span>
  );
}
