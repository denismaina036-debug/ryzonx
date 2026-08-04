import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ryvonxEmptyStateShellClass,
  ryvonxPageSubtitleClass,
  ryvonxPageTitleClass,
  ryvonxSectionDescriptionClass,
  ryvonxSectionTitleClass,
} from "@/lib/ui/ryvonx-tokens";

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
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className={ryvonxPageTitleClass}>{title}</h1>
        {description ? <p className={ryvonxPageSubtitleClass}>{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
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
          {title ? <h2 className={ryvonxSectionTitleClass}>{title}</h2> : null}
          {description ? <p className={ryvonxSectionDescriptionClass}>{description}</p> : null}
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

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={ryvonxEmptyStateShellClass} role="status">
      {icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--id-surface)] text-[var(--id-text-muted)] ring-1 ring-[var(--id-border)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--id-text)]">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--id-text-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
