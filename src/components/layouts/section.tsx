import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function SectionContainer({
  children,
  className,
  id,
}: SectionContainerProps) {
  return (
    <section id={id} className={cn("section-spacing", className)}>
      <div className="page-container">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  align?: "left" | "center";
  className?: string;
  actions?: ReactNode;
}

export function SectionHeader({
  title,
  description,
  badge,
  align = "left",
  className,
  actions,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-12",
        align === "center" && !actions && "mx-auto max-w-2xl text-center",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
          align === "center" && !actions && "sm:flex-col sm:items-center"
        )}
      >
        <div className={cn("max-w-2xl", align === "center" && !actions && "mx-auto text-center")}>
          {badge && (
            <span className="mb-4 inline-block rounded-full bg-royal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-royal-700">
              {badge}
            </span>
          )}
          <h2 className="text-3xl font-semibold tracking-tight text-navy-950 md:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-lg leading-relaxed text-navy-500">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
