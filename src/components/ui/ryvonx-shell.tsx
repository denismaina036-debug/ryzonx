import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ryvonxEmptyStateShellClass,
  ryvonxEyebrowClass,
  ryvonxPageSubtitleClass,
  ryvonxPageTitleClass,
} from "@/lib/ui/ryvonx-tokens";

export function RyvonxPageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className={ryvonxEyebrowClass}>{eyebrow}</p> : null}
        <h1 className={cn(eyebrow ? "mt-2" : undefined, ryvonxPageTitleClass)}>{title}</h1>
        {description ? (
          typeof description === "string" ? (
            <p className={ryvonxPageSubtitleClass}>{description}</p>
          ) : (
            <div className={ryvonxPageSubtitleClass}>{description}</div>
          )
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function RyvonxEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(ryvonxEmptyStateShellClass, className)} role="status">
      {icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--id-surface)] text-[var(--id-text-muted)] ring-1 ring-[var(--id-border)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--id-text)]">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--id-text-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function RyvonxAlert({
  message,
  variant = "info",
  className,
}: {
  message: string | null;
  variant?: "info" | "success" | "warning" | "error";
  className?: string;
}) {
  if (!message) return null;

  const styles = {
    info: "border-[var(--id-accent)]/30 bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]",
    success: "border-[var(--id-success)]/30 bg-[var(--id-success)]/10 text-[var(--id-success)]",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    error: "border-[var(--id-danger)]/30 bg-[var(--id-danger)]/10 text-[var(--id-danger)]",
  }[variant];

  return (
    <p
      className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", styles, className)}
      role="status"
    >
      {message}
    </p>
  );
}

export function RyvonxSectionCard({
  title,
  description,
  children,
  actions,
  className,
  muted = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={cn(
        muted ? "bg-[var(--id-surface-muted)]" : "bg-[var(--id-surface)]",
        "rounded-[var(--id-radius)] border border-[var(--id-border)] p-5 shadow-[var(--id-shadow)] sm:p-6",
        className
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--id-text)]">{title}</h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--id-text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
