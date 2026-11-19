import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Lock, XCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./button";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]", className)}
      {...rest}
    />
  );
}

type BadgeTone = "neutral" | "free" | "premium" | "demo" | "success" | "warning" | "danger" | "info";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-navy-50 text-navy-900 border-navy-100",
  free: "bg-success-50 text-success-700 border-[#bfe3cd]",
  premium: "bg-navy-900 text-white border-navy-900",
  demo: "bg-warning-50 text-warning-800 border-[#f0d58c]",
  success: "bg-success-50 text-success-700 border-[#bfe3cd]",
  warning: "bg-warning-50 text-warning-800 border-[#f0d58c]",
  danger: "bg-danger-50 text-danger-700 border-[#f3c1bc]",
  info: "bg-info-50 text-info-700 border-navy-100",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.8rem] font-semibold leading-6 whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AccessBadge({ access }: { access: "free" | "premium" }) {
  return access === "free" ? (
    <Badge tone="free">Gratuito</Badge>
  ) : (
    <Badge tone="premium">
      <Lock aria-hidden className="size-3.5" /> Assinantes
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="demo" className="uppercase tracking-wide">
      Demonstração
    </Badge>
  );
}

type AlertTone = "info" | "success" | "warning" | "error";
const alertStyles: Record<AlertTone, { box: string; Icon: typeof Info }> = {
  info: { box: "bg-info-50 border-navy-100 text-navy-900", Icon: Info },
  success: { box: "bg-success-50 border-[#bfe3cd] text-[#14532d]", Icon: CheckCircle2 },
  warning: { box: "bg-warning-50 border-[#f0d58c] text-[#5c3800]", Icon: AlertTriangle },
  error: { box: "bg-danger-50 border-[#f3c1bc] text-[#7a1810]", Icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live = false,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const { box, Icon } = alertStyles[tone];
  return (
    <div
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-[var(--radius-control)] border p-4", box, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className="text-[0.95rem] leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export function BackLink({ href, children = "Voltar" }: { href: string; children?: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-navy-700 hover:bg-navy-100 hover:text-navy-900"
    >
      <ArrowLeft aria-hidden className="size-5" />
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  back,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label?: string };
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="space-y-3 pb-6">
      {back ? <BackLink href={back.href}>{back.label ?? "Voltar"}</BackLink> : null}
      {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-navy-900 sm:text-[2.1rem]">{title}</h1>
          {description ? <p className="max-w-2xl text-[1.05rem] text-ink-soft">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  href,
  linkLabel = "Ver tudo",
  id,
  description,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-[1.35rem] font-bold tracking-tight text-navy-900">
          {title}
        </h2>
        {description ? <p className="text-ink-muted">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 font-semibold text-orange-700 underline-offset-4 hover:underline"
        >
          {linkLabel}
          <span className="sr-only">: {title}</span>
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line bg-white px-6 py-10 text-center">
      {icon ? <div className="text-navy-600 [&_svg]:size-10">{icon}</div> : null}
      <p className="text-lg font-bold text-navy-900">{title}</p>
      {children ? <div className="max-w-md text-ink-soft">{children}</div> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function LoadingBlock({ label = "Carregando…", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4 py-2">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function Container({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...rest} />;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2.5 overflow-hidden rounded-full bg-navy-100"
      >
        <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
