import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950 md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-navy-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function Section({ children, title, description, className }: SectionProps) {
  return (
    <section className={cn("space-y-6", className)}>
      {(title || description) && (
        <div>
          {title && (
            <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-navy-500">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-1 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-navy-400">{icon}</div>}
      <h3 className="text-lg font-medium text-navy-950">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-navy-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
