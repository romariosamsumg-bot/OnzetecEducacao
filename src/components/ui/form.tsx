import type { ComponentProps, ReactNode } from "react";
import { cn } from "./button";

const controlBase =
  "block w-full rounded-[var(--radius-control)] border-2 border-line bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-muted hover:border-navy-200 focus:border-navy-700 focus:outline-none " +
  "focus-visible:outline-3 focus-visible:outline-orange-500 aria-[invalid=true]:border-danger-700 " +
  "disabled:bg-line-soft disabled:text-ink-muted";

type FieldProps = {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  error?: string | string[] | null;
  optional?: boolean;
};

function FieldShell({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: Omit<FieldProps, "name"> & { id: string; children: ReactNode }) {
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-semibold text-navy-900">
        {label}
        {optional ? <span className="font-normal text-ink-muted"> (opcional)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-[0.9rem] text-ink-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {err ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 font-semibold text-danger-700">
          <span aria-hidden>⚠</span> {err}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint: unknown, error: unknown) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  label,
  name,
  hint,
  error,
  optional,
  className,
  id,
  ...rest
}: FieldProps & ComponentProps<"input">) {
  const fid = id ?? `f-${name}`;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={fid}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(controlBase, "min-h-12", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  name,
  hint,
  error,
  optional,
  className,
  id,
  ...rest
}: FieldProps & ComponentProps<"textarea">) {
  const fid = id ?? `f-${name}`;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={fid}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(controlBase, "min-h-28 py-3 leading-relaxed", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  hint,
  error,
  optional,
  className,
  id,
  children,
  ...rest
}: FieldProps & ComponentProps<"select">) {
  const fid = id ?? `f-${name}`;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={fid}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(controlBase, "min-h-12 pr-10", className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({ label, hint, className, ...rest }: { label: ReactNode; hint?: ReactNode } & ComponentProps<"input">) {
  return (
    <label className={cn("flex min-h-12 cursor-pointer items-start gap-3 py-2", className)}>
      <input type="checkbox" className="mt-0.5 size-6 shrink-0 accent-navy-900" {...rest} />
      <span>
        <span className="font-semibold text-navy-900">{label}</span>
        {hint ? <span className="block text-[0.9rem] text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function RadioCard({
  label,
  description,
  className,
  ...rest
}: { label: ReactNode; description?: ReactNode } & ComponentProps<"input">) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border-2 border-line bg-white p-4",
        "has-[:checked]:border-navy-900 has-[:checked]:bg-navy-50 hover:border-navy-200",
        className,
      )}
    >
      <input type="radio" className="size-6 shrink-0 accent-navy-900" {...rest} />
      <span>
        <span className="block font-semibold text-navy-900">{label}</span>
        {description ? <span className="block text-[0.9rem] text-ink-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};
